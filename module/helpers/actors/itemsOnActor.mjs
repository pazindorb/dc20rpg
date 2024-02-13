import { applyAdvancements, removeAdvancements } from "../advancements.mjs";
import { changeActivableProperty } from "../utils.mjs";
import { createCustomResourceFromScalingValue, removeResource } from "./resources.mjs";

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
//            Proficiencies            =
//======================================
/**
 * Checks if owner of given item is proficient with it. Method will change item's value
 * of ``system.attackFormula.combatMastery`` accordingly. Works only for weapons and equipment.
 * 
 * If actor is not sent it will be extracted from item.
 */
export async function checkProficiencies(item, actor) {
  const owner = actor ? actor : await item.actor; 
  if (owner) {
    const profs = owner.system.masteries;
    if (!profs) return; // Actor does not have proficiencies (probably npc)

    if (item.type === "weapon") {
      const weaponType = item.system.weaponType;

      let isProficient = true;
      if (weaponType === "light") isProficient = profs.lightWeapon;
      else if (weaponType === "heavy") isProficient = profs.heavyWeapon;

      item.update({["system.attackFormula.combatMastery"]: isProficient});
    }
    else if (item.type === "equipment") {
      const equipmentType = item.system.equipmentType;

      let isProficient = true; // we want combat mastery for non-proficiency equipments (clothing, trinkets)
      switch (equipmentType) {
        case "light":
          isProficient = profs.lightArmor;
          break;

        case "heavy":
          isProficient = profs.heavyArmor;
          break;

        case "lshield": 
          isProficient = profs.lightShield;
          break;

        case "hshield": 
          isProficient = profs.heavyShield;
          break;
      }

      item.update({["system.attackFormula.combatMastery"]: isProficient});
    }
  }
}

export async function changeProficiencyAndRefreshItems(key, actor) {
  const path = `system.masteries.${key}`;
  // Send call to update actor on server
  changeActivableProperty(path, actor);

  // We need to create actor dummy with correct proficency because 
  // we want to update item before changes on original actor were made
  let clonedProfs = foundry.utils.deepClone(actor.system.masteries);
  let dummyActor = {
    system: {
      masteries : clonedProfs
    }
  }
  dummyActor.system.masteries[key] = !actor.system.masteries[key];
  
  // Change items attackFormula
  const items = await actor.items;
  items.forEach(item => checkProficiencies(item, dummyActor));
}

//======================================
//            Actor's Class            =
//======================================
export async function addUniqueItemToActor(item) {
  const itemType = item.type;
  if (!["class", "subclass", "ancestry"].includes(itemType)) return;

  const actor = await item.actor;
  if (!actor) return;
  
  const uniqueItemId = actor.system.details[itemType].id;
  if (uniqueItemId) {
    let errorMessage = `Cannot add another ${itemType} to ${actor.name}.`;
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
        applyAdvancements(actor, 1, item, subclass, ancestry); // When we are putting class it will always be at 1st level
        break;
      case "subclass":
        applyAdvancements(actor, actorLevel, null, item);
        break;
      case "ancestry":
        applyAdvancements(actor, actorLevel, null, null, item);
        break;
    }
    
    actor.update({[`system.details.${itemType}.id`]: item._id});
  }
}

export async function removeUniqueItemFromActor(item) {
  const itemType = item.type;
  if (!["class", "subclass", "ancestry"].includes(itemType)) return;

  const actor = await item.actor;
  if (!actor) return;

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
        removeAdvancements(actor, 1, item, subclass, ancestry);
        break;
      case "subclass":
        removeAdvancements(actor, 1, null, item);
        break;
      case "ancestry":
        removeAdvancements(actor, 0, null, null, item); // Ancestries have level 0 traits
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
  let currentLevel = item.system.level;

  const clazz = actor.items.get(actor.system.details.class.id);
  const subclass = actor.items.get(actor.system.details.subclass.id);
  const ancestry = actor.items.get(actor.system.details.ancestry.id);
  if (up === "true") {
    currentLevel++;
    applyAdvancements(actor, currentLevel, clazz, subclass, ancestry);
  }
  else {
    removeAdvancements(actor, currentLevel, clazz, subclass, ancestry);
    currentLevel--;
  }

  item.update({[`system.level`]: currentLevel});
}

export function sortMapOfItems(mapOfItems) {  
  const sortedEntries = [...mapOfItems.entries()].sort(([, a], [, b]) => a.sort - b.sort);

  if (!sortedEntries) return mapOfItems; // No entries, map is empty

  sortedEntries.forEach(entry => mapOfItems.delete(entry[0])); // we want to remove all original entries because those are not sorted
  sortedEntries.forEach(entry => mapOfItems.set(entry[0], entry[1])); // we put sorted entries to map
  return mapOfItems;
}