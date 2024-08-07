import { DC20RPG } from "../config.mjs";
import { respectUsageCost, subtractAP } from "./costManipulator.mjs";
import { getLabelFromKey } from "../utils.mjs";
import { sendDescriptionToChat, sendRollsToChat } from "../../chat/chat-message.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";


//==========================================
//             Roll From Sheet             =
//==========================================
export async function rollFromSheet(actor, details) {
  return await _rollFromFormula(details.roll, details, actor, true);
}

//==========================================
//            Roll From Actions            =
//==========================================
export function rollFromAction(actor, name, label, apCost, type, formula, description) {
  if (!subtractAP(actor, apCost)) return;

  const details = {
    label: name,
    image: actor.img,
    rollTitle: label,
    sublabel: label,
    description: description,
    type: type
  }
  if (formula) return _rollFromFormula(formula, details, actor, true);
  else sendDescriptionToChat(actor, {
    rollTitle: name,
    image: actor.img,
    description: description,
  });
}

//==========================================
//           Roll For Initiative           =
//==========================================
export function rollForInitiative(actor, details) {
  actor.rollInitiative({
    createCombatants: true,
    rerollInitiative: true,
    initiativeOptions: {
      formula: details.roll,
      label: details.label,
      type: details.type
    },
  });
}

/**
 * Creates new Roll instance from given formula. Returns result of that roll.
 * If roll was done with advantage or disadvantage only winning roll will be returned.
 * 
 * @param {String} formula      - Formula used to create roll.
 * @param {Object} details      - Object containing extra informations about that roll. Ex. type, description, label.
 * @param {DC20RpgActor} actor  - Actor which roll data will be used for creating that roll.
 * @param {Boolean} sendToChat  - If true, creates chat message showing rolls results.
 * @returns {Roll} Winning roll.
 */
async function _rollFromFormula(formula, details, actor, sendToChat) {
  const rollMenu = actor.flags.dc20rpg.rollMenu;
  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = actor.getRollData();

  // We need to consider advantages and disadvantages
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;

  // If the formula contains d20 we want to replace it.
  if (formula.includes("d20")) formula = formula.replaceAll("d20", d20roll);

  const globalMod = actor.system.globalFormulaModifiers[details.type] || "";
  const helpDices = _collectHelpDices(rollMenu);
  formula += " " + globalMod + helpDices;

  const rolls = {
    core: _prepareCoreRolls(formula, rollData, details.label)
  };
  await _evaluateRollsAndMarkCrits(rolls.core, rollLevel);
  rolls.winningRoll = _extractAndMarkWinningCoreRoll(rolls.core, rollLevel);

  // Prepare and send chat message
  if (sendToChat) {
    const label = details.label || `${actor.name} : Roll Result`;
    const rollTitle = details.rollTitle || label;
    const messageDetails = {
      label: label,
      image: actor.img,
      description: details.description,
      against: details.against,
      rollTitle: rollTitle
    };
    sendRollsToChat(rolls, actor, messageDetails, false);
  }
  _resetRollMenu(rollMenu, actor);
  return rolls.winningRoll;
}

//===================================
//          Roll From Item          =
//===================================
/**
 * Creates new Roll instances from given item formulas. Returns result of core formula.
 * If roll was done with advantage or disadvantage only winning roll will be returned.
 * 
 * @param {String} itemId       - The ID of the item from which the rolls will be created.
 * @param {DC20RpgActor} actor  - Actor which roll data will be used for creating those rolls.
 * @param {Boolean} sendToChat  - If true, creates chat message showing rolls results.
 * @returns {Roll} Winning roll.
 */
