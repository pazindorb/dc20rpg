import { DC20RPG } from "../config.mjs";
import { canSubtractBasicResource, respectUsageCost, revertUsageCostSubtraction, subtractBasicResource } from "./costManipulator.mjs";
import { getLabelFromKey, getValueFromPath } from "../utils.mjs";
import { sendDescriptionToChat, sendEffectRemovedMessage, sendRollsToChat } from "../../chat/chat-message.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { hasStatusWithId } from "../../statusEffects/statusUtils.mjs";
import { applyMultipleCheckPenalty } from "../rollLevel.mjs";
import { prepareHelpAction } from "./actions.mjs";
import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";
import { runTemporaryMacro } from "../macros.mjs";
import { collectAllFormulasForAnItem } from "../items/itemRollFormulas.mjs";
import { evaluateFormula } from "../rolls.mjs";
import { itemDetailsToHtml } from "../items/itemDetails.mjs";
import { getActorFromIds } from "./tokens.mjs";
import { getEffectFrom } from "../effects.mjs";


//==========================================
//             Roll From Sheet             =
//==========================================
export async function rollFromSheet(actor, details) {
  return await _rollFromFormula(details.roll, details, actor, true);
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
      type: details.type,
      checkKey: details.checkKey
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

  // 1. Subtract Cost
  if (details.costs) {
    for (const cost of details.costs) {
      if (canSubtractBasicResource(cost.key, actor, cost.value)) {
        subtractBasicResource(cost.key, actor, cost.value, "true");
      }
      else return;
    }
  }

  // 2. Pre Item Roll Events
  if (["attackCheck", "spellCheck", "attributeCheck", "skillCheck"].includes(details.type)) await runEventsFor("rollCheck", actor);
  if (["save"].includes(details.type)) await runEventsFor("rollSave", actor);

  // 3. Prepare Core Roll Formula
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  // If the formula contains d20 we want to replace it.
  if (formula.includes("d20")) formula = formula.replaceAll("d20", d20roll);

  const globalMod = _extractGlobalModStringForType(details.type, actor);
  const helpDices = _collectHelpDices(rollMenu);
  formula += " " + globalMod.value + helpDices;

  // 4. Roll Formula
  const roll = _prepareCoreRoll(formula, rollData, details.label)
  await _evaluateCoreRollAndMarkCrit(roll, {rollLevel: rollLevel, rollMenu: rollMenu});

  // 5. Send chat message
  if (sendToChat) {
    const label = details.label || `${actor.name} : Roll Result`;
    const rollTitle = details.rollTitle || label;
    const messageDetails = {
      label: label,
      image: actor.img,
      description: details.description,
      against: details.against,
      rollTitle: rollTitle,
      rollLevel: rollLevel
    };
    sendRollsToChat({core: roll}, actor, messageDetails, false);
  }

  // 6. Cleanup
  if (_inCombat(actor) && ["attributeCheck", "attackCheck", "spellCheck", "skillCheck"].includes(details.type)) {
    applyMultipleCheckPenalty(actor, details.checkKey, rollMenu);
  }
  _runCritAndCritFailEvents(roll, actor, rollMenu)
  _respectNat1Rules(roll, actor, details.type, null, rollMenu);
  resetRollMenu(rollMenu, actor);
  _deleteEffectsMarkedForRemoval(actor);
  reenablePreTriggerEvents();

  // 7. Return Core Roll
  return roll;
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
export async function rollFromItem(itemId, actor, sendToChat=true) {
  if (!actor) return;
  const item = actor.items.get(itemId);
  if (!item) return;

  const rollMenu = item.flags.dc20rpg.rollMenu;
  const actionType = item.system.actionType;

  // 1. Subtract Cost
  const costsSubracted = rollMenu.free ? true : await respectUsageCost(actor, item);
  if (!costsSubracted) {
    resetEnhancements(item, actor);
    resetRollMenu(rollMenu, item);
    return;
  }
  
  // 2. Pre Item Roll Events and macros
  await runTemporaryMacro(item, "preItemRoll", actor);
  if (["dynamic", "attack"].includes(actionType)) await runEventsFor("attack", actor);
  if (["check", "contest"].includes(actionType)) await runEventsFor("rollCheck", actor);
  await runEventsFor("rollItem", actor);

  // 3. Item Roll
  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = await item.getRollData();
  const rolls = await _evaluateItemRolls(actionType, actor, item, rollData, rollLevel);
  if (actionType === "help") prepareHelpAction(actor, item.system.special?.ignoreMHP);

  // 4. Post Item Roll
  await runTemporaryMacro(item, "postItemRoll", actor, {rolls: rolls});

  // 5. Send chat message
  if (sendToChat && !item.doNotSendToChat) {
    const messageDetails = _prepareMessageDetails(item, actor, actionType, rolls);

    if (!actionType) {
      sendDescriptionToChat(actor, messageDetails, itemId);
    }
    else if (actionType === "help") {
      messageDetails.rollTitle += " - Help Action";
      sendDescriptionToChat(actor, messageDetails, itemId);
    }
    else {
      messageDetails.rollLevel = rollLevel;
      sendRollsToChat(rolls, actor, messageDetails, true, itemId);
    }
    // await runEventsFor("chatMessageCreation", actor); - do it right, maybe with item id?
  }

  // 6. Cleanup
  _finishRoll(actor, item, rollMenu, rolls.core);
  if (item.deleteAfter) item.delete();

  // 7. Return Core Roll
  return rolls.core;
}

//=======================================
//           EVALUATE ROLLS             =
//=======================================
async function _evaluateItemRolls(actionType, actor, item, rollData, rollLevel) {
  let coreRoll = null;
  let formulaRolls = [];

  const evalData = {
    rollData: rollData,
    rollLevel: rollLevel,
    helpDices: _collectHelpDices(item.flags.dc20rpg.rollMenu)
  }

  if (["attack", "dynamic"].includes(actionType)) {
    coreRoll = await _evaluateAttackRoll(actor, item, evalData);
    evalData.attackCheckType = item.system.attackFormula.checkType;
    evalData.attackRangeType = item.system.attackFormula.rangeType;
  }
  if (["check", "contest"].includes(actionType)) {
    coreRoll = await _evaluateCheckRoll(actor, item, evalData);
  }
  formulaRolls = await _evaluateFormulaRolls(item, actor, evalData);
  return {
    core: coreRoll,
    formula: formulaRolls
  }
}

async function _evaluateAttackRoll(actor, item, evalData) {
  evalData.rollMenu = item.flags.dc20rpg.rollMenu;
  evalData.rollModifiers = _collectCoreRollModifiers(evalData.rollMenu);
  evalData.critThreshold = item.system.attackFormula.critThreshold;
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, evalData);
  const label = getLabelFromKey(item.system.attackFormula.checkType, DC20RPG.attackTypes); 
  const coreRoll = _prepareCoreRoll(coreFormula, evalData.rollData, label);

  await _evaluateCoreRollAndMarkCrit(coreRoll, evalData);
  return coreRoll;
}

