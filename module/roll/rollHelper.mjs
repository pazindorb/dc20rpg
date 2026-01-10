import { extractGFModValue } from "../dataModel/fields/actor/GFM.mjs";
import { runTemporaryMacro } from "../helpers/macros.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { generateKey, getLabelFromKey } from "../helpers/utils.mjs";

export function labelForItemRoll(item) {
  const actionType = item.system.actionType;
  if (actionType === "attack") {
    const checkType = item.system.attackFormula.checkType;
    if (checkType === "attack") return game.i18n.localize("dc20rpg.sheet.checkSave.martialAttack"); 
    if (checkType === "spell") return game.i18n.localize("dc20rpg.sheet.checkSave.spellAttack"); 
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
  const critThreshold = evalData.critThreshold || 20;
  const critPerDice = [];
  const failPerDice = []
  for (const term of roll.terms) {
    if (term.faces !== 20) continue;

    term.results.forEach(result => {
      critPerDice.push(result.result >= critThreshold);
      failPerDice.push(result.result === 1);
    });
  }

  const rollLevel = (rollOptions.maximize || rollOptions.minimize) ? "" : _rollLevelFromFormula(coreFormula.formula);
  roll.crit = rollLevel === "adv" ? critPerDice.some(r => r === true) : critPerDice.every(r => r === true);
  roll.fail = rollLevel === "dis" ? failPerDice.some(r => r === true) : failPerDice.every(r => r === true);

  // Return Core Roll
  return roll;
}

function _rollLevelFromFormula(formula) {
  const parts = formula.split("d20");
  if (!parts[0]) return "";
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
      if (each5Roll) roll.modified.each5Roll = each5Roll;
    }
    if (roll.modified.failFormula) {
      const failRoll = await evaluateFormula(roll.modified.failFormula, rollData, true);
      if (failRoll) roll.modified.failRoll = failRoll;
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
  item.enhancements.all.values().forEach(enh => {
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
        roll.modified.label = "Damage - " + damageTypeLabel;
        roll.modified.type = dmgType;
        roll.modified.typeLabel = damageTypeLabel;
        roll.clear.label = "Damage - " + damageTypeLabel;
        roll.clear.type = dmgType;
        roll.clear.typeLabel = damageTypeLabel;
        damageRolls.push(roll);
        break;

      case "healing":
        let healingTypeLabel = getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes);
        roll.modified.label = "Healing - " + healingTypeLabel;
        roll.modified.type = formula.type;
        roll.modified.typeLabel = healingTypeLabel;
        roll.clear.label = "Healing - " + healingTypeLabel;
        roll.clear.type = formula.type;
        roll.clear.typeLabel = healingTypeLabel;
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
      const rangeType = evalData.rollMenu.rangeType || item.system.attackFormula.rangeType;
      const checkType = item.system.attackFormula.checkType;
      const checkKey = checkType === "attack" ? "martial" : checkType; // TODO: Remove after we change it to martial
      const [specificGlobalMod, specificAfterRoll] = await extractGFModValue(`damage.${checkKey}.${rangeType}`, item.actor);
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