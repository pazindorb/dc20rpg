import { applyAdvancements, removeAdvancements } from "../advancements.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { duplicateEnhancementsToOtherItems, removeDuplicatedEnhancements } from "../items/enhancements.mjs";
import { clearOverridenScalingValue } from "../items/scalingItems.mjs";
import { generateKey } from "../utils.mjs";
import { createCustomResourceFromScalingValue, createNewCustomResourceFromItem, removeResource } from "./resources.mjs";

//================================================
//           Item Manipulaton on Actor           =
//================================================
export function getItemFromActor(itemId, actor) {
  return actor.items.get(itemId);
}

export async function createItemOnActor(actor, itemData) {
  return await Item.create(itemData, { parent: actor });
}

export function deleteItemFromActor(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  item.delete();
}

export function editItemOnActor(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  item.sheet.render(true);
}

//======================================
//    Item Manipulation Interceptors   =
//======================================
export async function addItemToActorInterceptor(item) {
  const actor = await item.actor;
  if (!actor) return;

  // Unique Item
  if (["class", "subclass", "ancestry", "background"].includes(item.type)) {
    if (actor.type === "character") {
      return addUniqueItemToActor(item, actor);
    }
    return;
  }

  // Item Provided Custom Resource
  if (item.system.isResource) {
    createNewCustomResourceFromItem(item.system.resource, item.img, actor);
  }
  // Item has enhancements to copy 
  if (item.system.copyEnhancements?.copy) {
    duplicateEnhancementsToOtherItems(item, actor.items);
  }
  // When we are adding new items, we want to check if it should get some extra enhancements
  const copyEnhs = actor.system.withCopyEnhancements;
  for(let i = 0; i < copyEnhs.length; i++) {
    if(itemMeetsUseConditions(copyEnhs[i].copyFor, item)) {
      const itemToCopy = actor.items.get(copyEnhs[i].itemId);
      duplicateEnhancementsToOtherItems(itemToCopy, new Set([item]));
    }
  }
  _checkItemMastery(item, actor);
}

export async function modifiyItemOnActorInterceptor(item, updateData) {
  const actor = await item.actor;
  if (!actor) return;

  // Check if copyEnhancements was changed if it was we can copy or remove enhancemets
  if (updateData.system?.copyEnhancements?.hasOwnProperty("copy")) {
    if(updateData.system.copyEnhancements.copy) duplicateEnhancementsToOtherItems(item, actor.items);
    else removeDuplicatedEnhancements(item, actor.items);
  }
  // Check if isResource was we can update actor's custom resources
  if (updateData.system?.hasOwnProperty("isResource")) {
    if(updateData.system.isResource) createNewCustomResourceFromItem(item.system.resource, item.img, actor);
    else removeResource(item.system.resource.resourceKey, actor);
  }

  _checkItemMastery(item, actor);
}

export async function removeItemFromActorInterceptor(item) {
  const actor = await item.actor;
  if (!actor) return;

  // Unique Item
  if (["class", "subclass", "ancestry", "background"].includes(item.type)) {
    return removeUniqueItemFromActor(item, actor);
  }

  // Item Provided Custom Resource
  if (item.system.isResource) {
    removeResource(item.system.resource.resourceKey, actor);
  }
  // Item has enhancements that were copied
  if (item.system.copyEnhancements?.copy) {
    removeDuplicatedEnhancements(item, actor.items);
  }
  _checkItemMastery(item, actor);
}

//======================================
//           Item Masteries            =
//======================================
function _checkItemMastery(item, actor) {
  if (actor) {
    const masteries = actor.system.masteries;
    if (!masteries) return;

    if (item.type === "weapon") {
      let isProficient = true;
      if (item.system.properties.heavy.active) isProficient = masteries.weapons;
      item.update({["system.attackFormula.combatMastery"]: isProficient});
    }
    
    else if (item.type === "equipment") {
      const equipmentType = item.system.equipmentType;

      let isProficient = true; // we want combat mastery for non-proficiency equipments (clothing, trinkets)
      switch (equipmentType) {
        case "light":
          isProficient = masteries.lightArmor;
          break;

        case "heavy":
          isProficient = masteries.heavyArmor;
          break;

        case "lshield": 
          isProficient = masteries.lightShield;
          break;

        case "hshield": 
          isProficient = masteries.heavyShield;
          break;
      }

      item.update({["system.attackFormula.combatMastery"]: isProficient});
    }
  }
}