export async function rollFromItem(itemId, actor, sendToChat) {
  const item = actor.items.get(itemId);
  if (!item) return;
  
  const rollMenu = item.flags.dc20rpg.rollMenu;
  const costsSubracted = rollMenu.free ? true : respectUsageCost(actor, item);
  if (!costsSubracted) return;

  // If no action type provided, just send description message
  if (!item.system.actionType) {
    sendDescriptionToChat(actor, {
      rollTitle: item.name,
      image: item.img,
      description: item.system.description,
    })
    return;
  }

  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = await item.getRollData();
  const actionType = item.system.actionType;
  const rolls = await _evaluateItemRolls(actionType, actor, item, rollData, rollLevel);
  rolls.winningRoll = _hasAnyRolls(rolls) ? _extractAndMarkWinningCoreRoll(rolls.core, rollLevel) : null;

  // Prepare and send chat message
  if (sendToChat) {
    const description = !item.system.statuses || item.system.statuses.identified
        ? item.system.description
        : "<b>Unidentified</b>";
    const conditionals = _prepareConditionals(actor.system.conditionals, item);

    const messageDetails = {
      itemId: item._id,
      image: item.img,
      description: description,
      rollTitle: item.name,
      actionType: actionType,
      conditionals: conditionals,
      showDamageForPlayers: game.settings.get("dc20rpg", "showDamageForPlayers")
    };

    // For non usable items we dont care about rolls
    if (!item.system.hasOwnProperty("attackFormula")) {
      sendRollsToChat(rolls, actor, messageDetails, false);
      return;
    }

    if (item.system.effectsConfig?.addToChat) messageDetails.applicableEffects = _prepareEffectsFromItems(item);

    // Details depending on action type
    if (["dynamic", "attack"].includes(actionType)) {
      const winningRoll = rolls.winningRoll;
      if (winningRoll.crit) _markCritFormulas(rolls.formula);

      messageDetails.rollTotal = winningRoll.total;
      messageDetails.targetDefence = item.system.attackFormula.targetDefence;
      messageDetails.halfDmgOnMiss = item.system.attackFormula.halfDmgOnMiss;
      messageDetails.impact = item.system.properties?.impact?.active;
      messageDetails.saveDetails = _prepareDynamicSaveDetails(item);
    }
    if (["save"].includes(actionType)) {
      messageDetails.saveDetails = _prepareSaveDetails(item);
    }
    if (["check", "contest"].includes(actionType)) {
      const checkDetails = _prepareCheckDetails(item, rolls.winningRoll, rolls.formula);
      messageDetails.checkDetails = checkDetails;
    }
    sendRollsToChat(rolls, actor, messageDetails, true);
  }
  _resetRollMenu(rollMenu, item);
  _resetEnhancements(item, actor);
  return rolls.winningRoll;
}

//=======================================
//           evaluate ROLLS             =
//=======================================
async function _evaluateItemRolls(actionType, actor, item, rollData, rollLevel) {
  const attackRolls = await _evaluateAttackRolls(actionType, actor, item, rollData, rollLevel);
  const checkRolls = await _evaluateCheckRolls(actionType, actor, item, rollData, rollLevel);
  const coreRolls = [...attackRolls, ...checkRolls];

  const checkOutcome = actionType === "check" ? item.system.check.outcome : undefined;
  const attackCheckType = ["dynamic", "attack"].includes(actionType) ? item.system.attackFormula.checkType : undefined;
  const formulaRolls = await _evaluateFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType);
  return {
    core: coreRolls,
    formula: formulaRolls
  }
}

async function _evaluateAttackRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["attack", "dynamic"].includes(actionType)) return []; // We want to create attack rolls only for few types of roll
  const helpDices = _collectHelpDices(item.flags.dc20rpg.rollMenu);
  const rollModifiers = _collectCoreRollModifiers(item.flags.dc20rpg.rollMenu)
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, rollLevel, helpDices, rollModifiers);
  const label = getLabelFromKey(item.system.attackFormula.checkType, DC20RPG.attackTypes); 
  const coreRolls = _prepareCoreRolls(coreFormula, rollData, label);
  await _evaluateRollsAndMarkCrits(coreRolls, rollLevel, item.system.attackFormula.critThreshold);
  return coreRolls;
}

async function _evaluateFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType) {
  const formulaRolls = _prepareFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType);
  for (let i = 0; i < formulaRolls.length; i++) {
    const roll = formulaRolls[i];
    await roll.clear.evaluate();
    await roll.modified.evaluate();
  }
  return formulaRolls;
}

async function _evaluateCheckRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["check", "contest"].includes(actionType)) return []; // We want to create check rolls only for few types of roll
  const checkKey = item.system.check.checkKey;
  const helpDices = _collectHelpDices(item.flags.dc20rpg.rollMenu);
  const checkFormula = _prepareCheckFormula(actor, checkKey, rollLevel, helpDices);
  const label = getLabelFromKey(checkKey, DC20RPG.checks);
  const checkRolls = _prepareCoreRolls(checkFormula, rollData, label);
  await _evaluateRollsAndMarkCrits(checkRolls, rollLevel);
  if (actionType === "check") _determineCheckOutcome(checkRolls, item, rollLevel);
  return checkRolls;
}

function _determineCheckOutcome(rolls, item, rollLevel) {
  const check = item.system.check;
  const checkValue = _extractAndMarkWinningCoreRoll(rolls, rollLevel).total;
  const natOne = _checkForNatOne(rolls);
  if (natOne || (checkValue < check.checkDC)) check.outcome = -1;   // Check Failed
  else check.outcome = Math.floor((checkValue - check.checkDC) / 5);  // Check succeed by 5 or more
}

