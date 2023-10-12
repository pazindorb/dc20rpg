import { changeActivableProperty } from "../utils.mjs";

//================================================
//           Item Manipulaton on Actor           =
//================================================
export function getItemFromActor(itemId, actor) {
  return actor.items.get(itemId);
}

export async function createItemOnActor(actor, type, name) {
  const itemData = {
    name: name,
    type: type
  };
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
 * of ``system.coreFormula.combatMastery`` accordingly. Works only for weapons and equipment.
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

      item.update({["system.coreFormula.combatMastery"]: isProficient});
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

      item.update({["system.coreFormula.combatMastery"]: isProficient});
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
  
  // Change items coreFormulas
  const items = await actor.items;
  items.forEach(item => checkProficiencies(item, dummyActor));
}

//======================================
//            Actor's Class            =
//======================================
export async function addClassToActor(item) {
  if (item.type !== "class") return;
  const actor = await item.actor;
  if (!actor) return;

  if (actor.system.details.class.id) {
    let errorMessage = `Cannot add another class to ${actor.name}.`;
    ui.notifications.error(errorMessage);
    item.delete();
  } 
  else {
    actor.update({[`system.details.class.id`]: item._id});
  }
}

export async function removeClassFromActor(item) {
  if (item.type !== "class") return;
  const actor = await item.actor;
  if (!actor) return;

  if (actor.system.details.class.id === item._id) {
    actor.update({[`system.details.class`]: {id: ""}});
  }
}

//======================================
//          Other Item Methods         =
//======================================
export function changeLevel(up, itemId, actor) {
  const item = getItemFromActor(itemId, actor);
  let currentLevel = item.system.level;

  if (up === "true") currentLevel++;
  else currentLevel--;

  item.update({[`system.level`]: currentLevel});
}

export function getArmorBonus(item) {
  if (!item.system.statuses.equipped) return 0;
  return item.system.armorBonus ? item.system.armorBonus : 0;
}

export function getDamageReduction(item) {
  if (!item.system.statuses.equipped) return 0;
  const hasReduction = item.system.properties.damageReduction.active;
  const reductionValue = item.system.properties.damageReduction.value ? item.system.properties.damageReduction.value : 0;
  return hasReduction ? reductionValue : 0;
}

export function addBonusToTradeSkill(actor, item) {
  const tradeSkillKey = item.system.tradeSkillKey;
  const rollBonus = item.system.rollBonus;
  if (tradeSkillKey) {
    let bonus = rollBonus ? rollBonus : 0;
    actor.update({[`system.tradeSkills.${tradeSkillKey}.bonus`] : bonus});
  }
}

export function sortMapOfItems(mapOfItems) {  
  const sortedEntries = [...mapOfItems.entries()].sort(([, a], [, b]) => a.sort - b.sort);

  if (!sortedEntries) return mapOfItems; // No entries, map is empty

  sortedEntries.forEach(entry => mapOfItems.delete(entry[0])); // we want to remove all original entries because those are not sorted
  sortedEntries.forEach(entry => mapOfItems.set(entry[0], entry[1])); // we put sorted entries to map
  return mapOfItems;
}