//======================================
//            Actor's Class            =
//======================================
// TODO: Separate to advancement file?
function addUniqueItemToActor(item, actor) {
  const itemType = item.type;

  const uniqueItemId = actor.system.details[itemType].id;
  if (uniqueItemId) {
    const errorMessage = `Cannot add another ${itemType} to ${actor.name}.`;
    ui.notifications.error(errorMessage);
    item.delete();
  } 
  else {
    const actorLevel = actor.system.details.level;

    // Create custom resources from item on actor
    Object.entries(item.system.scaling)
      .filter(([key, scalingValue]) => scalingValue.isResource)
      .forEach(([key, scalingValue]) => createCustomResourceFromScalingValue(key, scalingValue, actor));

    // Apply Item Advancements
    switch (itemType) {
      case "class":
        // When adding class we also need to add subclass and ancestry advancements
        const subclass = actor.items.get(actor.system.details.subclass.id);
        const ancestry = actor.items.get(actor.system.details.ancestry.id);
        const background = actor.items.get(actor.system.details.background.id);
        applyAdvancements(actor, 1, item, subclass, ancestry, background); // When we are putting class it will always be at 1st level
        break;
      case "subclass":
        applyAdvancements(actor, actorLevel, null, item);
        break;
      case "ancestry":
        applyAdvancements(actor, actorLevel, null, null, item);
        break;
      case "background":
        applyAdvancements(actor, actorLevel, null, null, null, item);
    }
    
    actor.update({[`system.details.${itemType}.id`]: item._id});
  }
}

function removeUniqueItemFromActor(item, actor) {
  const itemType = item.type;

  const uniqueItemId = actor.system.details[itemType].id;
  if (uniqueItemId === item._id) {
    
    // Remove item's custom resources from actor
    Object.entries(item.system.scaling)
      .filter(([key, scalingValue]) => scalingValue.isResource)
      .forEach(([key, scalingValue]) => removeResource(key, actor));

    switch (itemType) {
      case "class":
        // When removing class we also need to remove subclass and ancestry advancements
        const subclass = actor.items.get(actor.system.details.subclass.id);
        const ancestry = actor.items.get(actor.system.details.ancestry.id);
        const background = actor.items.get(actor.system.details.background.id);
        removeAdvancements(actor, 1, item, subclass, ancestry, background);
        break;
      case "subclass":
        removeAdvancements(actor, 1, null, item);
        break;
      case "ancestry":
        removeAdvancements(actor, 0, null, null, item); // Ancestries have level 0 traits
        break;
      case "background":
        removeAdvancements(actor, 0, null, null, null, item); // Background have level 0 traits
        break;
    }

    actor.update({[`system.details.${itemType}`]: {id: ""}});
  }
}

//======================================
//          Other Item Methods         =
//======================================
export function changeLevel(up, itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  if (!item) return;
  let currentLevel = item.system.level;

  const clazz = actor.items.get(actor.system.details.class.id);
  const subclass = actor.items.get(actor.system.details.subclass.id);
  const ancestry = actor.items.get(actor.system.details.ancestry.id);
  if (up === "true") {
    currentLevel = Math.min(currentLevel + 1, 20);
    applyAdvancements(actor, currentLevel, clazz, subclass, ancestry);
  }
  else {
    clearOverridenScalingValue(clazz, currentLevel - 1)
    removeAdvancements(actor, currentLevel, clazz, subclass, ancestry);
    currentLevel = Math.max(currentLevel - 1, 0);
  }

  item.update({[`system.level`]: currentLevel});
}

//======================================
//             Item Tables             =
//======================================
export function reorderTableHeaders(tab, current, swapped, actor) {
  const headersOrdering = actor.flags.dc20rpg.headersOrdering;

  const currentOrder = headersOrdering[tab][current].order;
  const swappedOrder = headersOrdering[tab][swapped].order;
  headersOrdering[tab][current].order = swappedOrder;
  headersOrdering[tab][swapped].order = currentOrder;

  actor.update({[`flags.dc20rpg.headersOrdering`]: headersOrdering });
}

export function createNewTable(tab, actor) {
  const headers = actor.flags.dc20rpg.headersOrdering[tab];
  const order = Object.entries(headers)
                .sort((a, b) => a[1].order - b[1].order)
                .map(([a, b]) => b.order)
  const last = order[order.length - 1];

  let key = "";
  do {
    key = generateKey();
  } while (headers[key]);

  const newTable = {
    name: "New Table",
    custom: true,
    order: last + 1
  }

  actor.update({[`flags.dc20rpg.headersOrdering.${tab}.${key}`] : newTable});
}

export function removeCustomTable(tab, table, actor) {
  actor.update({[`flags.dc20rpg.headersOrdering.${tab}.-=${table}`]: null});
}