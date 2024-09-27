import { DC20RPG } from "../config.mjs";
import { respectUsageCost, revertUsageCostSubtraction, subtractAP } from "./costManipulator.mjs";
import { generateKey, getLabelFromKey, getValueFromPath } from "../utils.mjs";
import { sendDescriptionToChat, sendRollsToChat } from "../../chat/chat-message.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { hasStatusWithId } from "../../statusEffects/statusUtils.mjs";
import { applyMultipleCheckPenalty } from "../rollLevel.mjs";
import { getActions } from "./actions.mjs";
import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";


//==========================================
//             Roll From Sheet             =
//==========================================
export async function rollFromSheet(actor, details) {
  return await _rollFromFormula(details.roll, details, actor, true);
}

//==========================================
//            Roll From Actions            =
//==========================================
export function rollFromAction(actor, actionKey) {
  const action = getActions()[actionKey];
  if (!subtractAP(actor, action.apCost)) return;

  const details = {
    label: action.name,
    image: actor.img,
    rollTitle: action.label,
    sublabel: action.label,
    description: `@UUID[${action.description}]`,
    type: action.type,
    checkKey: action.checkKey
  }
  if (action.chatEffect) details.fullEffect = action.chatEffect; 

  if (action.applyEffect) {
    const effect = action.applyEffect;
    effect.origin= actor.uuid,
    actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }

  

  if (action.formula) return _rollFromFormula(action.formula, details, actor, true);
  else sendDescriptionToChat(actor, {
      rollTitle: action.name,
      image: actor.img,
      description: `@UUID[${action.description}]`,
      fullEffect: action.chatEffect ? action.chatEffect : null
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

  // We need to consider advantages and disadvantages
  let d20roll = "d20"
  if (rollLevel !== 0) d20roll = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;

  // If the formula contains d20 we want to replace it.
  if (formula.includes("d20")) formula = formula.replaceAll("d20", d20roll);

  const globalMod = _extractGlobalModStringForType(details.type, actor);
  const helpDices = _collectHelpDices(rollMenu);
  formula += " " + globalMod.value + helpDices;

  const rolls = {
    core: _prepareCoreRolls(formula, rollData, details.label)
  };
  const autoRollOutcome = _checkFormulaRollOutcome(actor, details.checkKey, details.type, details.baseAttribute);
  await _evaluateRollsAndMarkCrits(rolls.core, rollLevel, autoRollOutcome);
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
      rollTitle: rollTitle,
      rollLevel: rollLevel,
      fullEffect: details.fullEffect
    };
    sendRollsToChat(rolls, actor, messageDetails, false);
  }
  if (actor.inCombat && ["attributeCheck", "attackCheck", "spellCheck", "skillCheck"].includes(details.type)) {
    applyMultipleCheckPenalty(actor, details.checkKey);
  }
  _resetRollMenu(rollMenu, actor);
  _respectNat1Rules(rolls.winningRoll, actor, details.type);
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
  const costsSubracted = rollMenu.free ? true : await respectUsageCost(actor, item);
  if (!costsSubracted) return;

  // If no action type provided, just send description message
  if (!item.system.actionType) {
    sendDescriptionToChat(actor, {
      rollTitle: item.name,
      image: item.img,
      description: item.system.description,
    })
    if (item.deleteAfter) item.delete(); // Check if item was marked to removal
    return;
  }

  const actionType = item.system.actionType;
  if (["dynamic", "attack"].includes(actionType)) {
    await runEventsFor("attack", actor);
  }

  // Check if actor was refreshed
  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = await item.getRollData();
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
      showDamageForPlayers: game.settings.get("dc20rpg", "showDamageForPlayers"),
      rollLevel: rollLevel
    };

    // For non usable items we dont care about rolls
    if (!item.system.hasOwnProperty("attackFormula")) {
      sendRollsToChat(rolls, actor, messageDetails, false, itemId);
      return;
    }

    if (item.system.effectsConfig?.addToChat) messageDetails.applicableEffects = _prepareEffectsFromItems(item);

    // Details depending on action type
    if (["dynamic", "attack"].includes(actionType)) {
      const winningRoll = rolls.winningRoll;
      messageDetails.rollTotal = winningRoll.total;
      messageDetails.targetDefence = item.system.attackFormula.targetDefence;
      messageDetails.halfDmgOnMiss = item.system.attackFormula.halfDmgOnMiss;
      messageDetails.impact = item.system.properties?.impact?.active;
      messageDetails.saveDetails = _prepareDynamicSaveDetails(item);
      messageDetails.canCrit = true;
      const checkKey = item.system.attackFormula.checkType.substr(0, 3);
      if (actor.inCombat) applyMultipleCheckPenalty(actor, checkKey);
      _respectNat1Rules(rolls.winningRoll, actor, checkKey, item);
    }
    if (["save"].includes(actionType)) {
      messageDetails.saveDetails = _prepareSaveDetails(item);
    }
    if (["check", "contest"].includes(actionType)) {
      const checkDetails = _prepareCheckDetails(item, rolls.winningRoll, rolls.formula);
      messageDetails.checkDetails = checkDetails;
      messageDetails.canCrit = item.system.check.canCrit;
      if (actor.inCombat) applyMultipleCheckPenalty(actor, item.system.check.checkKey);
      _respectNat1Rules(rolls.winningRoll, actor, item.system.check.checkKey, item);
    }
    sendRollsToChat(rolls, actor, messageDetails, true, itemId);
  }
  _checkConcentration(item, actor);
  _resetRollMenu(rollMenu, item);
  _resetEnhancements(item, actor);
  reenablePreTriggerEvents();
  if (item.deleteAfter) item.delete(); // Check if item was marked to removal
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
  let attackCheckType = undefined;
  let attackRangeType = undefined;
  if (["dynamic", "attack"].includes(actionType)) {
    attackCheckType = item.system.attackFormula.checkType;
    attackRangeType = item.system.attackFormula.rangeType;
  };
  const formulaRolls = await _evaluateFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType, attackRangeType);
  return {
    core: coreRolls,
    formula: formulaRolls
  }
}