async function _evaluateRollsAndMarkCrits(rolls, rollLevel, critThreshold) {
  if (!rolls) return;

  for (let i = 0; i < rolls.length; i++) {
    const roll = rolls[i];
    await roll.evaluate();
    roll.crit = false;
    roll.fail = false;
    let critNo = 0;
    let failNo = 0;

    // Only d20 can crit
    roll.terms.forEach(term => {
      if (term.faces === 20) {
        const fail = 1;
        const crit = critThreshold ? critThreshold : 20;

        term.results.forEach(result => {
          if (result.result >= crit) critNo++; 
          if (result.result === fail) failNo++; 
        });
      }
    });

    if (rollLevel >= 0 && critNo > 0) roll.crit = true;
    else if (rollLevel <= 0 && failNo > 0) roll.fail = true;
    else if (rollLevel <= 0 && critNo > Math.abs(rollLevel)) roll.crit = true;
    else if (rollLevel >= 0 && failNo > rollLevel) roll.fail = true;
  }
}

function _extractAndMarkWinningCoreRoll(coreRolls, rollLevel) {
  if (coreRolls.length === 0) return 0;
  let bestRoll;
  let bestTotal;

  if (coreRolls.length === 1) bestRoll = coreRolls[0];
  
  if (rollLevel < 0) {
    bestTotal = 999;
    coreRolls.forEach(coreRoll => {
      if (coreRoll._total < bestTotal) {
        bestRoll = coreRoll;
        bestTotal = coreRoll._total;
      }
    });
  }
  if (rollLevel > 0) {
    bestTotal = -999;
    coreRolls.forEach(coreRoll => {
      if (coreRoll._total > bestTotal) {
        bestRoll = coreRoll;
        bestTotal = coreRoll._total;
      }
    });
  }
  bestRoll.flatDice = bestRoll.dice[0].total;
  bestRoll.winner = true;
  return bestRoll;
}

function _checkForNatOne(rolls) {
  for (let i = 0; i < rolls.length; i++) {
    if (rolls[i].fail) return true;
  }
  return false;
}

//=======================================
//            PREPARE ROLLS             =
//=======================================
function _prepareCoreRolls(coreFormula, rollData, label) {
  let coreRolls = [];
  if (coreFormula) {
    const coreRoll = new Roll(coreFormula, rollData);
    coreRoll.coreFormula = true;
    coreRoll.label = label;
    coreRolls.push(coreRoll);
  }
  return coreRolls;
}

function _prepareFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType) { // TODO: Refactor this
  let formulas = item.system.formulas;
  let enhancements = item.system.enhancements;
  if (item.system.usesWeapon?.weaponAttack) {
    const wrapper = _getWeaponFormulasAndEnhacements(actor, item.system.usesWeapon.weaponId);
    formulas = {...formulas, ...wrapper.formulas};
    enhancements = {...enhancements, ...wrapper.enhancements};
  }

  if (formulas) {
    const damageRolls = [];
    const healingRolls = [];
    const otherRolls = [];

    for (const [key, formula] of Object.entries(formulas)) {
      const clearRollFromula = formula.formula; // formula without any modifications
      const modified = _modifiedRollFormula(formula, checkOutcome, attackCheckType, enhancements, actor); // formula with all enhancements and each five applied
      const roll = {
        clear: new Roll(clearRollFromula, rollData),
        modified: new Roll(modified.rollFormula, rollData)
      }
      const commonData = {
        id: key,
        coreFormula: false,
        label: "",
        category: formula.category
      }
      roll.clear.clear = true;
      roll.modified.clear = false;
      roll.clear.modifierSources = "Base Value";
      roll.modified.modifierSources = modified.modifierSources;

      switch (formula.category) {
        case "damage":
          let damageTypeLabel = getLabelFromKey(formula.type, DC20RPG.damageTypes);
          commonData.label += "Damage - " + damageTypeLabel;
          commonData.type = formula.type;
          commonData.typeLabel = damageTypeLabel;
          _fillCommonRollProperties(roll, commonData);
          damageRolls.push(roll);
          break;
        case "healing":
          let healingTypeLabel = getLabelFromKey(formula.type, DC20RPG.healingTypes);
          commonData.label += "Healing - " + healingTypeLabel;
          commonData.type = formula.type;
          commonData.typeLabel = healingTypeLabel;
          _fillCommonRollProperties(roll, commonData);
          healingRolls.push(roll);
          break;
        case "other":
          commonData.label += "Other";
          _fillCommonRollProperties(roll, commonData);
          otherRolls.push(roll);
          break;
      }
    }
    return [...damageRolls, ...healingRolls, ...otherRolls];
  }
  return [];
}

