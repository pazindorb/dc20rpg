import { canSubtractBasicResource, respectUsageCost, revertUsageCostSubtraction, subtractBasicResource } from "./costManipulator.mjs";
import { generateKey, getLabelFromKey, getValueFromPath } from "../utils.mjs";
import { sendDescriptionToChat, sendRollsToChat } from "../../chat/chat-message.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { applyMultipleCheckPenalty } from "../rollLevel.mjs";
import { prepareHelpAction } from "./actions.mjs";
import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";
import { runTemporaryItemMacro, runTemporaryMacro } from "../macros.mjs";
import { evaluateFormula } from "../rolls.mjs";
import { itemDetailsToHtml } from "../items/itemDetails.mjs";
import { effectsToRemovePerActor } from "../effects.mjs";
import { prepareCheckFormulaAndRollType } from "./attrAndSkills.mjs";
import { emitSystemEvent } from "../sockets.mjs";

//==========================================
//             Roll From Sheet             =
//==========================================
export async function rollFromSheet(actor, details) {
  return await _rollFromFormula(details.roll, details, actor, true);
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
async function _rollFromFormula(formula, details, actor, sendToChat) { // TODO SHOULD WE MOVE ROLL MENU TO SYSTEM? I THINK WE SHOULD
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
  if (["attackCheck", "spellCheck", "attributeCheck", "skillCheck", "initiative"].includes(details.type)) await runEventsFor("rollCheck", actor);
  if (["save"].includes(details.type)) await runEventsFor("rollSave", actor);

  // 3. Prepare Core Roll Formula
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  // If the formula contains d20 we want to replace it.
  if (formula.includes("d20")) formula = formula.replaceAll("d20", d20roll);

  const globalMod = _extractGlobalModStringForType(details.type, actor);
  const helpDices = _collectHelpDices(rollMenu);
  formula += " " + globalMod.value + helpDices;

  let source = details.type === "save" ? "Save Formula" : "Check Formula";
  if (globalMod.source !== "") source += ` + ${globalMod.source}`;
  if (helpDices !== "") source += ` + Help Dice`;

  // 4. Roll Formula
  const roll = _prepareCoreRoll(formula, rollData, details.label)
  await _evaluateCoreRollAndMarkCrit(roll, {rollLevel: rollLevel, rollMenu: rollMenu});
  roll.source = source;

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
  if (actor.inCombat && ["attributeCheck", "attackCheck", "spellCheck", "skillCheck"].includes(details.type)) {
    applyMultipleCheckPenalty(actor, details.checkKey, rollMenu);
  }
  _runCritAndCritFailEvents(roll, actor, rollMenu)
  if (!details.initiative) _respectNat1Rules(roll, actor, details.type, null, rollMenu);
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

  // 0. Subtract Cost
  const costsSubracted = rollMenu.free ? true : await respectUsageCost(actor, item);
  if (!costsSubracted) {
    resetEnhancements(item, actor);
    resetRollMenu(rollMenu, item);
    return;
  }

  // 1. Add changes related to ammo
  if (item.ammoId) {
    const ammo = actor.items.get(item.ammoId);
    if (ammo) {
      item.system.rollRequests = foundry.utils.mergeObject(item.system.rollRequests, ammo.system.rollRequests);
      item.system.againstStatuses = foundry.utils.mergeObject(item.system.againstStatuses, ammo.system.againstStatuses);
      item.system.formulas = foundry.utils.mergeObject(item.system.formulas, ammo.system.formulas);
      item.system.macros = foundry.utils.mergeObject(item.system.macros, ammo.system.macros);
      item.overridenDamage = ammo.system.overridenDamageType;
    }
  }
  
  // 2. Pre Item Roll Events and macros
  await runTemporaryItemMacro(item, "preItemRoll", actor);
  await _runEnancementsMacro(item, "preItemRoll", actor);
  const actionType = item.system.actionType;
  if (actionType === "attack") await runEventsFor("attack", actor);
  if (actionType === "check") await runEventsFor("rollCheck", actor);
  await runEventsFor("rollItem", actor);

  // 3. Item Roll
  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = await item.getRollData();
  const rolls = await _evaluateItemRolls(actionType, actor, item, rollData, rollLevel);
  if (actionType === "help") {
    let ignoreMHP = item.system.help?.ignoreMHP;
    if (!ignoreMHP) ignoreMHP = rollMenu.ignoreMCP;
    prepareHelpAction(actor, {ignoreMHP: ignoreMHP, subtract: item.system.help?.subtract, doNotExpire: item.system.help?.doNotExpire});
  }

  // 4. Post Item Roll
  await runTemporaryItemMacro(item, "postItemRoll", actor, {rolls: rolls});
  await _runEnancementsMacro(item, "postItemRoll", actor, {rolls: rolls});

  // 5. Send chat message
  if (sendToChat && !item.doNotSendToChat) {
    const messageDetails = _prepareMessageDetails(item, actor, actionType, rolls);

    if (!actionType) {
      sendDescriptionToChat(actor, messageDetails, item);
    }
    else if (actionType === "help") {
      messageDetails.rollTitle += " - Help Action";
      sendDescriptionToChat(actor, messageDetails, item);
    }
    else {
      messageDetails.rollLevel = rollLevel;
      sendRollsToChat(rolls, actor, messageDetails, true, item);
    }
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

  if (actionType === "attack") {
    coreRoll = await _evaluateAttackRoll(actor, item, evalData);
    evalData.attackCheckType = item.system.attackFormula.checkType;
    evalData.attackRangeType = item.system.attackFormula.rangeType;
  }
  if (actionType === "check") {
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
  const source = {value: "Attack Formula"};
  evalData.rollModifiers = _collectCoreRollModifiers(evalData.rollMenu, source, item.allEnhancements);
  evalData.critThreshold = item.system.attackFormula.critThreshold;
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, evalData, source);
  const label = getLabelFromKey(item.system.attackFormula.checkType, CONFIG.DC20RPG.DROPDOWN_DATA.attackTypes); 
  const coreRoll = _prepareCoreRoll(coreFormula, evalData.rollData, label);

  await _evaluateCoreRollAndMarkCrit(coreRoll, evalData);
  coreRoll.source = source.value;
  return coreRoll;
}

async function _evaluateCheckRoll(actor, item, evalData) {
  evalData.rollMenu = item.flags.dc20rpg.rollMenu;
  const source = {value: "Check Formula"};
  evalData.rollModifiers = _collectCoreRollModifiers(evalData.rollMenu, source, item.allEnhancements);
  const checkKey = item.checkKey;
  const coreFormula = _prepareCheckFormula(actor, checkKey, evalData, source);
  const label = getLabelFromKey(checkKey, CONFIG.DC20RPG.ROLL_KEYS.allChecks);
  const coreRoll = _prepareCoreRoll(coreFormula, evalData.rollData, label);

  await _evaluateCoreRollAndMarkCrit(coreRoll, evalData);
  coreRoll.source = source.value;
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
  let rollLevel = evalData.rollLevel;
  const rollMenu = evalData.rollMenu;
  const critThreshold = evalData.critThreshold;

  const rollOptions = {
    maximize: false,
    minimize: false
  };

  // Apply Auto Roll Outcome 
  if (rollMenu.autoCrit && !rollMenu.autoFail) {
    rollOptions.maximize = true;
    roll.terms[0].modifiers = [];
    roll.terms[0].number = 1;
    rollLevel = 1;
    roll.label += " (Auto Crit)";
  }
  if (!rollMenu.autoCrit && rollMenu.autoFail) {
    rollOptions.minimize = true;
    roll.terms[0].modifiers = [];
    roll.terms[0].number = 1;
    rollLevel = 1;
    roll.label += " (Auto Fail)";
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
  if (rollMenu.d8 !== 0) helpDicesFormula += `+ ${rollMenu.d8}d8`;
  if (rollMenu.d6 !== 0) helpDicesFormula += `+ ${rollMenu.d6}d6`;
  if (rollMenu.d4 !== 0) helpDicesFormula += `+ ${rollMenu.d4}d4`;
  return helpDicesFormula;
}

function _collectCoreRollModifiers(rollMenu, source, enhancements) {
  let formulaModifiers = "";
  if (rollMenu.versatile) {
    formulaModifiers = "+ 2";
    source.value += " + Versatile"
  }
  if (rollMenu.flanks) {
    formulaModifiers += "+ 2"
    source.value += " + Flanked"
  }
  if (rollMenu.halfCover) {
    formulaModifiers += "- 2"
    source.value += " - Half Cover"
  }
  if (rollMenu.tqCover) {
    formulaModifiers += "- 5"
    source.value += " - 3/4 Cover"
  }
  if (enhancements) {
    enhancements.values().forEach(enh => {
      const enhMod = enh.modifications;
      if (enhMod.modifiesCoreFormula && enhMod.coreFormulaModification) {
        for (let i = 0; i < enh.number; i++) {
          const modification = (enhMod.coreFormulaModification.includes("+") || enhMod.coreFormulaModification.includes("-")) ? enhMod.coreFormulaModification : ` + ${enhMod.coreFormulaModification}`
          formulaModifiers += modification
          source.value += ` + ${enh.name}`
        }
      };
    })
  }
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
  const formulas = _collectAllFormulasForAnItem(item, enhancements);

  // Check if damage type should be overriden
  let overridenDamage = item.overridenDamage || "";
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
        category: formula.category,
        dontMerge: formula.dontMerge,
        overrideDefence: formula.overrideDefence
      }
      roll.clear.clear = true;
      roll.modified.clear = false;
      roll.clear.modifierSources = formula.enhName || "Base Value";
      roll.modified.modifierSources = modified.modifierSources;

      if (formula.each5) roll.modified.each5Formula = formula.each5Formula;
      if (formula.fail) roll.modified.failFormula = formula.failFormula;

      switch (formula.category) {
        case "damage":
          if (overridenDamage) formula.type = overridenDamage;
          let damageTypeLabel = getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes);
          commonData.label = "Damage - " + damageTypeLabel;
          commonData.type = formula.type;
          commonData.typeLabel = damageTypeLabel;
          _fillCommonRollProperties(roll, commonData);
          damageRolls.push(roll);
          break;
        case "healing":
          let healingTypeLabel = getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes);
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
          roll.modified.perTarget = formula.perTarget;
          otherRolls.push(roll);
          break;
      }
    }
    return [...damageRolls, ...healingRolls, ...otherRolls];
  }
  return [];
}