async function _evaluateCheckRoll(actor, item, evalData) {
  evalData.rollMenu = item.flags.dc20rpg.rollMenu;
  const checkKey = item.checkKey;
  const coreFormula = _prepareCheckFormula(actor, checkKey, evalData);
  const label = getLabelFromKey(checkKey, DC20RPG.checks);
  const coreRoll = _prepareCoreRoll(coreFormula, evalData.rollData, label);

  await _evaluateCoreRollAndMarkCrit(coreRoll, evalData);
  return coreRoll;
}

async function _evaluateFormulaRolls(item, actor, evalData) {
  const formulaRolls = _prepareFormulaRolls(item, actor, evalData);
  for (let i = 0; i < formulaRolls.length; i++) {
    const roll = formulaRolls[i];
    await roll.clear.evaluate();
    await roll.modified.evaluate();

    // We want to evaluate each5 and fail formulas in advance
    if (roll.modified.each5Formula) {
      const each5Roll = await evaluateFormula(roll.modified.each5Formula, evalData.rollData, true);
      if (each5Roll) roll.modified.each5Roll = each5Roll;
    }
    if (roll.modified.failFormula) {
      const failRoll = await evaluateFormula(roll.modified.failFormula, evalData.rollData, true);
      if (failRoll) roll.modified.failRoll = failRoll;
    }
  }
  return formulaRolls;
}

