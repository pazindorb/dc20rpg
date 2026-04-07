import { extractGFModValue } from "../dataModel/fields/actor/GFM.mjs";
import { runTemporaryMacro } from "../helpers/macros.mjs";
import { chargeDisplayData, getResourceDisplayData } from "../helpers/resources.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { generateKey, getLabelFromKey } from "../helpers/utils.mjs";

export function labelForItemRoll(item) {
  const actionType = item.system.actionType;
  if (actionType === "attack") {
    const checkType = item.system.attack.checkType;
    return game.i18n.localize(`dc20rpg.sheet.checkSave.${checkType}Attack`);
  }
  if (actionType === "check") {
    return getLabelFromKey(item.system.check.checkKey, CONFIG.DC20RPG.ROLL_KEYS.allChecks);
  }
  return item.name;
}

export async function runEnhancementMacro(item, macroKey, additionalFields) {
  const actor = item.actor;
  const enhancements = item.activeEnhancements;
  if (!enhancements) return; 

  for (const [enhKey, enh] of enhancements.entries()) {
    const macros = enh.modifications.macros;
    if (!macros) continue;

    const command = macros[macroKey];
    if (command && command !== "") {
      await runTemporaryMacro(command, item, {item: item, actor: actor, enh: enh, enhKey: enhKey, ...additionalFields})
    }
  }
}

export async function evaluateCoreRoll(coreFormula, rollData, evalData={}) {
  if (!coreFormula.formula) return null;
  
  // Prepare Roll
  const rollMenu = evalData.rollMenu;
  const roll = new Roll(coreFormula.formula, rollData);
  roll.coreFormula = true;
  roll.label = coreFormula.label;
  roll.source = coreFormula.source;

  const rollOptions = {
    maximize: rollMenu.autoCrit && !rollMenu.autoFail,
    minimize: !rollMenu.autoCrit && rollMenu.autoFail
  };
  if (rollOptions.maximize || rollOptions.minimize) {
    roll.terms[0].modifiers = [];
    roll.terms[0].number = 1;
  }
  if (rollOptions.maximize) roll.label += " [Auto Crit]";
  if (rollOptions.minimize) roll.label += " [Auto Fail]";

  // Evaluate
  await roll.evaluate(rollOptions);
  roll.flatDice = roll.dice[0].total; // We will need that later

  // Mark Crit Success/Fail
  const critFailThreshold = evalData.rollConfig?.critFailThreshold || 1;
  const critThreshold = evalData.rollConfig?.critThreshold || 20;
  const critPerDice = [];
  const failPerDice = []
  for (const term of roll.terms) {
    if (term.faces !== 20) continue;

    term.results.forEach(result => {
      critPerDice.push(result.result >= critThreshold);
      failPerDice.push(result.result <= critFailThreshold);
    });
  }
  if (critPerDice.length === 0 && failPerDice.length === 0) return roll;

  const rollLevel = (rollOptions.maximize || rollOptions.minimize) ? "" : _rollLevelFromFormula(coreFormula.formula);
  roll.crit = rollLevel === "adv" ? critPerDice.some(r => r === true) : critPerDice.every(r => r === true);
  roll.fail = rollLevel === "dis" ? failPerDice.some(r => r === true) : failPerDice.every(r => r === true);

  // Return Core Roll
  return roll;
}

function _rollLevelFromFormula(formula) {
  const parts = formula.split("d20");
  if (!parts[0]) return "";
  if (!parts[1]) return "";
  if (parts[1].startsWith("kh")) return "adv";
  if (parts[1].startsWith("kl")) return "dis";
  return "";
}

//=======================================
//         HANDLE FORMULA ROLLS         =
//=======================================
export async function evaluateFormulaRoll(item, rollData, evalData) {
  // Collect all formula rolls
  const formulas = _collectFormulas(item);
 
  // Prepare formulas
  const prepared = await _prepareFormulas(formulas, item, evalData);

  // Evaluate
  for (const roll of prepared) {
    await roll.clear.evaluate();
    await roll.modified.evaluate();

    // We want to evaluate each5 and fail formulas in advance
    if (roll.modified.each5Formula) {
      const each5Roll = await evaluateFormula(roll.modified.each5Formula, rollData, true);
      if (each5Roll) roll.modified.each5Value = each5Roll.total;
    }
    if (roll.modified.failFormula) {
      const failRoll = await evaluateFormula(roll.modified.failFormula, rollData, true);
      if (failRoll) roll.modified.failValue = failRoll.total;
    }
  }
  return prepared;
}