function _fillCommonRollProperties(roll, commonData) {
  return {
    clear: foundry.utils.mergeObject(roll.clear, commonData),
    modified: foundry.utils.mergeObject(roll.modified, commonData)
  };
}

function _getWeaponFormulasAndEnhacements(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item) return {formulas: {}, enhancements: {}};
  return {
    formulas: item.system.formulas, 
    enhancements: item.system.enhancements,
    usedItem: item
  };
}

function _modifiedRollFormula(formula, checkOutcome, attackCheckType, enhancements, actor) {
  let rollFormula = formula.formula;
  let modifierSources = "Base Value";

  // If check faild use fail formula
  if (checkOutcome === -1 && formula.fail) {
    rollFormula = formula.failFormula;
    modifierSources += " (Check Failed)";
  }

  // If check successed over 5 add bonus formula
  if (checkOutcome > 0 && formula.each5) {
    for(let i = 0; i < checkOutcome; i++) {
      rollFormula += ` + ${formula.each5Formula}`;
    }
    modifierSources += ` (Check Success over ${5 * checkOutcome})`;
  };

  // Apply active enhancements
  if (enhancements) {
    Object.values(enhancements).forEach(enh => {
      if (enh.modifications.hasAdditionalFormula) {
        for (let i = 0; i < enh.number; i++) {
          rollFormula += ` + ${enh.modifications.additionalFormula}`;
          modifierSources += ` + ${enh.name}`;
        }
      }
    })
  }

  let globalModKey = "";
  // Apply global modifiers (some buffs to damage or healing etc.)
  if (formula.category === "damage" && attackCheckType) {
    if (attackCheckType === "attack") globalModKey = "martialAttackDamage";
    if (attackCheckType === "spell") globalModKey = "spellAttackDamage";
  }
  else if (formula.category === "healing") globalModKey = "healing";
  
  const globalMod = actor.system.globalFormulaModifiers[globalModKey] || "";
  if (globalMod) {
    rollFormula += ` + (${globalMod})`;
    modifierSources += " + Buffs from Effects";
  }

  return {
    rollFormula: rollFormula,
    modifierSources: modifierSources
  };
}

function _prepareCheckFormula(actor, checkKey, rollLevel, helpDices) {
  let modifier;
  let rollType;
  switch (checkKey) {
    case "att":
      modifier = actor.system.attackMod.value.martial;
      rollType = "attackCheck";
      break;

    case "spe":
      modifier = actor.system.attackMod.value.spell;
      rollType = "spellCheck";
      break;

    case "mar": 
      const acrModifier = actor.system.skills.acr.modifier;
      const athModifier = actor.system.skills.ath.modifier;
      modifier = acrModifier >= athModifier ? acrModifier : athModifier;
      rollType = "skillCheck";
      break;

    default:
      modifier = actor.system.skills[checkKey].modifier;
      rollType = "skillCheck";
      break;
  }
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  const globalMod = actor.system.globalFormulaModifiers[rollType] || "";
  return `${d20roll} + ${modifier} ${globalMod} ${helpDices}`;
}

function _prepareAttackFromula(actor, attackFormula, rollLevel, helpDices, rollModifiers) {
  // We need to consider advantages and disadvantages
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  const formulaMod = attackFormula.formulaMod;
  const rollType = attackFormula.checkType === "attack" ? "attackCheck" : "spellCheck";
  const globalMod = actor.system.globalFormulaModifiers[rollType] || "";
  return `${d20roll} ${formulaMod} ${globalMod} ${helpDices} ${rollModifiers}`;
}

//=======================================
//           PREPARE DETAILS            =
//=======================================
function _prepareDynamicSaveDetails(item) {
  const type = item.system.actionType === "dynamic" ? item.system.save.type : null;
  const dc = item.system.actionType === "dynamic" ? item.system.save.dc : null;
  const saveDetails = {
    dc: dc,
    type: type
  };
  const enhancements = item.system.enhancements;
  _overrideWithEnhancement(saveDetails, enhancements);

  saveDetails.label = getLabelFromKey(saveDetails.type, DC20RPG.saveTypes) + " Save";
  return saveDetails;
}