function _collectAllFormulasForAnItem(item, enhancements) {
  // Item formulas
  let formulas = item.system.formulas;

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
  if (!enhancements) enhancements = item.allEnhancements;
  if (enhancements) {
    let fromEnhancements = {};
    enhancements.values().forEach(enh => {
      for (let i = 0; i < enh.number; i++) {
        const enhMod = enh.modifications;
        // Add formula from enhancement;
        if (enhMod.addsNewFormula) {
          let key = "";
          do {
            key = generateKey();
          } while (formulas[key]);
          fromEnhancements[key] = enhMod.formula;
          fromEnhancements[key].enhName = enh.name;
        }
      }

    })
    formulas = {...formulas, ...fromEnhancements};
  }

  return formulas;
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
  let modifierSources = formula.enhName || "Base Value";

  // Apply active enhancements
  if (enhancements) {
    enhancements.values().forEach(enh => {
      const enhMod = enh.modifications;
      if (enhMod.hasAdditionalFormula && enhMod.additionalFormula) {
        for (let i = 0; i < enh.number; i++) {
          const additional = (enhMod.additionalFormula.includes("+") || enhMod.additionalFormula.includes("-")) ? enhMod.additionalFormula : ` + ${enhMod.additionalFormula}`
          rollFormula += additional;
          if (failFormula !== null) failFormula += additional;
          modifierSources += ` + ${enh.name}`;
        }
      }
    })
  }

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

function _prepareCheckFormula(actor, checkKey, evalData, source) {
  const rollLevel = evalData.rollLevel;
  const helpDices = evalData.helpDices;
  const rollModifiers = evalData.rollModifiers;

  const [d20roll, rollType] = prepareCheckFormulaAndRollType(checkKey, rollLevel);
  const globalMod = _extractGlobalModStringForType(rollType, actor);
  
  if (globalMod.source !== "") source.value += ` + ${globalMod.source}`;
  if (helpDices !== "") source.value += ` + Help Dice`;
  return `${d20roll} ${globalMod.value} ${helpDices} ${rollModifiers}`;
}

function _prepareAttackFromula(actor, attackFormula, evalData, source) {
  const rollLevel = evalData.rollLevel;
  const helpDices = evalData.helpDices;
  const rollModifiers = evalData.rollModifiers;

  // We need to consider advantages and disadvantages
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
  const formulaMod = attackFormula.formulaMod;
  const rollType = attackFormula.checkType === "attack" ? "attackCheck" : "spellCheck";
  const globalMod = _extractGlobalModStringForType(rollType, actor);
  
  if (globalMod.source !== "") source.value += ` + ${globalMod.source}`;
  if (helpDices !== "") source.value += ` + Help Dice`;
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
    againstStatuses: _prepareAgainstStatuses(item),
    rollRequests: _prepareRollRequests(item),
    applicableEffects: _prepareEffectsFromItems(item, item.system.effectsConfig?.addToChat) // addToChat left for BACKWARD COMPATIBILITY - remove in the future
  };

  if (actionType === "attack") {
    messageDetails.targetDefence = _prepareTargetDefence(item);
    messageDetails.halfDmgOnMiss = item.system.attackFormula.halfDmgOnMiss;
    messageDetails.skipBonusDamage = item.system.attackFormula.skipBonusDamage;
    messageDetails.canCrit = true;
  }
  if (actionType === "check") {
    messageDetails.checkDetails = _prepareCheckDetails(item, rolls.core, rolls.formula);;
    messageDetails.canCrit = item.system.check.canCrit;
  }
  return messageDetails;
}