function _collectFormulas(item) {
  // Item formulas
  let formulas = item.system.formulas || {};

  // If item is a using weapon as part of an attack we collect those formulas
  const actor = item.actor;
  const useWeapon = item.system.usesWeapon
  if (actor && useWeapon?.weaponAttack) {
    const weaponId = useWeapon.weaponId;
    const weapon = actor.items.get(weaponId);
    if (weapon) {
      const weaponFormulas = weapon.system.formulas;
      formulas = {...formulas, ...weaponFormulas}
    }
  }
  
  // Some enhancements can provide additional formula
  let fromEnhancements = {};
  item.enhancements.active.values().forEach(enh => {
    const enhMod = enh.modifications;
    if (enhMod.addsNewFormula) {
      const key = generateKey();
      const formula = {...enhMod.formula};
      if (enh.number > 1) {
        formula.formula = ` + (${enh.number} * (${formula.formula}))`;
        if (formula.failFormula) formula.failFormula = ` + (${enh.number} * (${formula.failFormula}))`;
        if (formula.each5Formula) formula.each5Formula = ` + (${enh.number} * (${formula.each5Formula}))`;
      }
      fromEnhancements[key] = formula;
      fromEnhancements[key].enhName = enh.name;
    } 
  })
  formulas = {...formulas, ...fromEnhancements};

  return formulas;
}

function _checkForDamageOverride(item) {
  let damageOverride = item.damageOverride || "";
  item.enhancements.active.values().forEach(enh => {
    const enhMod = enh.modifications;
    // Override Damage Type
    if (enhMod.overrideDamageType && enhMod.damageType) {
      damageOverride = enhMod.damageType;
    };
  })
  return damageOverride;
}

async function _prepareFormulas(formulas, item, evalData) {
  const damageOverride = _checkForDamageOverride(item);
  const rollData = item.getRollData();

  const damageRolls = [];
  const healingRolls = [];
  const otherRolls = [];
  for (const [key, formula] of Object.entries(formulas)) {
    const clearRollFromula = formula.formula; // formula without any modifications
    const modified = await _modifiedRollFormula(formula, key, item, evalData); // formula with active enhancements applied
    const roll = {
      clear: _enhanceRoll(new Roll(clearRollFromula, rollData), formula, key),
      modified: _enhanceRoll(new Roll(modified.rollFormula, rollData), formula, key)
    }
    
    roll.clear.clear = true;
    roll.modified.clear = false;
    roll.clear.modifierSources = formula.enhName || "Base Value";
    roll.modified.modifierSources = modified.modifierSources;
    if (formula.each5) roll.modified.each5Formula = formula.each5Formula;
    if (formula.fail) roll.modified.failFormula = formula.failFormula;

    switch (formula.category) {
      case "damage":
        const dmgType = damageOverride || formula.type;
        let damageTypeLabel = getLabelFromKey(dmgType, CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes);
        roll.modified.label = damageTypeLabel;
        roll.modified.type = dmgType;
        roll.clear.label = damageTypeLabel;
        roll.clear.type = dmgType;
        damageRolls.push(roll);
        break;

      case "healing":
        let healingTypeLabel = getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes);
        roll.modified.label = healingTypeLabel;
        roll.modified.type = formula.type;
        roll.clear.label = healingTypeLabel;
        roll.clear.type = formula.type;
        healingRolls.push(roll);
        break;

      case "other":
        roll.clear = new Roll("0", {});
        roll.modified.perTarget = formula.perTarget;
        roll.modified.label = formula.label || "Other Roll";
        otherRolls.push(roll);
        break;
    }
  }
  return [...damageRolls, ...healingRolls, ...otherRolls];
}