function _prepareSaveDetails(item) {
  const type = item.system.save.type;
  const dc = item.system.save.dc;
  const saveDetails = {
    dc: dc,
    type: type,
  };
  const enhancements = item.system.enhancements;
  _overrideWithEnhancement(saveDetails, enhancements);
  
  saveDetails.label = getLabelFromKey(saveDetails.type, DC20RPG.saveTypes) + " Save";
  return saveDetails;
}

function _overrideWithEnhancement(saveDetails, enhancements) {
  if (enhancements) {
    Object.values(enhancements).forEach(enh => {
      if (enh.number && enh.modifications.overrideSave) {
        saveDetails.type = enh.modifications.save.type;
        saveDetails.dc = enh.modifications.save.dc;
      }
    })
  }
}

function _prepareCheckDetails(item, winningRoll, formulaRolls) {
  const canCrit = item.system.check.canCrit;
  if (canCrit && winningRoll.crit) _markCritFormulas(formulaRolls);

  const checkKey = item.system.check.checkKey;
  const contestedKey = item.system.check.contestedKey;
  return {
    rollLabel: getLabelFromKey(checkKey, DC20RPG.checks),
    checkDC: item.system.check.checkDC,
    actionType: item.system.actionType,
    contestedAgainst: winningRoll._total,
    contestedKey: contestedKey,
    contestedLabel: getLabelFromKey(contestedKey, DC20RPG.contests)
  }
}

function _markCritFormulas(formulaRolls) {
  formulaRolls.forEach(roll => {
    roll.modified._total += 2
    roll.modified.crit = true
    roll.modified.modifierSources += ` + Critical`;
  });
}

function _prepareEffectsFromItems(item) {
  if (item.effects.size === 0) return [];
  const effects = [];
  item.effects.forEach(effect => {
    effects.push({
      img: effect.img || effect.icon,  // v11 compatibility (TODO: REMOVE LATER)
      name: effect.name,
      uuid: effect.uuid,
    })
  });
  return effects;
}

//=======================================
//            OTHER FUNCTIONS           =
//=======================================
function _collectHelpDices(rollMenu) {
  let helpDicesFormula = "";
  if (rollMenu.d8 > 0) helpDicesFormula += `+ ${rollMenu.d8}d8`;
  if (rollMenu.d6 > 0) helpDicesFormula += `+ ${rollMenu.d6}d6`;
  if (rollMenu.d4 > 0) helpDicesFormula += `+ ${rollMenu.d4}d4`;
  return helpDicesFormula;
}

function _collectCoreRollModifiers(rollMenu) {
  let formulaModifiers = "";
  if (rollMenu.versatile) formulaModifiers = "+ 2";
  if (rollMenu.flanks) formulaModifiers += "+ 2"
  if (rollMenu.halfCover) formulaModifiers += "- 2"
  if (rollMenu.tqCover) formulaModifiers += "- 5"
  return formulaModifiers;
}

function _determineRollLevel(rollMenu) {
  const disLevel = rollMenu.dis;
  const advLevel = rollMenu.adv;
  return advLevel - disLevel;
}

function _hasAnyRolls(rolls) {
  if (rolls.core.length !== 0) return true;
  if (rolls.formula.length !== 0) return true;
  return false;
}

function _resetRollMenu(rollMenu, owner) {
  rollMenu.dis = 0
  rollMenu.adv = 0;
  rollMenu.d8 = 0;
  rollMenu.d6 = 0;
  rollMenu.d4 = 0;
  if (rollMenu.free) rollMenu.free = false;
  if (rollMenu.versatile) rollMenu.versatile = false;
  if (rollMenu.flanks) rollMenu.flanks = false;
  if (rollMenu.halfCover) rollMenu.halfCover = false;
  if (rollMenu.tqCover) rollMenu.tqCover = false;
  if (rollMenu.initiative) rollMenu.initiative = false;
  owner.update({['flags.dc20rpg.rollMenu']: rollMenu});
}

function _resetEnhancements(item, actor) {
  if (item.system.usesWeapon?.weaponAttack) {
    const itemId = item.system.usesWeapon.weaponId;
    const usedItem = actor.items.get(itemId);
    if (usedItem) _resetEnhancements(usedItem);
  }
  const enhancements = Object.fromEntries(Object.entries(item.system.enhancements)
  .map(([key, enh]) => { 
    enh.number = 0; 
    return [key, enh];
  }));
  item.update({["system.enhancements"]: enhancements});
}

function _prepareConditionals(conditionals, item) {
  const prepared = [];
  conditionals.forEach(conditional => {
    if (itemMeetsUseConditions(conditional.useFor, item)) {
      prepared.push({
        condition: conditional.condition,
        bonus: conditional.bonus,
        name: conditional.name
      });
    }
  });
  return prepared;
}