async function _evaluateCoreRollAndMarkCrit(roll, evalData) {
  if (!roll) return;
  const rollLevel = evalData.rollLevel;
  const rollMenu = evalData.rollMenu;
  const critThreshold = evalData.critThreshold;

  const rollOptions = {
    maximize: false,
    minimize: false
  };

  // Apply Auto Roll Outcome 
  if (rollMenu.autoCrit && !rollMenu.autoFail) {
    rollOptions.maximize = true;
    roll.label += " (Auto Crit)"
  }
  if (!rollMenu.autoCrit && rollMenu.autoFail) {
    rollOptions.minimize = true;
    roll.label += " (Auto Fail)"
  }

  // Roll
  await roll.evaluate(rollOptions);
  roll.flatDice = roll.dice[0].total; // We will need that later

  // Determine crit of crit fail
  roll.crit = false;
  roll.fail = false;
  let critNo = 0;
  let failNo = 0;

  // Only d20 can crit
  roll.terms.forEach(term => {
    if (term.faces === 20) {
      const fail = 1;
      const crit = critThreshold || 20;

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

//=======================================
//            PREPARE ROLLS             =
//=======================================
function _prepareCoreRoll(coreFormula, rollData, label) {
  if (coreFormula) {
    const coreRoll = new Roll(coreFormula, rollData);
    coreRoll.coreFormula = true;
    coreRoll.label = label;
    return coreRoll;
  }
  return null;
}

function _prepareFormulaRolls(item, actor, evalData) {
  const rollData = evalData.rollData;
  const enhancements = item.allEnhancements;
  const formulas = collectAllFormulasForAnItem(item, enhancements);

  // Check if damage type should be overriden
  let overridenDamage = "";
  if (enhancements) {
    enhancements.values().forEach(enh => {
      if (enh.number > 0) {
        const enhMod = enh.modifications;
        // Override Damage Type
        if (enhMod.overrideDamageType && enhMod.damageType) {
          overridenDamage = enhMod.damageType;
        };
      }
    })
  }

  if (formulas) {
    const damageRolls = [];
    const healingRolls = [];
    const otherRolls = [];

    for (const [key, formula] of Object.entries(formulas)) {
      const clearRollFromula = formula.formula; // formula without any modifications
      const modified = _modifiedRollFormula(formula, actor, enhancements, evalData, item); // formula with all enhancements applied
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
      roll.modified.ignoreDR = formula.ignoreDR;

      if (formula.each5) roll.modified.each5Formula = formula.each5Formula;
      if (formula.fail) roll.modified.failFormula = formula.failFormula;

      switch (formula.category) {
        case "damage":
          if (overridenDamage) formula.type = overridenDamage;
          let damageTypeLabel = getLabelFromKey(formula.type, DC20RPG.damageTypes);
          commonData.label = "Damage - " + damageTypeLabel;
          commonData.type = formula.type;
          commonData.typeLabel = damageTypeLabel;
          _fillCommonRollProperties(roll, commonData);
          damageRolls.push(roll);
          break;
        case "healing":
          let healingTypeLabel = getLabelFromKey(formula.type, DC20RPG.healingTypes);
          commonData.label = "Healing - " + healingTypeLabel;
          commonData.type = formula.type;
          commonData.typeLabel = healingTypeLabel;
          _fillCommonRollProperties(roll, commonData);
          healingRolls.push(roll);
          break;
        case "other":
          commonData.label = formula.label || "Other Roll";
          _fillCommonRollProperties(roll, commonData);
          // We want only modified rolls
          roll.clear = new Roll("0", rollData);
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

function _modifiedRollFormula(formula, actor, enhancements, evalData, item) {
  let rollFormula = formula.formula;
  let failFormula = formula.fail ? formula.failFormula : null;
  let modifierSources = "Base Value";

  // Enhancements
  let shouldIgnoreDR = item.system.special?.ignoreDR;
  // Apply active enhancements
  if (enhancements) {
    enhancements.values().forEach(enh => {
      if (enh.number > 0 && enh.modifications.ignoreDR) shouldIgnoreDR = true;
      if (enh.modifications.hasAdditionalFormula) {
        for (let i = 0; i < enh.number; i++) {
          rollFormula += ` + ${enh.modifications.additionalFormula}`;
          if (failFormula !== null) failFormula += ` + ${enh.modifications.additionalFormula}`;
          modifierSources += ` + ${enh.name}`;
        }
      }
    })
  }
  formula.ignoreDR = shouldIgnoreDR;

  // Global Formula Modifiers
  const attackCheckType = evalData.attackCheckType;
  const rangeType = evalData.attackRangeType;
  let globalModKey = "";
  // Apply global modifiers (some buffs to damage or healing etc.)
  if (formula.category === "damage" && attackCheckType) {
    if (attackCheckType === "attack") globalModKey = `attackDamage.martial.${rangeType}`;
    if (attackCheckType === "spell") globalModKey = `attackDamage.spell.${rangeType}`;
  }
  else if (formula.category === "healing") globalModKey = "healing";
  
  const globalMod = _extractGlobalModStringForType(globalModKey, actor);
  if (globalMod.value) {
    rollFormula += ` + (${globalMod.value})`;
    if (failFormula !== null) failFormula += ` + (${globalMod.value})`;
    modifierSources += ` + ${globalMod.source}`;
  }

  if (failFormula !== null) formula.failFormula = failFormula;
  return {
    rollFormula: rollFormula,
    modifierSources: modifierSources
  };
}

function _prepareCheckFormula(actor, checkKey, evalData) {
  const rollLevel = evalData.rollLevel;
  const helpDices = evalData.helpDices;

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
  const globalMod = _extractGlobalModStringForType(rollType, actor);

  return `${d20roll} + ${modifier} ${globalMod.value} ${helpDices}`;
}

function _prepareAttackFromula(actor, attackFormula, evalData) {
  const rollLevel = evalData.rollLevel;
  const helpDices = evalData.helpDices;
  const rollModifiers = evalData.rollModifiers;

  // We need to consider advantages and disadvantages
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  const formulaMod = attackFormula.formulaMod;
  const rollType = attackFormula.checkType === "attack" ? "attackCheck" : "spellCheck";
  const globalMod = _extractGlobalModStringForType(rollType, actor);
  return `${d20roll} ${formulaMod} ${globalMod.value} ${helpDices} ${rollModifiers}`;
}

//=======================================
//           PREPARE DETAILS            =
//=======================================
function _prepareMessageDetails(item, actor, actionType, rolls) {
  const description = !item.system.statuses || item.system.statuses.identified
          ? item.system.description
          : "<b>Unidentified</b>";
  const itemDetails = !item.system.statuses || item.system.statuses.identified
          ? itemDetailsToHtml(item)
          : ""
  const conditionals = _prepareConditionals(actor.system.conditionals, item);

  const messageDetails = {
    itemId: item._id,
    image: item.img,
    description: description,
    details: itemDetails,
    rollTitle: item.name,
    actionType: actionType,
    conditionals: conditionals,
    showDamageForPlayers: game.settings.get("dc20rpg", "showDamageForPlayers"),
    areas: item.system.target?.areas,
    againstEffects: _prepareAgainstEffects(item)
  };

  if (item.system.effectsConfig?.addToChat) {
    messageDetails.applicableEffects = _prepareEffectsFromItems(item);
  }

  if (["dynamic", "attack"].includes(actionType)) {
    const coreRoll = rolls.core;
    messageDetails.rollTotal = coreRoll.total;
    messageDetails.targetDefence = item.system.attackFormula.targetDefence;
    messageDetails.halfDmgOnMiss = item.system.attackFormula.halfDmgOnMiss;
    messageDetails.canCrit = true;
    messageDetails.saveDetails =  _prepareDynamicSaveDetails(item);
  }
  if (["save"].includes(actionType)) {
    messageDetails.saveDetails = _prepareSaveDetails(item);
  }
  if (["check", "contest"].includes(actionType)) {
    messageDetails.checkDetails = _prepareCheckDetails(item, rolls.core, rolls.formula);;
    messageDetails.canCrit = item.system.check.canCrit;
  }
  return messageDetails;
}

function _prepareAgainstEffects(item) {
  const againstEffects = [];
  if (item.system?.againstEffect?.id) againstEffects.push(item.system.againstEffect);
  item.allEnhancements.values().forEach(enh => {
    if (enh.number > 0) {
      if (enh.modifications.addsAgainstEffect && enh.modifications.againstEffect?.id) {
        againstEffects.push(enh.modifications.againstEffect);
      }
    }
  });
  return againstEffects;
}

function _prepareDynamicSaveDetails(item) {
  const type = item.system.actionType === "dynamic" ? item.system.save.type : null;
  const dc = item.system.actionType === "dynamic" ? item.system.save.dc : null;
  const saveDetails = {
    dc: dc,
    type: type
  };
  // We can roll one save againt multiple effects
  const enhancements = item.allEnhancements;
  _overrideWithEnhancement(saveDetails, enhancements);

  saveDetails.label = getLabelFromKey(saveDetails.type, DC20RPG.saveTypes) + " Save";
  return saveDetails;
}

function _prepareSaveDetails(item) {
  const type = item.system.save.type;
  const dc = item.system.save.dc;
  const saveDetails = {
    dc: dc,
    type: type
  };
  // We can roll one save againt multiple effects
  const enhancements = item.allEnhancements;
  _overrideWithEnhancement(saveDetails, enhancements);
  
  saveDetails.label = getLabelFromKey(saveDetails.type, DC20RPG.saveTypes) + " Save";
  return saveDetails;
}

function _overrideWithEnhancement(saveDetails, enhancements) {
  if (enhancements) {
    enhancements.values().forEach(enh => {
      if (enh.number && enh.modifications.overrideSave) {
        saveDetails.type = enh.modifications.save.type;
        saveDetails.dc = enh.modifications.save.dc;
      }
    })
  }
}

function _prepareCheckDetails(item) {
  const check = item.system.check
  const checkKey = check.checkKey;
  const contestedKey = check.contestedKey;
  return {
    rollLabel: getLabelFromKey(checkKey, DC20RPG.checks),
    checkDC: item.system.check.checkDC,
    actionType: item.system.actionType,
    contestedKey: contestedKey,
    contestedLabel: getLabelFromKey(contestedKey, DC20RPG.contests),
  }
}

function _prepareEffectsFromItems(item) {
  if (item.effects.size === 0) return [];
  const effects = [];
  item.effects.forEach(effect => {
    const requireEnhancement = effect.flags.dc20rpg?.requireEnhancement;
    if (requireEnhancement) {
      const number = item.allEnhancements.get(requireEnhancement)?.number
      if (number > 0) effects.push(effect.toObject());
    }
    else {
      effects.push(effect.toObject());
    }
  });
  return effects;
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

//=======================================
//              FINISH ROLL             =
//=======================================
function _finishRoll(actor, item, rollMenu, coreRoll) {
  const checkKey = item.checkKey;
  if (checkKey) {
    if (_inCombat(actor)) applyMultipleCheckPenalty(actor, checkKey, rollMenu);
    _respectNat1Rules(coreRoll, actor, checkKey, item, rollMenu);
  }
  _runCritAndCritFailEvents(coreRoll, actor, rollMenu)
  _checkConcentration(item, actor);
  resetRollMenu(rollMenu, item);
  resetEnhancements(item, actor);
  _toggleItem(item);
  _deleteEffectsMarkedForRemoval(actor);
  reenablePreTriggerEvents();
}

export function resetRollMenu(rollMenu, owner) {
  rollMenu.dis = 0
  rollMenu.adv = 0;
  rollMenu.apCost = 0;
  rollMenu.d8 = 0;
  rollMenu.d6 = 0;
  rollMenu.d4 = 0;
  if (rollMenu.free) rollMenu.free = false;
  if (rollMenu.versatile) rollMenu.versatile = false;
  if (rollMenu.ignoreConcentration) rollMenu.ignoreConcentration = false;
  if (rollMenu.ignoreMCP) rollMenu.ignoreMCP = false;
  if (rollMenu.flanks) rollMenu.flanks = false;
  if (rollMenu.halfCover) rollMenu.halfCover = false;
  if (rollMenu.tqCover) rollMenu.tqCover = false;
  if (rollMenu.initiative) rollMenu.initiative = false;
  if (rollMenu.autoCrit) rollMenu.autoCrit = false;
  if (rollMenu.autoFail) rollMenu.autoFail = false;
  owner.update({['flags.dc20rpg.rollMenu']: rollMenu});
}

export function resetEnhancements(item, actor) {
  if (!item.allEnhancements) return;
  
  item.allEnhancements.forEach((enh, key) => { 
    if (enh.number !== 0) {
      const enhOwningItem = actor.items.get(enh.sourceItemId);
      if (enhOwningItem) enhOwningItem.update({[`system.enhancements.${key}.number`]: 0});
    }
  });
}

function _checkConcentration(item, actor) {
  const isConcentration = item.system.duration?.type === "concentration";
  const ignoreConcentration = item.flags.dc20rpg.rollMenu.ignoreConcentration;
  if (isConcentration && !ignoreConcentration) {
    let repleaced = "";
    let title = "Starts Concentrating";
    if (hasStatusWithId(actor, "deathsDoor")) {
      sendDescriptionToChat(actor, {
        rollTitle: "Concentraction Failed",
        image: actor.img,
        description: `You cannot concentrate when on Death's Door`,
      });
      return;
    }
    if (hasStatusWithId(actor, "concentration")) {
      repleaced = ' [It overrides your current concentration]';
      title = "Overrides Concentration"
    }
    sendDescriptionToChat(actor, {
      rollTitle: title,
      image: actor.img,
      description: `Starts concentrating on ${item.name}${repleaced}`,
    });
    actor.toggleStatusEffect("concentration", { active: true });
  }
}

function _runCritAndCritFailEvents(coreRoll, actor, rollMenu) {
  if (!coreRoll) return;
  if (coreRoll.fail && _inCombat(actor) && !rollMenu.autoFail) {
    runEventsFor("critFail", actor);
  }
  if (coreRoll.crit && _inCombat(actor) && !rollMenu.autoCrit) {
    runEventsFor("crit", actor);
  }
}

function _respectNat1Rules(coreRoll, actor, rollType, item, rollMenu) {
  if (coreRoll.fail && _inCombat(actor)) {
    // Only attack and not forced nat 1 should expose the attacker
    if (["attackCheck", "spellCheck", "att", "spe"].includes(rollType) && !rollMenu.autoFail) {
      sendDescriptionToChat(actor, {
        rollTitle: "Critical Fail - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you before the start of your next turn.",
      });
      actor.toggleStatusEffect("exposed", { active: true, extras: {untilFirstTimeTriggered: true, untilTargetNextTurnStart: true} });
    }

    if (["spellCheck", "spe"].includes(rollType)) {
      if (item && !item.flags.dc20rpg.rollMenu.free) revertUsageCostSubtraction(actor, item);
    }
  }
}

function _toggleItem(item) {
  if (item.system.toggle?.toggleable && item.system.toggle.toggleOnRoll) {
    item.update({["system.toggle.toggledOn"]: true});
  }
}

function _deleteEffectsMarkedForRemoval(actor) {
  if (!actor.flags.dc20rpg.effectsToRemoveAfterRoll) return;
  actor.flags.dc20rpg.effectsToRemoveAfterRoll.forEach(toRemove => {
    const actor = getActorFromIds(toRemove.actorId, toRemove.tokenId);
    if (actor) {
      const effect = getEffectFrom(toRemove.effectId, actor);
      const afterRoll = toRemove.afterRoll;
      if (effect) {
        if (afterRoll === "delete") {
          sendEffectRemovedMessage(actor, effect);
          effect.delete();
        }
        if (afterRoll === "disable") effect.disable();
      }
    }
  });
  actor.update({["flags.dc20rpg.effectsToRemoveAfterRoll"]: []}); // Clear effects to remove
} 

//=======================================
//            OTHER FUNCTIONS           =
//=======================================
function _determineRollLevel(rollMenu) {
  const disLevel = rollMenu.dis;
  const advLevel = rollMenu.adv;
  return advLevel - disLevel;
}

function _extractGlobalModStringForType(path, actor) {
  const globalModJson = getValueFromPath(actor.system.globalFormulaModifiers, path) || [];
  let globalMod = {
    value: "",
    source: ""
  };
  for(let json of globalModJson) {
    if (!json) continue;
    try {
      const mod = JSON.parse(`{${json}}`);
      globalMod.value += mod.value;
      if (globalMod.source === "") globalMod.source += `${mod.source}`
      else globalMod.source += ` + ${mod.source}`
    } catch (e) {
      console.warn(`Cannot parse global formula modifier json {${json}} with error: ${e}`)
    }
  }
  return globalMod;
}

function _inCombat(actor) {
  if (actor.inCombat) return true;
  else if (_companionCondition(actor, "initiative")) {
    return actor.companionOwner.inCombat;
  }
  return false;
}

function _companionCondition(actor, keyToCheck) {
	if (actor.type !== "companion") return false;
	if (!actor.companionOwner) return false;
	return getValueFromPath(actor, `system.shareWithCompanionOwner.${keyToCheck}`);
}