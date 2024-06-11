import { descriptionMessage, sendRollsToChat } from "../../chat/chat.mjs";
import { DC20RPG } from "../config.mjs";
import { respectUsageCost, subtractAP } from "./costManipulator.mjs";
import { getLabelFromKey, getValueFromPath, removeWhitespaces } from "../utils.mjs";


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
    formulaLabel: label,
    sublabel: label,
    description: description,
    type: type
  }
  if (formula) return _rollFromFormula(formula, details, actor, true);
  else descriptionMessage(actor, details);
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

  const globalMod = actor.system.globalFormulaModifiers[details.type] || "";
  const helpDices = _collectHelpDices(rollMenu);
  formula += " " + globalMod + helpDices;

  const rolls = {
    core: _prepareCoreRolls(formula, rollData, rollLevel, details.label)
  };
  await _evaluateRollsAndMarkCrits(rolls.core);
  rolls.winningRoll = _extractAndMarkWinningCoreRoll(rolls.core, rollLevel);

  // Prepare and send chat message
  if (sendToChat) {
    const label = details.label || `${actor.name} : Roll Result`;
    const rollTitle = details.formulaLabel || label;
    const messageDetails = {
      label: label,
      image: actor.img,
      description: details.description,
      against: details.against,
      rollTitle: rollTitle,
      actionType: "attack"
    };
    sendRollsToChat(rolls, actor, messageDetails);
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

  const rollLevel = _determineRollLevel(rollMenu);
  const rollData = await item.getRollData();
  const actionType = item.system.actionType;
  const rolls = await _evaluateItemRolls(actionType, actor, item, rollData, rollLevel, rollMenu.versatile);
  rolls.winningRoll = _hasAnyRolls(rolls) ? _extractAndMarkWinningCoreRoll(rolls.core, rollLevel) : null;

  // Prepare and send chat message
  if (sendToChat) {
    const description = !item.system.statuses || item.system.statuses.identified
        ? item.system.description
        : "<b>Unidentified</b>";
    const conditionals = _prepareConditionals(actor.system.conditionals, item);

    const messageDetails = {
      image: item.img,
      description: description,
      rollTitle: item.name,
      actionType: actionType,
      conditionals: conditionals
    };
    
    // Details depending on action type
    if (["dynamic", "attack"].includes(actionType)) {
      const winningRoll = rolls.winningRoll;
      if (winningRoll.crit) _markCritFormulas(rolls.formula);

      const attackKey = item.system.attackFormula.checkType;
      messageDetails.label = getLabelFromKey(attackKey, DC20RPG.attackTypes); 
      messageDetails.rollTotal = winningRoll.total;
      messageDetails.targetDefence = item.system.attackFormula.targetDefence;
      messageDetails.halfDmgOnMiss = item.system.attackFormula.halfDmgOnMiss;
      // Flag indicating that when sending a chat message we should run check againts targets selected by this user
      messageDetails.collectTargets = game.settings.get("dc20rpg", "showTargetsOnChatMessage");
      messageDetails.saveDetails = _prepareSaveDetails(item);
    }
    if (["save"].includes(actionType)) {
      messageDetails.saveDetails = _prepareSaveDetails(item);
    }
    if (["check", "contest"].includes(actionType)) {
      const checkDetails = _prepareCheckDetails(item, rolls.winningRoll, rolls.formula);
      messageDetails.checkDetails = checkDetails;
      messageDetails.label = checkDetails.rollLabel
    }
    sendRollsToChat(rolls, actor, messageDetails);
  }
  _resetRollMenu(rollMenu, item);
  _resetEnhancements(item, actor);
  return rolls.winningRoll;
}

//=======================================
//           evaluate ROLLS             =
//=======================================
async function _evaluateItemRolls(actionType, actor, item, rollData, rollLevel, versatileRoll) {
  const attackRolls = await _evaluateAttackRolls(actionType, actor, item, rollData, rollLevel);
  const checkRolls = await _evaluateCheckRolls(actionType, actor, item, rollData, rollLevel);
  const coreRolls = [...attackRolls, ...checkRolls];

  const checkOutcome = actionType === "check" ? item.system.check.outcome : undefined;
  const attackCheckType = ["dynamic", "attack"].includes(actionType) ? item.system.attackFormula.checkType : undefined;
  const formulaRolls = await _evaluateFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome, attackCheckType);
  return {
    core: coreRolls,
    formula: formulaRolls
  }
}

async function _evaluateAttackRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["attack", "dynamic"].includes(actionType)) return []; // We want to create attack rolls only for few types of roll
  const helpDices = _collectHelpDices(item.flags.dc20rpg.rollMenu);
  const rollModifiers = _collectCoreRollModifiers(item.flags.dc20rpg.rollMenu)
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, helpDices, rollModifiers);
  const label = getLabelFromKey(actionType, DC20RPG.actionTypes);
  const coreRolls = _prepareCoreRolls(coreFormula, rollData, rollLevel, label);
  await _evaluateRollsAndMarkCrits(coreRolls, item.system.attackFormula.critThreshold);
  return coreRolls;
}

async function _evaluateFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome, attackCheckType) {
  const formulaRolls = _prepareFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome, attackCheckType);
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
  const checkFormula = _prepareCheckFormula(actor, checkKey, helpDices);
  const label = getLabelFromKey(checkKey, DC20RPG.checks) + " Check";
  const checkRolls = _prepareCoreRolls(checkFormula, rollData, rollLevel, label);
  await _evaluateRollsAndMarkCrits(checkRolls);
  if (actionType === "check") _determineCheckOutcome(checkRolls, item, rollLevel);
  return checkRolls;
}