async function _modifiedRollFormula(formula, key, item, evalData) {
  let rollFormula = formula.formula;
  let failFormula = (formula.fail && !formula.dontModifyFailFormula) ? formula.failFormula : null;
  let modifierSources = formula.enhName || "Base Value";

  // From Enhancements
  const enhancements = item.enhancements.active;
  enhancements.values().forEach(enh => {
    const enhMod = enh.modifications;
    if (enhMod.hasAdditionalFormula && enhMod.additionalFormula) {
      if (enhMod.specificFormulaKey && enhMod.specificFormulaKey !== key) return;

      for (let i = 0; i < enh.number; i++) {
        const additional = (enhMod.additionalFormula.includes("+") || enhMod.additionalFormula.includes("-")) ? enhMod.additionalFormula : ` + ${enhMod.additionalFormula}`
        rollFormula += additional;
        if (failFormula !== null) failFormula += additional;
        modifierSources += ` + ${enh.name}`;
      }
    }
  })

  // Global Formula Modifiers
  let [globalMod, afterRoll] = [{value: "", source: ""}, []];
  if (formula.category === "damage") {
    [globalMod, afterRoll] = await extractGFModValue("damage.any", item.actor);

    if (item.system.actionType === "attack") {
      const rangeType = evalData.rollMenu.rangeType || item.system.attack.rangeType;
      const checkType = item.system.attack.checkType;
      const [specificGlobalMod, specificAfterRoll] = await extractGFModValue(`damage.${checkType}.${rangeType}`, item.actor);
      if (specificGlobalMod.value) {
        globalMod.value += globalMod.value ? ` + ${specificGlobalMod.value}` : specificGlobalMod.value;
        globalMod.source += globalMod.source ? ` + ${specificGlobalMod.source}` : specificGlobalMod.source;
        afterRoll = [...afterRoll, ...specificAfterRoll];
      }
    }
  }

  if (formula.category === "healing") {
    [globalMod, afterRoll] = await extractGFModValue("healing", item.actor);
  }
  if (globalMod.value) {
    rollFormula += ` + (${globalMod.value})`;
    if (failFormula !== null) failFormula += ` + (${globalMod.value})`;
    modifierSources += ` + ${globalMod.source}`;
  }
  if (failFormula !== null) formula.failFormula = failFormula;

  // Add effects to modify after roll
  afterRoll.forEach(element => evalData.afterRollEffects.push(element));
  return {
    rollFormula: rollFormula,
    modifierSources: modifierSources
  };
}

function _enhanceRoll(roll, formula, key) {
  roll.key = key;
  roll.id = key,
  roll.coreFormula = false;
  roll.category = formula.category;
  roll.dontMerge = formula.dontMerge;
  roll.overrideDefence = formula.overrideDefence;
  return roll;
}

//=======================================
//        PREPARE SHEET ROLL DATA       =
//=======================================
export function sheetRollDataFrom(data={}, actor) {
  const sheetData = foundry.utils.deepClone(data);

  if (sheetData.checkKey.length > 4 && !["prime", "initiative", "deathSave"].includes(sheetData.checkKey)) {
    const skill = actor.skillAndLanguage.skills[sheetData.checkKey];
    const label = skill?.label ? `${skill?.label} Check` : "Check";
    sheetData.label = label;
    sheetData.rollTitle = label;
  }

  sheetData.costs = {resources: {}, charges: {},quantity: {}}
  if (data.costs) {
    sheetData.costs = {
      ...sheetData.costs, 
      ...data.costs
    }
  }

  // Prepare enhancemenets
  const copyHash = `${sheetData.checkKey}#${sheetData.type}`;
  const enhancemetns = new Map();
  for (const item of actor.items) {
    if (!item.enhancements) continue;

    for (const [key, enhancement] of item.enhancements.maintained.entries()) {
      if (enhancement?.copyToSheetRoll?.[copyHash]) {
        enhancemetns.set(key, enhancement);
      }
      if (sheetData.type === "skillCheck" && enhancement?.copyToSheetRoll?.["all#skillCheck"]) {
        enhancemetns.set(key, enhancement);
      }
      if (sheetData.type === "attributeCheck" && enhancement?.copyToSheetRoll?.["all#attributeCheck"]) {
        enhancemetns.set(key, enhancement);
      }
      if (sheetData.type === "save" && enhancement?.copyToSheetRoll?.["all#save"]) {
        enhancemetns.set(key, enhancement);
      }
    }
  }
  sheetData.enhancements = enhancemetns;

  // Methods
  sheetData.refreshEnhancemetns = () => _refreshEnhancemetns(actor, sheetData);
  sheetData.collectUseCost = () => _collectUseCost(actor, sheetData);
  sheetData.respectUseCost = async () => await _respectUseCost(actor, sheetData);
  sheetData.useCostDisplayData = () => _useCostDisplayData(actor, sheetData);
  sheetData.clearEnhancements = async () => await _clearEnhancements(sheetData);
  return sheetData;
}

