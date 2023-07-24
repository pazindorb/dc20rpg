import { DC20RPG } from "./config.mjs";
import { changeActivableProperty, getLabelFromKey } from "../helpers/utils.mjs";

export async function createItemOnActor(actor, type, name) {
  const itemData = {
    name: name,
    type: type
  };

  return await Item.create(itemData, { parent: actor });
}

export function deleteItemFromActor(event, actor) {
  let item = getItemFromActor(event, actor);
  item.delete();
}

export function editItemOnActor(event, actor) {
  let item = getItemFromActor(event, actor);
  item.sheet.render(true);
}

export function getItemFromActor(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  return actor.items.get(dataset.itemId);
}

export function addFormula(event, item) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;

  let formulaCategory = dataset.category;
  let formulas = item.system.formulas;
  let sortedKeys = Object.keys(formulas).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  let nextKey;
  if (sortedKeys.length === 0) {
    nextKey = 0;
  } else {
    let lastKey = sortedKeys[sortedKeys.length - 1];
    nextKey = parseInt(lastKey) + 1;
  }

  formulas[nextKey] = {
    formula: "",
    type: "",
    category: formulaCategory,
    versatile: false,
    versatileFormula: ""
  }

  item.update({ ["system.formulas"]: formulas });
}

export function removeFormula(event, item) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  item.update({ [`system.formulas.-=${dataset.key}`]: null });
}

export function changeVersatileFormula(event, item) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  let value = item.system.formulas[dataset.key].versatile;
  item.update({ [`system.formulas.${dataset.key}.versatile`]: !value });
}

/**
* Returns html used to create fromula shown in item sheet. 
*/
export function getFormulaHtmlForCategory(category, item) {
  const types = { ...DC20RPG.damageTypes, ...DC20RPG.healingTypes }
  let formulas = item.system.formulas;
  let formulaString = "";

  let filteredFormulas = Object.values(formulas)
    .filter(formula => formula.category === category);

  for (let i = 0; i < filteredFormulas.length; i++) {
    let formula = filteredFormulas[i];
    if (formula.formula === "") continue;
    formulaString += formula.formula;
    if (formula.versatile) formulaString += "(" + formula.versatileFormula + ")";
    formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
    formulaString += " + ";
  }

  if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
  return formulaString;
}

export function reverseStatus(event, item) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  let status = item.system.statuses[dataset.key];
  item.update({ [`system.statuses.${dataset.key}`]: !status });
}

export async function addClassToActorDetails(item) {
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

export async function removeClassFromActorDetails(item) {
  if (item.type !== "class") return;
  const actor = await item.actor;
  if (!actor) return;

  if (actor.system.details.class.id === item._id) {
    actor.update({[`system.details.class`]: {id: ""}});
  }
}

/**
 * Checks if owner of given item is proficient with it. Method will change item's value
 * of ``system.coreFormula.combatMastery`` accordingly. Works only for weapons and equipment.
 * 
 * If actor is not sent it will be extracted from item.
 */
export async function checkProficiencies(item, actor) {
  const owner = actor ? actor : await item.actor; 
  if (owner) {
    const profs = owner.system.proficiencies;
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
      if (["light", "lshield"].includes(equipmentType)) isProficient = profs.lightArmor;
      else if (["heavy", "hshield"].includes(equipmentType))isProficient = profs.heavyArmor;

      item.update({["system.coreFormula.combatMastery"]: isProficient});
    }
  }
}

export async function changeProficiencyAndRefreshItems(event, actor) {
  event.preventDefault();
  const key = event.currentTarget.dataset.key;
  
  // Change proficiency to opposite
  event.currentTarget.dataset.path = `system.proficiencies.${key}`;
  // Send call to update actor on server
  changeActivableProperty(event, actor);

  // We need to create actor dummy with correct proficency because 
  // we want to update item before changes on original actor were made
  let clonedProfs = foundry.utils.deepClone(actor.system.proficiencies);
  let dummyActor = {
    system: {
      proficiencies : clonedProfs
    }
  }
  dummyActor.system.proficiencies[key] = !actor.system.proficiencies[key];
  
  // Change items coreFormulas
  const items = await actor.items;
  items.forEach(item => checkProficiencies(item, dummyActor));
}

export function getArmorBonus(item) {
  if (!item.system.statuses.equipped) return 0;
  return item.system.armorBonus ? item.system.armorBonus : 0;
}

export function addBonusToTradeSkill(actor, item) {
  const tradeSkillKey = item.system.tradeSkillKey;
  const rollBonus = item.system.rollBonus;
  if (tradeSkillKey) {
    let bonus = rollBonus ? rollBonus : 0;
    actor.update({[`system.tradeSkills.${tradeSkillKey}.bonus`] : bonus});
  }
}

export function changeLevel(event, item) {
  event.preventDefault();
  const up = event.currentTarget.dataset.up;
  let currentLevel = item.system.level;

  if (up === "true") currentLevel++;
  else currentLevel--;

  item.update({[`system.level`]: currentLevel});
}