async function _evaluateAttackRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["attack", "dynamic"].includes(actionType)) return []; // We want to create attack rolls only for few types of roll
  const autoRollOutcome = _checkItemAutoRollOutcome(actor, item, actionType);
  const helpDices = _collectHelpDices(item.flags.dc20rpg.rollMenu);
  const rollModifiers = _collectCoreRollModifiers(item.flags.dc20rpg.rollMenu)
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, rollLevel, helpDices, rollModifiers);
  const label = getLabelFromKey(item.system.attackFormula.checkType, DC20RPG.attackTypes); 
  const coreRolls = _prepareCoreRolls(coreFormula, rollData, label);
  await _evaluateRollsAndMarkCrits(coreRolls, rollLevel, autoRollOutcome, item.system.attackFormula.critThreshold);
  return coreRolls;
}

async function _evaluateFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType, rangeType) {
  const formulaRolls = _prepareFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType, rangeType);
  for (let i = 0; i < formulaRolls.length; i++) {
    const roll = formulaRolls[i];
    await roll.clear.evaluate();
    await roll.modified.evaluate();
  }
  return formulaRolls;
}

async function _evaluateCheckRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["check", "contest"].includes(actionType)) return []; // We want to create check rolls only for few types of roll
  const autoRollOutcome = _checkItemAutoRollOutcome(actor, item, actionType);
  const checkKey = item.system.check.checkKey;
  const helpDices = _collectHelpDices(item.flags.dc20rpg.rollMenu);
  const checkFormula = _prepareCheckFormula(actor, checkKey, rollLevel, helpDices, autoRollOutcome);
  const label = getLabelFromKey(checkKey, DC20RPG.checks);
  const checkRolls = _prepareCoreRolls(checkFormula, rollData, label);
  await _evaluateRollsAndMarkCrits(checkRolls, rollLevel, autoRollOutcome);
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