function _prepareTargetDefence(item) {
  let targetDefence = item.system.attackFormula.targetDefence;
  item.activeEnhancements.values().forEach(enh => {
    if (enh.modifications.overrideTargetDefence && enh.modifications.targetDefenceType) {
      targetDefence = enh.modifications.targetDefenceType;
    }
  })
  return targetDefence;
}

function _prepareAgainstStatuses(item) {
  const againstStatuses = item.system.againstStatuses ? Object.values(item.system.againstStatuses) : [];
  item.allEnhancements.values().forEach(enh => {
    if (enh.number > 0) {
      if (enh.modifications.addsAgainstStatus && enh.modifications.againstStatus?.id) {
        againstStatuses.push(enh.modifications.againstStatus);
      }
    }
  });
  return againstStatuses;
}

function _prepareRollRequests(item) {
  const saves = {};
  const contests = {};
  const rollRequests = item.system.rollRequests;
  if (!rollRequests) return {saves: {}, contests: {}};

  // From the item itself
  for (const request of Object.values(rollRequests)) {
    if (request?.category === "save") {
      const requestKey = `save#${request.dc}#${request.saveKey}`;
      saves[requestKey] = request;
      saves[requestKey].label = getLabelFromKey(request.saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes);
    }
    if (request?.category === "contest") {
      const requestKey = `contest#${request.contestedKey}`;
      contests[requestKey] = request;
      contests[requestKey].label = getLabelFromKey(request.contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests);
    }
  }

  // From the active enhancements
  const enhancements = item.allEnhancements;
  for (const enh of enhancements.values()) {
    if (enh.number && enh.modifications.addsNewRollRequest) {
      const request = enh.modifications.rollRequest;
      if (request?.category === "save") {
        const requestKey = `save#${request.dc}#${request.saveKey}`;
        saves[requestKey] = request;
        saves[requestKey].label = getLabelFromKey(request.saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes);
      }
      if (request?.category === "contest") {
        const requestKey = `contest#${request.contestedKey}`;
        contests[requestKey] = request;
        contests[requestKey].label = getLabelFromKey(request.contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests);
      }
    }
  }
  return {saves: saves, contests: contests};
}