function _determineCheckOutcome(rolls, item, rollLevel) {
  const check = item.system.check;
  const checkValue = _extractAndMarkWinningCoreRoll(rolls, rollLevel).total;
  if (checkValue < check.checkDC) check.outcome = -1;               // Check Failed
  else check.outcome = Math.floor((checkValue - check.checkDC)/5);  // Check succeed by 5 or more
}

async function _evaluateRollsAndMarkCrits(rolls, critThreshold) {
  if (!rolls) return;

  for (let i = 0; i < rolls.length; i++) {
    const roll = rolls[i];
    await roll.evaluate();
    roll.crit = false;
    roll.fail = false;

    // Only d20 can crit
    roll.terms.forEach(term => {
      if (term.faces === 20) {
        const fail = 1;
        const crit = critThreshold ? critThreshold : 20;

        term.results.forEach(result => {
          if (result.result >= crit) roll.crit = true;
          if (result.result === fail) roll.fail = true;
        });
      }
    });
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

  bestRoll.winner = true;
  return bestRoll;
}

//=======================================
//            PREPARE ROLLS             =
//=======================================
function _prepareCoreRolls(coreFormula, rollData, rollLevel, label) {
  let coreRolls = [];
  if (coreFormula) {
    // We want to create core rolls for every level of advanage/disadvantage
    for (let i = 0; i < Math.abs(rollLevel) + 1; i++) {
      const coreRoll = new Roll(coreFormula, rollData);
      coreRoll.coreFormula = true;
      coreRoll.label = label;
      coreRolls.push(coreRoll);
    }
  }
  return coreRolls;
}

function _prepareFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome, attackCheckType) { // TODO: Refactor this
  let formulas = item.system.formulas;
  let enhancements = item.system.enhancements;
  if (item.system.usesWeapon?.weaponAttack) {
    const wrapper = _getWeaponFormulasAndEnhacements(actor, item.system.usesWeapon.weaponId);
    formulas = {...formulas, ...wrapper.formulas};
    enhancements = {...enhancements, ...wrapper.enhancements};

    // We want to copy weaponCategory and weaponType so we can make 
    // conditionals work for techniques and features that are using weapons
    item.system.weaponCategory = wrapper.usedItem.system.weaponCategory;
    item.system.weaponType = wrapper.usedItem.system.weaponType;
  }

  if (formulas) {
    const damageRolls = [];
    const healingRolls = [];
    const otherRolls = [];

    for (const [key, formula] of Object.entries(formulas)) {
      const isVerstaile = versatileRoll ? formula.versatile : false;
      const clearRollFromula = isVerstaile ? formula.versatileFormula : formula.formula; // formula without any modifications
      const modified = _modifiedRollFormula(formula, isVerstaile, checkOutcome, attackCheckType, enhancements, actor); // formula with all enhancements and each five applied
      const roll = {
        clear: new Roll(clearRollFromula, rollData),
        modified: new Roll(modified.rollFormula, rollData)
      }
      const commonData = {
        id: key,
        coreFormula: false,
        label: isVerstaile ? "(Versatile) " : "",
        category: formula.category
      }
      roll.clear.clear = true;
      roll.modified.clear = false;
      roll.clear.modifierSources = isVerstaile ? "Versatile Value" : "Standard Value";
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

function _modifiedRollFormula(formula, isVerstaile, checkOutcome, attackCheckType, enhancements, actor) {
  // Choose formula depending on versatile option
  let rollFormula = isVerstaile ? formula.versatileFormula : formula.formula;
  let modifierSources = isVerstaile ? "Versatile Value" : "Standard Value";

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

function _prepareCheckFormula(actor, checkKey, helpDices) {
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
  const globalMod = actor.system.globalFormulaModifiers[rollType] || "";
  return `d20 + ${modifier} ${globalMod} ${helpDices}`;
}

function _prepareAttackFromula(actor, attackFormula, helpDices, rollModifiers) {
  const formula = attackFormula.formula;
  const rollType = attackFormula.checkType === "attack" ? "attackCheck" : "spellCheck";
  const globalMod = actor.system.globalFormulaModifiers[rollType] || "";
  return `${formula} ${rollModifiers} ${globalMod} ${helpDices}`;
}

//=======================================
//           PREPARE DETAILS            =
//=======================================
function _prepareDynamicSaveDetails(item, winningRoll) {
  const type = item.system.actionType === "dynamic" ? item.system.save.type : null;
  const saveDetails = {
    dc: winningRoll._total,
    type: type
  };
  const enhancements = item.system.enhancements;
  _overrideWithEnhancement(saveDetails, enhancements, false);

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
  _overrideWithEnhancement(saveDetails, enhancements, true);
  
  saveDetails.label = getLabelFromKey(saveDetails.type, DC20RPG.saveTypes) + " Save";
  return saveDetails;
}

function _overrideWithEnhancement(saveDetails, enhancements, overrideDC) {
  if (enhancements) {
    Object.values(enhancements).forEach(enh => {
      if (enh.number && enh.modifications.overrideSave) {
        saveDetails.type = enh.modifications.save.type;
        if (overrideDC) saveDetails.dc = enh.modifications.save.dc;
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
    _resetEnhancements(usedItem);
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
    if (_itemMeetsConditions(conditional.useFor, item)) {
      prepared.push({
        condition: conditional.condition,
        bonus: conditional.bonus,
        name: conditional.name
      });
    }
  });
  return JSON.stringify(prepared);
}

function _itemMeetsConditions(useFor, item) {
  if (!useFor) return true;
  const combinations = useFor.split(';');
  for (const combination of combinations) {
    const pathValue = combination.trim().split('=')
    const value = getValueFromPath(item, pathValue[0])
    const conditionMet = eval(pathValue[1]).includes(value);
    if (!conditionMet) return false;
  };
  return true;
}