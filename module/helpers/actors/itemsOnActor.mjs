import { applyAdvancements, removeAdvancements } from "../advancements.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { duplicateEnhancementsToOtherItems, removeDuplicatedEnhancements } from "../items/enhancements.mjs";
import { clearOverridenScalingValue } from "../items/scalingItems.mjs";
import { generateKey, markedToRemove } from "../utils.mjs";
import { createNewCustomResourceFromItem, removeResource } from "./resources.mjs";

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

export async function duplicateItem(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  return await Item.create(item, { parent: actor });
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
      return await addUniqueItemToActor(item, actor);
    }
    return;
  }

  // Update Item Enhancements with correct originalId
  const enhs = item.system.enhancements;
  if (enhs) {
    for (const [key, enh] of Object.entries(enhs)) {
      if (enh.charges) enhs[key].charges.originalId = item._id;
    }
    await item.update({["system.enhancements"]: enhs});
  }

  // Item Provided Custom Resource
  if (item.system.isResource) {
    createNewCustomResourceFromItem(item.system.resource, item.img, actor);
  }
  // When we are adding new items, we want to check if it should get some extra enhancements
  const copyEnhs = actor.system.withCopyEnhancements;
  for(let i = 0; i < copyEnhs.length; i++) {
    if(itemMeetsUseConditions(copyEnhs[i].copyFor, item)) {
      const itemToCopy = actor.items.get(copyEnhs[i].itemId);
      duplicateEnhancementsToOtherItems(itemToCopy, new Set([item]));
    }
  }
  // Item has enhancements to copy 
  if (item.system.copyEnhancements?.copy) {
    duplicateEnhancementsToOtherItems(item, actor.items);
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
  // Check if copied enhancment got an update. If it did we need to update items that use it. We are able to do it only when one enhancement is being edited
  if (updateData.system?.enhancements && item.system?.copyEnhancements?.copy) {
    const enhancements = Object.entries(updateData.system.enhancements);
    if (enhancements.length < 1) return;

    let enhKey;
    if (enhancements.length === 1) enhKey = enhancements[0][0];
    // We need to separate only newly added enhancment and skip enhacements that had some other changes made to them. User cannot edit enh name so it is good property to check
    else {
      let filtered = enhancements.filter(([key, enh]) => enh.hasOwnProperty("name"))
      if (filtered && filtered[0]) enhKey = [0][0];
    }
   
    if (!enhKey) return;
    if (markedToRemove(enhKey)) removeDuplicatedEnhancements(item, actor.items, enhKey.substring(2));
    else duplicateEnhancementsToOtherItems(item, actor.items);
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
async function addUniqueItemToActor(item, actor) {
  const itemType = item.type;

  const uniqueItemId = actor.system.details[itemType].id;
  if (uniqueItemId) {
    const errorMessage = `Cannot add another ${itemType} to ${actor.name}.`;
    ui.notifications.error(errorMessage);
    item.delete();
  } 
  else {
    const oldActorData = foundry.utils.deepClone(actor.system);
    await actor.update({[`system.details.${itemType}.id`]: item._id});
    const suppressAdvancements = game.settings.get("dc20rpg", "suppressAdvancements");
    if (suppressAdvancements) return;
    const actorLevel = actor.system.details.level;

    // Apply Item Advancements
    switch (itemType) {
      case "class":
        // When adding class we also need to add subclass and ancestry advancements
        const subclass = actor.items.get(actor.system.details.subclass.id);
        const ancestry = actor.items.get(actor.system.details.ancestry.id);
        const background = actor.items.get(actor.system.details.background.id);
        applyAdvancements(actor, 1, item, subclass, ancestry, background, oldActorData); // When we are putting class it will always be at 1st level
        break;
      case "subclass":
        applyAdvancements(actor, actorLevel, null, item, null, null, oldActorData);
        break;
      case "ancestry":
        applyAdvancements(actor, actorLevel, null, null, item, null, oldActorData);
        break;
      case "background":
        applyAdvancements(actor, actorLevel, null, null, null, item, oldActorData);
    }
  }
}

export function runAdvancements(actor, level) {
  const suppressAdvancements = game.settings.get("dc20rpg", "suppressAdvancements");
  if (suppressAdvancements) return;
  const oldActorData = foundry.utils.deepClone(actor.system);

  const clazz = actor.items.get(actor.system.details.class.id);
  const subclass = actor.items.get(actor.system.details.subclass.id);
  const ancestry = actor.items.get(actor.system.details.ancestry.id);
  const background = actor.items.get(actor.system.details.background.id);

  applyAdvancements(actor, level, clazz, subclass, ancestry, background, oldActorData);
}

async function removeUniqueItemFromActor(item, actor) {
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
        await removeAdvancements(actor, 1, item, subclass, ancestry, background, true);
        break;
      case "subclass":
        await removeAdvancements(actor, 1, null, item, null, null, true);
        break;
      case "ancestry":
        await removeAdvancements(actor, 0, null, null, item, null, true); // Ancestries have level 0 traits
        break;
      case "background":
        await removeAdvancements(actor, 0, null, null, null, item, true); // Background have level 0 traits
        break;
    }

    await actor.update({[`system.details.${itemType}`]: {id: ""}});
  }
}

//======================================
//          Other Item Methods         =
//======================================
export function changeLevel(up, itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  if (!item) return;
  let currentLevel = item.system.level;
  const oldActorData = foundry.utils.deepClone(actor.system);

  const clazz = actor.items.get(actor.system.details.class.id);
  const subclass = actor.items.get(actor.system.details.subclass.id);
  const ancestry = actor.items.get(actor.system.details.ancestry.id);
  if (up === "true") {
    currentLevel = Math.min(currentLevel + 1, 20);
    applyAdvancements(actor, currentLevel, clazz, subclass, ancestry, null, oldActorData);
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

export function openItemCompendium(itemType) {
  let key = "";
  switch(itemType) {
    case "class": 
      key = "dc20rpg.classes";
      break;

    case "subclass": 
      key = "dc20rpg.subclasses";
      break;

    case "ancestry": 
      key = "dc20rpg.ancestries";
      break;

    case "background": 
      key = "dc20rpg.backgrounds";
      break;
    
    case "inventory":
      key = "dc20rpg.inventory";
      break;
    
    case "techniques": 
      key = "dc20rpg.techniques";
      break;

    case "spells":
      key = "dc20rpg.spells";
      break;
  }

  const pack = game.packs.get(key);
  if (pack) pack.render(true);
}