function _prepareCheckDetails(item) {
  const check = item.system.check
  const checkKey = check.checkKey;
  return {
    rollLabel: getLabelFromKey(checkKey, CONFIG.DC20RPG.ROLL_KEYS.checks),
    checkDC: item.system.check.checkDC,
    againstDC: item.system.check.againstDC,
    actionType: item.system.actionType,
  }
}

function _prepareEffectsFromItems(item, forceAddToChat) {
  const effects = [];
  // From Item itself
  if (item.effects.size !== 0) {
    item.effects.forEach(effect => {
      const addToChat = effect.system.addToChat;
      if (forceAddToChat || addToChat) {
        const requireEnhancement = effect.system.requireEnhancement;
        if (requireEnhancement) {
          const number = item.allEnhancements.get(requireEnhancement)?.number
          if (number > 0) effects.push(effect.toObject());
        }
        else {
          effects.push(effect.toObject());
        }
      }
    });
  }
  // From Active Enhancements 
  for (const enh of item.allEnhancements.values()) {
    if (enh.number > 0) {
      const effectData = enh.modifications.addsEffect;
      if (effectData) effects.push(effectData);
    }
  }
  return effects;
}

function _prepareConditionals(conditionals, item) {
  const prepared = [];
  conditionals.forEach(conditional => {
    if (itemMeetsUseConditions(conditional.useFor, item)) {
      prepared.push(conditional);
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
    if (actor.inCombat) applyMultipleCheckPenalty(actor, checkKey, rollMenu);
    _respectNat1Rules(coreRoll, actor, checkKey, item, rollMenu);
  }
  _addSpellToSustain(item, actor);
  _runCritAndCritFailEvents(coreRoll, actor, rollMenu)
  resetRollMenu(rollMenu, item);
  resetEnhancements(item, actor, true);
  _toggleItem(item);
  _deleteEffectsMarkedForRemoval(actor);
  reenablePreTriggerEvents();
  delete item.overridenDamage;
}

export function resetRollMenu(rollMenu, owner) {
  rollMenu.dis = 0
  rollMenu.adv = 0;
  rollMenu.apCost = 0;
  rollMenu.gritCost = 0;
  rollMenu.d8 = 0;
  rollMenu.d6 = 0;
  rollMenu.d4 = 0;
  if (rollMenu.free) rollMenu.free = false;
  if (rollMenu.versatile) rollMenu.versatile = false;
  if (rollMenu.ignoreMCP) rollMenu.ignoreMCP = false;
  if (rollMenu.flanks) rollMenu.flanks = false;
  if (rollMenu.halfCover) rollMenu.halfCover = false;
  if (rollMenu.tqCover) rollMenu.tqCover = false;
  if (rollMenu.initiative) rollMenu.initiative = false;
  if (rollMenu.autoCrit) rollMenu.autoCrit = false;
  if (rollMenu.autoFail) rollMenu.autoFail = false;
  owner.update({['flags.dc20rpg.rollMenu']: rollMenu});
}

export function resetEnhancements(item, actor, itemRollFinished) {
  if (!item.allEnhancements) return;
  
  item.allEnhancements.forEach((enh, key) => { 
    if (enh.number !== 0) {
      const enhOwningItem = actor.items.get(enh.sourceItemId);
      if (enhOwningItem) {
        runTemporaryItemMacro(enhOwningItem, "enhancementReset", actor, {enhancement: enh, itemRollFinished: itemRollFinished, enhKey: key});
        enhOwningItem.update({[`system.enhancements.${key}.number`]: 0});
      }
    }
  });
}

function _runCritAndCritFailEvents(coreRoll, actor, rollMenu) {
  if (!coreRoll) return;
  if (coreRoll.fail && actor.inCombat && !rollMenu.autoFail) {
    runEventsFor("critFail", actor);
  }
  if (coreRoll.crit && actor.inCombat && !rollMenu.autoCrit) {
    runEventsFor("crit", actor);
  }
}

function _respectNat1Rules(coreRoll, actor, rollType, item, rollMenu) {
  if (coreRoll.fail && actor.inCombat) {
    if (["attackCheck", "spellCheck", "att", "spe"].includes(rollType) && !rollMenu.autoFail) {
      sendDescriptionToChat(actor, {
        rollTitle: "Critical Fail - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you before the start of your next turn.",
      });
      actor.toggleStatusEffect("exposed", { active: true, extras: {untilFirstTimeTriggered: true, untilTargetNextTurnStart: true} });
    }
  }

  if (coreRoll.fail && ["spellCheck", "spe"].includes(rollType)) {
    if (item && !item.flags.dc20rpg.rollMenu.free) {
      delete actor.subtractOperation.resources?.before?.ap;
      revertUsageCostSubtraction(actor);
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
  actor.flags.dc20rpg.effectsToRemoveAfterRoll.forEach(toRemove => effectsToRemovePerActor(toRemove));
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

async function _runEnancementsMacro(item, macroKey, actor, additionalFields) {
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

async function _addSpellToSustain(item, actor) {
  if (item.system.duration.type !== "sustain") return;

  const activeCombat = game.combats.active;
  const notInCombat = !(activeCombat && activeCombat.started && actor.inCombat);
  if (notInCombat) return;

  const currentSustain = actor.system.sustain;
  currentSustain.push({
    name: item.name,
    img: item.img,
    itemId: item.id,
    description: item.system.description
  })
  await actor.update({[`system.sustain`]: currentSustain});
}