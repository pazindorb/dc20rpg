import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { applyAdvancements, removeAdvancements } from "../../subsystems/character-progress/advancement/advancements.mjs";
import { clearOverridenScalingValue } from "../items/scalingItems.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { emitEventToGM } from "../sockets.mjs";
import { generateKey } from "../utils.mjs";

//================================================
//           Item Manipulaton on Actor           =
//================================================
export function getItemFromActor(itemId, actor) {
  return actor.items.get(itemId);
}

/**
 * Returns item with specific itemKey from actor.
 */
export function getItemFromActorByKey(itemKey, actor) {
  return actor.items.find(item => item.system.itemKey === itemKey)
}

export async function createItemOnActor(actor, itemData) {
  if (!actor.testUserPermission(game.user, "OWNER")) {
    emitEventToGM("addDocument", {
      docType: "item",
      docData: itemData, 
      actorUuid: actor.uuid
    });
    return;
  }
  return await Item.create(itemData, { parent: actor });
}

export async function updateItemOnActor(itemId, actor, updateData) {
  const item = actor.items.get(itemId);
  if (!item) return;
  return await item.gmUpdate(updateData);
}

export async function deleteItemFromActor(itemId, actor, options={}) {
  if (!actor.testUserPermission(game.user, "OWNER")) {
    emitEventToGM("removeDocument", {
      docType: "item",
      docId: itemId, 
      actorUuid: actor.uuid,
      options: options
    });
    return;
  }
  const item = getItemFromActor(itemId, actor);
  if (item) await item.delete(options);
}

export function editItemOnActor(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  item.sheet.render(true);
}

export async function duplicateItem(itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  return await createItemOnActor(actor, item);
}

export async function splitItem(item) {
  const actor = item.actor;
  if (!actor) return;
  if (!item) return;
  if (!item.system.stackable) return;

  const currentQuantity = item.system.quantity;
  const stackSize = await SimplePopup.input(`Provide new stack size. Current Quantity: ${currentQuantity}`);
  if (stackSize) {
    const newStack = parseInt(stackSize);
    const oldStack = currentQuantity - newStack;
    if (oldStack <= 0) return;

    const itemData = item.toObject();
    itemData.system.quantity = newStack;
    await createItemOnActor(actor, itemData);
    await item.update({["system.quantity"]: oldStack});
  }
}

//======================================
//    Item Manipulation Interceptors   =
//======================================
export async function addItemToActorInterceptor(item, actor) {
  // Unique Item
  if (["class", "subclass", "ancestry", "background"].includes(item.type)) {
    if (actor.type === "character") {
      return await addUniqueItemToActor(item, actor);
    }
    return;
  }

  // Item Provided Custom Resource
  if (item.system.isResource) {
    _createNewCustomResourceFromItem(item, actor);
  }
}

export async function modifiyItemOnActorInterceptor(item, updateData, actor) {
  // Check if isResource was we can update actor's custom resources
  if (updateData.system?.hasOwnProperty("isResource")) {
    if(updateData.system.isResource) _createNewCustomResourceFromItem(item, actor);
    else actor.resources.removeCustomResource(item.system.resource.resourceKey);
  }

  // Check if on item toggle macro should be runned 
  if (updateData.system?.toggle?.hasOwnProperty("toggledOn")) {
    const toggledOn = updateData.system.toggle.toggledOn;
    await runTemporaryItemMacro(item, "onItemToggle", actor, {on: toggledOn, off: !toggledOn, equipping: false});
  }
  // Check if on item toggle macro should be runned when item is equipped
  if (updateData.system?.statuses?.hasOwnProperty("equipped")) {
    const equipped = updateData.system.statuses.equipped;
    await runTemporaryItemMacro(item, "onItemToggle", actor, {on: equipped, off: !equipped, equipping: true});
  }
}

export async function removeItemFromActorInterceptor(item, actor) {
  // Unique Item
  if (["class", "subclass", "ancestry", "background"].includes(item.type)) {
    return removeUniqueItemFromActor(item, actor);
  }

  // Item Provided Custom Resource
  if (item.system.isResource) {
    actor.resources.removeCustomResource(item.system.resource.resourceKey);
  }
}

async function _createNewCustomResourceFromItem(item, actor) {
  const resource = item.system.resource;
  const resourceKey = resource.resourceKey;

  const maxFormula = resource.useStandardTable ?  `@scaling.${resourceKey}` : resource.customMaxFormula;
  const newResource = {
    label: resource.name,
    img: item.img,
    maxFormula: maxFormula,
    reset: resource.reset
  }
  await actor.resources.createCustomResource(newResource, resourceKey);
}