function _collectUseCost(actor, sheetData) {
  _refreshEnhancemetns(actor, sheetData);
  const enhancements = sheetData.enhancements;
  const rollMenu = actor.system.rollMenu;
  const costs = foundry.utils.deepClone(sheetData.costs);

  if (rollMenu.apCost) {
    if (costs.resources.ap != null) costs.resources.ap += rollMenu.apCost;
    else costs.resources.ap = rollMenu.apCost;
  }
  if (rollMenu.gritCost) {
    if (costs.resources.grit != null) costs.resources.grit += rollMenu.gritCost;
    else costs.resources.grit = rollMenu.gritCost;
  }

  if (!enhancements) return costs;

  for (const [key, enh] of enhancements.entries()) {
    if (enh.active) {
      const item = actor.items.get(enh.sourceItemId);
      _addEnhancementCost(item, actor, key, costs);
    }
  }
  return costs;
}

async function _respectUseCost(actor, sheetData) {
  if (!actor) return false;
  const cost = _collectUseCost(actor, sheetData);

  const canUse = _canSpendResources(cost, actor) && _canSubtractCharges(cost, actor);
  if (!canUse) return false;

  await _spendResources(cost, actor);
  await _subtractCharges(cost, actor);
  return true;
}

function _canSpendResources(cost, actor) {
  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    if (!actor.resources[resourceKey].canSpend(amount)) return false;
  }
  return true;
}

function _canSubtractCharges(cost, actor) {
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = actor.items.get(itemId);
    if (!item) {
      ui.notifications.error(`Item with id '${itemId}' cannot be found on '${actor.name}'`);
      return false;
    }
    if (!item.use.canRemoveCharge(amount)) {
      return false;
    }
  }
  return true;
}

async function _spendResources(cost, actor) {
  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    await actor.resources[resourceKey].spend(amount);
  }
}

async function _subtractCharges(cost, actor) {
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = actor.items.get(itemId);
    await item.use.removeCharge(amount, true);
  }
}

function _useCostDisplayData(actor, sheetData) {
  const cost = _collectUseCost(actor, sheetData);
  const displayData = {
    resources: {},
    charges: {},
    quantity: {}
  }

  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    displayData.resources[resourceKey] = getResourceDisplayData(resourceKey, amount, null, actor);
  }
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = actor.items.get(itemId);
    if(item) displayData.charges[itemId] = chargeDisplayData(false, amount, item.name);
  }
  return displayData;
}

function _refreshEnhancemetns(actor, sheetData) {
  for (const [key, enh] of sheetData.enhancements.entries()) {
    const item = actor.items.get(enh.sourceItemId);
    const updated = item.enhancements.maintained.get(key);
    sheetData.enhancements.set(key, updated)
  }
}

async function _clearEnhancements(sheetData) {
  for (const enh of sheetData.enhancements.values()) {
    if (enh.active) await enh.clear()
  }
}

function _addEnhancementCost(item, actor, enhKey, costs) {
  const enhancement = item.enhancements.maintained.get(enhKey);
  if (!enhancement) {
    ui.notifications.error(`Enhancement with key '${enhKey}' not found on '${item.name}' item.`);
    return;
  }

  // Add to Resources
  for (let [key, value] of Object.entries(enhancement.resources)) {
    _addToResources(costs, key, value, actor, enhancement.number);
  }
  // Add to Charges
  if (enhancement.charges?.subtract && enhancement.charges.fromOriginal) {
    const itemId = enhancement.sourceItemId;
    const value = enhancement.charges.subtract * enhancement.number;
    if (costs.charges[itemId]) costs.charges[itemId] += value;
    else costs.charges[itemId] = value;
  }
}

function _addToResources(cost, key, value, actor, multiplier=1) {
  if (key === "custom") {
    for (const [customKey, customRes] of Object.entries(value)) {
      _addToResources(cost, customKey, customRes.value, actor, multiplier);
    }
    return;
  }

  // Skip if actor doesn't have that resource at all
  if (actor && !actor.resources.hasResource(key)) return;
  if (value == null) return;
  
  if (cost.resources[key]) {
    cost.resources[key] += (value * multiplier);
  }
  else {
    cost.resources[key] = (value * multiplier);
  }
}