async function _evaluateRollsAndMarkCrits(rolls, rollLevel, autoRollOutcome, critThreshold) {
  if (!rolls) return;

  for (let i = 0; i < rolls.length; i++) {
    const roll = rolls[i];
    const rollOptions = {
      maximize: false,
      minimize: false
    };
    if (autoRollOutcome === "crit") {
      rollOptions.maximize = true;
      roll.label += " (Auto Crit)"
    }
    if (autoRollOutcome === "fail") {
      rollOptions.minimize = true;
      roll.label += " (Auto Fail)"
    }

    await roll.evaluate(rollOptions);
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

function _prepareFormulaRolls(item, actor, rollData, checkOutcome, attackCheckType, rangeType) { // TODO: Refactor this
  let formulas = item.system.formulas;
  let enhancements = item.system.enhancements;
  if (item.system.usesWeapon?.weaponAttack) {
    const wrapper = _getWeaponFormulasAndEnhacements(actor, item.system.usesWeapon.weaponId);
    formulas = {...wrapper.formulas, ...formulas};
    enhancements = {...enhancements, ...wrapper.enhancements};
  }

  // Collect formulas from active enhancements
  let overridenDamage = "";
  if (enhancements) {
    let formulasFromEnhancements = {};
    Object.values(enhancements).forEach(enh => {
      for (let i = 0; i < enh.number; i++) {
        const enhMod = enh.modifications;
        // Add formula from enhancement;
        if (enhMod.addsNewFormula) {
          let key = "";
          do {
            key = generateKey();
          } while (formulas[key]);
          formulasFromEnhancements[key] = enhMod.formula;
        }

        // Override Damage Type
        if (enhMod.overrideDamageType && enhMod.damageType) {
          overridenDamage = enhMod.damageType;
        };
      }

    })
    formulas = {...formulas, ...formulasFromEnhancements}
  }

  if (formulas) {
    const damageRolls = [];
    const healingRolls = [];
    const otherRolls = [];

    for (const [key, formula] of Object.entries(formulas)) {
      const clearRollFromula = formula.formula; // formula without any modifications
      const modified = _modifiedRollFormula(formula, checkOutcome, attackCheckType, rangeType, enhancements, actor); // formula with all enhancements and each five applied
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
          if (overridenDamage) formula.type = overridenDamage;
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
          // We want only clear rolls
          roll.modified = new Roll("0", rollData);
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

function _modifiedRollFormula(formula, checkOutcome, attackCheckType, rangeType, enhancements, actor) {
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
    if (attackCheckType === "attack") globalModKey = `attackDamage.martial.${rangeType}`;
    if (attackCheckType === "spell") globalModKey = `attackDamage.spell.${rangeType}`;
  }
  else if (formula.category === "healing") globalModKey = "healing";
  
  const globalMod = _extractGlobalModStringForType(globalModKey, actor);
  if (globalMod.value) {
    rollFormula += ` + (${globalMod.value})`;
    modifierSources += ` + ${globalMod.source}`;
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
  const globalMod = _extractGlobalModStringForType(rollType, actor);

  return `${d20roll} + ${modifier} ${globalMod.value} ${helpDices}`;
}

function _prepareAttackFromula(actor, attackFormula, rollLevel, helpDices, rollModifiers) {
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
function _prepareDynamicSaveDetails(item) {
  const type = item.system.actionType === "dynamic" ? item.system.save.type : null;
  const dc = item.system.actionType === "dynamic" ? item.system.save.dc : null;
  const saveDetails = {
    dc: dc,
    type: type,
    failEffects: []
  };
  // We can roll one save againt multiple effects
  if (item.system.save.failEffect) saveDetails.failEffects.push(item.system.save.failEffect);
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
    failEffects: []
  };
  // We can roll one save againt multiple effects
  if (item.system.save.failEffect) saveDetails.failEffects.push(item.system.save.failEffect);
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
        if (enh.modifications.save.failEffect) saveDetails.failEffects.push(enh.modifications.save.failEffect);
      }
    })
  }
}

function _prepareCheckDetails(item, winningRoll) {
  const check = item.system.check
  const checkKey = check.checkKey;
  const contestedKey = check.contestedKey;
  const failEffects = [];
  if (check.failEffect) failEffects.push(check.failEffect);
  return {
    rollLabel: getLabelFromKey(checkKey, DC20RPG.checks),
    checkDC: item.system.check.checkDC,
    actionType: item.system.actionType,
    contestedAgainst: winningRoll._total,
    contestedKey: contestedKey,
    contestedLabel: getLabelFromKey(contestedKey, DC20RPG.contests),
    failEffects: failEffects
  }
}

function _prepareEffectsFromItems(item) {
  if (item.effects.size === 0) return [];
  const effects = [];
  item.effects.forEach(effect => {
    effects.push({
      img: effect.img,
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

function _checkFormulaRollOutcome(actor, checkKey, rollType, baseAttribute) {
  let pathPart = "";
  switch(rollType) {
    case "save":
      pathPart = _getSavePath(checkKey, actor);
      break;

    case "attributeCheck": case "attackCheck": case "spellCheck": case "skillCheck":
      // Find category (skills or trade)
      let category = "";
      if (actor.system.skills[checkKey]) category = "skills";
      if (actor.type === "character" && actor.system.tradeSkills[checkKey]) category = "tradeSkills";
      pathPart = _getCheckPath(checkKey, actor, category, baseAttribute);
      break;
  }

  if (!pathPart) return ""

  const outcomeStr = getValueFromPath(actor, `system.autoRollOutcome.onYou.${pathPart}`);
  if (outcomeStr) {
    try {
      const outcome = JSON.parse(`{${outcomeStr}}`);
      return outcome.value;
    }
    catch (e) {
      console.warn(`Cannot parse auto roll outcome json: ${e}`)
    }
  }
}

function _checkItemAutoRollOutcome(actor, item, actionType, baseAttribute) {
  switch(actionType) {
    case "dynamic": case "attack":
      const check = item.system.attackFormula.checkType === "attack" ? "martial" : "spell";
      const range = item.system.attackFormula.rangeType;
      const path = `system.autoRollOutcome.onYou.${check}.${range}`;
      const outcomeString = getValueFromPath(actor, path);
      if (outcomeString) {
        try {
          const outcome = JSON.parse(`{${outcomeString}}`);
          return outcome.value;
        }
        catch (e) {
          console.warn(`Cannot parse auto roll outcome json: ${e}`)
        }
      }
      break;

    case "check": case "contest":
      const pathPart = _getCheckPath(item.system.check.checkKey, actor, "skills", baseAttribute);
      const outcomeStr = getValueFromPath(actor, `system.autoRollOutcome.onYou.${pathPart}`);
      if (outcomeStr) {
        try {
          const outcome = JSON.parse(`{${outcomeStr}}`);
          return outcome.value;
        }
        catch (e) {
          console.warn(`Cannot parse auto roll outcome json: ${e}`)
        }
      }
      break;
  }
}

function _getCheckPath(checkKey, actor, category, baseAttribute) {
  if (["mig", "agi", "cha", "int"].includes(checkKey)) return `checks.${checkKey}`;
  if (checkKey === "att") return `checks.att`;
  if (checkKey === "spe") return `checks.spe`;
  if (checkKey === "mar") {
    const acrModifier = actor.system.skills.acr.modifier;
    const athModifier = actor.system.skills.ath.modifier;
    checkKey = acrModifier >= athModifier ? "acr" : "ath";
    category = "skills";
  }

  let attrKey = baseAttribute ? baseAttribute : actor.system[category][checkKey].baseAttribute;
  if (attrKey === "prime") attrKey = actor.system.details.primeAttrKey;
  return `checks.${attrKey}`;
}

function _getSavePath(saveKey, actor) {
  if (saveKey === "phy") {
    const migSave = actor.system.attributes.mig.save;
    const agiSave = actor.system.attributes.agi.save;
    saveKey = migSave >= agiSave ? "mig" : "agi";
  }

  if (saveKey === "men") {
    const intSave = actor.system.attributes.int.save;
    const chaSave = actor.system.attributes.cha.save;
    saveKey = intSave >= chaSave ? "int" : "cha";
  }
  return `saves.${saveKey}`;
}

function _resetRollMenu(rollMenu, owner) {
  rollMenu.dis = 0
  rollMenu.adv = 0;
  rollMenu.apCost = 0;
  rollMenu.d8 = 0;
  rollMenu.d6 = 0;
  rollMenu.d4 = 0;
  if (rollMenu.free) rollMenu.free = false;
  if (rollMenu.versatile) rollMenu.versatile = false;
  if (rollMenu.ignoreConcentration) rollMenu.ignoreConcentration = false;
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

function _checkConcentration(item, actor) {
  const isConcentration = item.system.duration.type === "concentration";
  const ignoreConcentration = item.flags.dc20rpg.rollMenu.ignoreConcentration;
  if (isConcentration && !ignoreConcentration) {
    let repleaced = "";
    let title = "Starts Concentrating";
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

function _respectNat1Rules(winner, actor, rollType, item) {
  if (winner.fail && actor.inCombat) {
    if (["attackCheck", "spellCheck", "att", "spe"].includes(rollType)) {
      sendDescriptionToChat(actor, {
        rollTitle: "Critical Fail - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you before the start of your next turn.",
      });
      actor.toggleStatusEffect("exposed", { active: true });
    }

    if (["spellCheck", "spe"].includes(rollType)) {
      if (item && !item.flags.dc20rpg.rollMenu.free) revertUsageCostSubtraction(actor, item);
    }
  }
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
      console.warn(`Cannot parse global formula modifier json: ${e}`)
    }
  }
  return globalMod;
}