//======================================
//            Actor's Class            =
//======================================
// TODO: Separate to advancement file?
async function addUniqueItemToActor(item, actor) {
  const itemType = item.type;
  const details = actor.system.details;

  const uniqueItemId = details[itemType].id;
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
    const actorLevel = details.level;

    // Apply Item Advancements
    switch (itemType) {
      case "class":
        // When adding class we also need to add subclass and ancestry advancements
        const subclass = actor.items.get(details.subclass.id);
        const ancestry = actor.items.get(details.ancestry.id);
        const background = actor.items.get(details.background.id);
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

export function mixAncestry(first, second) {
  if (!first || !second) {
    ui.notifications.warn("You need to privide both Ancestries to merge!");
    return;
  }

  const itemData = {
    type: "ancestry",
    system: {
      description: `<p>Mixed Ancestry made from @UUID[${first.uuid}]{${first.name}} and @UUID[${second.uuid}]{${second.name}}</p>`,
    },
    name: `${first.name} / ${second.name}`,
    img: first.img
  }

  // Mix Advancements
  const firstAdvByLevel = _collectAdvancementsByLevel(first.system.advancements);
  const secondAdvByLevel = _collectAdvancementsByLevel(second.system.advancements);

  let coreAdv = [];
  let additionalAdv = [];

  if (firstAdvByLevel.length > secondAdvByLevel.length) {
    coreAdv = firstAdvByLevel;
    additionalAdv = secondAdvByLevel;
  }
  else {
    coreAdv = secondAdvByLevel;
    additionalAdv = firstAdvByLevel;
  }

  const advancements = {};
  for (let i = 0; i < coreAdv.length; i++) {
    const core = coreAdv[i];
    const add = additionalAdv[i];

    const coreSize = core?.length || 0;
    const addSize = add?.length || 0;

    const length = coreSize >= addSize ? coreSize : addSize;

    for (let j = 0; j < length; j++) {
      const fst = core ? core[j] : undefined;
      const snd = add ? add[j] : undefined;

      const merged = _mergeAdvancements(fst, snd);
      if (merged) advancements[generateKey()] = merged;
    }
  }
  itemData.system.advancements = advancements;
  
  return itemData;
}

function _collectAdvancementsByLevel(advancements) {
  const advByLevel = []
  for (const advancement of Object.values(advancements)) {
    _fillBefore(advancement.level, advByLevel);
    advByLevel[advancement.level].push(advancement);
  }
  return advByLevel;
}

function _fillBefore(level, advByLevel) {
  for (let i = 0; i <= level; i++) {
    if (advByLevel[i]) continue;
    else advByLevel[i] = [];
  }
}

function _mergeAdvancements(first, second) {
  if (!first && !second) return;
  if (!second) return first;
  if (!first) return second;

  const items = {
    ..._mergeItems(first.items), 
    ..._mergeItems(second.items)
  };

  return {
    name: `Merged: ${first.name} + ${second.name}`,
    mustChoose: first.mustChoose || second.mustChoose,
    pointAmount: first.pointAmount,
    level: first.level,
    applied: first.applied || second.applied,
    talent: first.talent || second.talent,
    repeatable: first.repeatable,
    repeatAt: first.repeatAt,
    allowToAddItems: first.allowToAddItems || second.allowToAddItems,
    compendium: first.compendium,
    preFilters: first.preFilters,
    items: items,
  }
}

function _mergeItems(items) {
  const collected = {}
  for (const [key, item] of Object.entries(items)) {
    item.mandatory = false;
    item.selected = false;
    collected[key] = item;
  }
  return collected;
}

//======================================
//          Other Item Methods         =
//======================================
export async function changeLevel(up, itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  if (!item) return;
  let currentLevel = item.system.level;
  const oldActorData = foundry.utils.deepClone(actor.system);

  const clazz = actor.items.get(actor.system.details.class.id);
  const ancestry = actor.items.get(actor.system.details.ancestry.id);
  let subclass = actor.items.get(actor.system.details.subclass.id);

  if (up === "true") {
    currentLevel = Math.min(currentLevel + 1, 20);
    applyAdvancements(actor, currentLevel, clazz, subclass, ancestry, null, oldActorData);
  }
  else {
    await clearOverridenScalingValue(clazz, currentLevel - 1)
    await removeAdvancements(actor, currentLevel, clazz, subclass, ancestry);
    currentLevel = Math.max(currentLevel - 1, 0);
  }

  await item.update({[`system.level`]: currentLevel});
  await game.settings.set("dc20rpg", "suppressAdvancements", false);
}

export async function rerunAdvancement(actor, classId) {
  const confirmed = await SimplePopup.confirm("Do you want to repeat the last level up?");
  if (!confirmed) return;
  await changeLevel("false", classId, actor);
  await changeLevel("true", classId, actor);
}

export async function createScrollFromSpell(spell) {
  if (spell.type !== "spell") return;

  // Prepare Scroll data;
  const scroll = spell.toObject();
  scroll.name += " - Scroll";
  scroll.type = 'consumable';
  scroll.system.consumableType = "scroll";
  scroll.system.enhancements = {};
  scroll.system.costs.resources = { ap: 2 };

  if (spell.actor) createItemOnActor(spell.actor, scroll);
  else Item.create(scroll);
  spell.sheet.close();
}

export function collectWeaponsFromActor(actor) {
  const weapons = {};
  actor.items.forEach(item => {
    const identified = item.system.statuses ? item.system.statuses.identified : true;
    if (item.type === "weapon" && identified) 
      weapons[item.id] = item.name;
  });
  return weapons;
}

//======================================
//             Item Tables             =
//======================================
export function reorderTableHeaders(tab, current, swapped, actor) { // TODO - MOVE TO ACTOR SYSTEM INSTEAD?
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

//======================================
//          Companion Traits           =
//======================================
export function createTrait(itemData, actor) {
  const trait = {
    itemData: itemData,
    active: 0,
    repeatable: false,
    itemIds: []
  };
  actor.update({[`system.traits.${generateKey()}`]: trait});
}

export async function deleteTrait(traitKey, actor) {
  const trait = actor.system?.traits[traitKey];
  if (!trait) return;
  
  for (let i = 0; i < trait.itemIds.length; i++) {
    await deleteItemFromActor(trait.itemIds[i], actor);
  }
  await actor.update({[`system.traits.-=${traitKey}`]: null});
}

export async function activateTrait(traitKey, actor) {
  const trait = actor.system?.traits[traitKey];
  if (!trait) return;

  const max = trait.repeatable ? 99 : 1;
  trait.active = Math.min(trait.active+1, max);
  await _handleItemsFromTraits(trait, actor);
  await actor.update({[`system.traits.${traitKey}`]: trait});
}

export async function deactivateTrait(traitKey, actor) {
  const trait = actor.system?.traits[traitKey];
  if (!trait) return;

  trait.active = Math.max(trait.active-1, 0);
  await _handleItemsFromTraits(trait, actor);
  await actor.update({[`system.traits.${traitKey}`]: trait});
}

async function _handleItemsFromTraits(trait, actor) {
  if (trait.active > trait.itemIds.length) {
    const createdItem = await createItemOnActor(actor, trait.itemData);
    trait.itemIds.push(createdItem.id);
  }

  if (trait.active < trait.itemIds.length) {
    const itemId = trait.itemIds.pop();
    await deleteItemFromActor(itemId, actor);
  }
}

//======================================
//          Stackable Items            =
//======================================
export async function handleStackableItem(createdItem, actor, event, transfer, stacks) {
  const stackable = createdItem.system.stackable;
  if (!stackable) return;

  const quantity = createdItem.system.quantity;
  if (quantity < 0) {
    ui.notifications.error("You cannot transfer item with less then 1 quantity");
    return;
  }

  if (!stacks) {
    stacks = 1;
    if (quantity > 1) {
      const provided = await SimplePopup.input("How many stack you want to transfer?");
      stacks = parseInt(provided) > quantity ? quantity : parseInt(provided);
    }
  }

  const itemExist = actor.items.getName(createdItem.name);
  if (itemExist) {
    const dropTarget = event.target.closest("[data-item-id]");
    const itemId = dropTarget?.dataset?.itemId;
    if (actor.uuid === createdItem.parent?.uuid) {
      if (itemId === createdItem.id) return actor.sheet._onSortItem(event, createdItem);
      if (itemId !== itemExist.id) return actor.sheet._onSortItem(event, createdItem);
    }

    const newQuantity = itemExist.system.quantity + stacks;
    await updateItemOnActor(itemExist.id, itemExist.actor, {["system.quantity"]: newQuantity});
    transfer = true; // If this update is being made in the same actor we always want to use transfer options
  }
  else {
    const itemData = createdItem.toObject();
    itemData.system.quantity = stacks;
    await createItemOnActor(actor, itemData);  
  }

  // If transfer, remove original item or subtract charges
  const infiniteStock = createdItem.actor.system?.vendor?.infiniteStock;
  if (transfer && !infiniteStock) {
    if (stacks === quantity) await deleteItemFromActor(createdItem.id, createdItem.actor, {transfer: true});
    else await updateItemOnActor(createdItem.id, createdItem.actor, {["system.quantity"]: quantity - stacks});
  }
}