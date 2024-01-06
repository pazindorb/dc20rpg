import { createChatMessage, rollItemToChat } from "../../chat/chat.mjs";
import { createVariableRollDialog } from "../../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../config.mjs";
import { respectUsageCost, subtractAP } from "./costManipulator.mjs";
import { getLabelFromKey } from "../utils.mjs";

//======================================
//          Roll From Formula          =
//======================================
/** @see handleRollFromFormula */
export function rollFromFormula(formula, label, rollType, actor, sendToChat) {
  const dataset = {
    roll: formula,
    label: label,
    type: rollType
  }
  return handleRollFromFormula(actor, dataset, sendToChat)
}

export function rollActionFormula(action, actor) {
  if (subtractAP(actor, action.apCost)) {
    const dataset = {
      roll: action.formula,
      label: action.name,
      formulaLabel: action.label,
      description: action.description,
      type: action.type
    }
    if (action.formula) {
      return handleRollFromFormula(actor, dataset, true);
    }
    else {
      const templateSource = "systems/dc20rpg/templates/chat/description-chat-message.hbs";
      const templateData = {
        image: actor.img,
        label: action.name,
        sublabel: action.label,
        description: action.description,
      }
      createChatMessage(actor, templateData, templateSource, []);
    }
  }
  return;
}

export function rollInitiative(actor, dataset) {
  actor.rollInitiative({
    createCombatants: true,
    rerollInitiative: true,
    initiativeOptions: {
      formula: dataset.roll,
      label: dataset.label,
      type: dataset.type
    },
  });
}

/**
 * Creates new Roll instance from given formula for given actor.
 * Sends it to chat if needed. Returns created roll.
 * 
 * @param {string}      formula     Formula of that roll 
 * @param {DC20RpgActor}actor       Actor which rollData will be used for that roll
 * @param {boolean}     sendToChat  Determines roll should be send to chat as a message
 * @param {boolean}     customLabel If provided will set label of chat roll to value
 * @returns {Roll}  Created roll
 */
export function handleRollFromFormula(actor, dataset, sendToChat) {
  const rollMenu = actor.system.rollMenu;
  const rollData = actor.getRollData();
  const rollLevel = _determineRollLevel(rollMenu);

  const globalMod = actor.system.globalFormulaModifiers[dataset.type] || "";
  const helpDices = _collectHelpDices(rollMenu);
  const formula = dataset.roll + globalMod + helpDices;

  const rolls = {
    core: _prepareCoreRolls(formula, rollData, rollLevel, dataset.label)
  }
  _evaulateRollsAndMarkCrits(rolls.core);
  const winningRoll = _extractAndMarkWinningCoreRoll(rolls.core, rollLevel);

  if (sendToChat) {
    const customLabel = dataset.label ? `${dataset.label}` : `${actor.name} : Roll Result`;
    const formulaLabel = dataset.formulaLabel ? dataset.formulaLabel : dataset.label;
    const amountOfCoreRolls = rolls.core.length;
    const templateData = {
      label: customLabel,
      image: actor.img,
      description: dataset.description,
      rollTitle: formulaLabel,
      roll: winningRoll,
      rolls: rolls,
      actionType: "attack",
      amountOfCoreRolls: amountOfCoreRolls,
      ...rollData
    }
    const templateSource = "systems/dc20rpg/templates/chat/item-chat-message.hbs";
    createChatMessage(actor, templateData, templateSource, rolls);
  }
  return winningRoll;
}

//===================================
//          Roll From Item          =
//===================================
/**
 * Creates new Roll instance for item's rollFormula. Returns that roll.
 * Also creates new Roll instace for every other formula added to that item in "system.formulas".
 * Those rolls are not returned by that method but are shown in chat message.
 * 
 * @param {DC20RpgActor}actor       Actor which is a speaker for that roll
 * @param {DC20RpgItem} item        Item which rollData will be used for that roll
 * @param {boolean}     sendToChat  Determines if roll should be send to chat as a message
 * @returns {Roll}  Created roll
 */
export async function handleRollFromItem(actor, dataset, sendToChat, freeRoll) {
  const item = actor.items.get(dataset.itemId);
  if (!item) return null;

  let evaulatedData;
  if (dataset.configuredRoll) evaulatedData = await handleConfiguredRoll(actor, item);
  else evaulatedData = await handleStandardRoll(actor, item, freeRoll);

  if (!evaulatedData) return null;
  if (sendToChat) rollItemToChat(evaulatedData, item, actor);
  return evaulatedData.roll;
}

export function handleConfiguredRoll(actor, item) {
  const rollMenu = item.system.rollMenu;
  const costsSubracted = rollMenu.free ? true : respectUsageCost(actor, item, true);
  const rollLevel = _determineRollLevel(rollMenu);
  return costsSubracted ? _rollItem(actor, item, rollLevel, rollMenu.versatile) : null;
}

export function handleStandardRoll(actor, item, freeRoll) {
  const costsSubracted = freeRoll ? true : respectUsageCost(actor, item);
  return costsSubracted ? _rollItem(actor, item, 0, false) : null;
}

async function _rollItem(actor, item, rollLevel, versatileRoll) {
  const rollData = await item.getRollData();
  const actionType = item.system.actionType;

  if (actionType === "tradeSkill") return _rollTradeSkill(actor, item.system.tradeSkillKey);

  const preparedData = {
    ..._rollDependingOnActionType(actionType, actor, item, rollData, rollLevel, versatileRoll),
    ...rollData
  }

  return {
    data: preparedData,
    roll: preparedData.winningRoll,
    notTradeSkill: true
  };
}

function _rollDependingOnActionType(actionType, actor, item, rollData, rollLevel, versatileRoll) {
  const rolls = _evaulateItemRolls(actionType, actor, item, rollData, rollLevel, versatileRoll);
  const winningRoll = _extractAndMarkWinningCoreRoll(rolls.core, rollLevel);
  const preparedData = {
    rolls: rolls,
    winningRoll: winningRoll
  };
  
  if (["dynamic", "attack"].includes(actionType)) preparedData.rollTotal = _getWinningRollValue(winningRoll, rolls.formula);
  if (["dynamic", "attack"].includes(actionType)) preparedData.attackDetails = _prepareAttackDetails(item); 
  if (["dynamic", "save", "attack"].includes(actionType)) preparedData.saveDetails = _prepareSaveDetails(item);
  if (["check", "contest"].includes(actionType)) preparedData.checkDetails = _prepareCheckDetails(item, winningRoll, rolls.formula);

  return preparedData;
}

//=======================================
//           EVAULATE ROLLS             =
//=======================================
function _evaulateItemRolls(actionType, actor, item, rollData, rollLevel, versatileRoll) {
  const attackRolls = _evaulateAttackRolls(actionType, actor, item, rollData, rollLevel);
  const checkRolls = _evaulateCheckRolls(actionType, actor, item, rollData, rollLevel);
  const coreRolls = [...attackRolls, ...checkRolls];

  const checkOutcome = actionType === "check" ? item.system.check.outcome : undefined;
  const formulaRolls = _evaulateFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome);
  return {
    core: coreRolls,
    formula: formulaRolls
  }
}

function _evaulateAttackRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["attack", "dynamic"].includes(actionType)) return []; // We want to create attack rolls only for few types of roll
  const helpDices = _collectHelpDices(item.system.rollMenu);
  const coreFormula = _prepareAttackFromula(actor, item.system.attackFormula, helpDices);
  const label = getLabelFromKey(actionType, DC20RPG.actionTypes);
  const coreRolls = _prepareCoreRolls(coreFormula, rollData, rollLevel, label);
  _evaulateRollsAndMarkCrits(coreRolls, item.system.attackFormula.critThreshold);
  return coreRolls;
}

function _evaulateFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome) {
  const formulaRolls = _prepareFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome);
  if (formulaRolls) formulaRolls.forEach(roll => roll.evaluate({async: false}));
  return formulaRolls;
}

function _evaulateCheckRolls(actionType, actor, item, rollData, rollLevel) {
  if (!["check", "contest"].includes(actionType)) return []; // We want to create check rolls only for few types of roll
  const checkKey = item.system.check.checkKey;
  const helpDices = _collectHelpDices(item.system.rollMenu);
  const checkFormula = _prepareCheckFormula(actor, checkKey, helpDices);
  const label = getLabelFromKey(checkKey, DC20RPG.checks) + " Check";
  const checkRolls = _prepareCoreRolls(checkFormula, rollData, rollLevel, label);
  _evaulateRollsAndMarkCrits(checkRolls);
  if (actionType === "check") _determineCheckOutcome(checkRolls, item, rollLevel);
  return checkRolls;
}

function _determineCheckOutcome(rolls, item, rollLevel) {
  const check = item.system.check;
  const checkValue = _extractAndMarkWinningCoreRoll(rolls, rollLevel).total;
  if (checkValue < check.checkDC) check.outcome = -1;               // Check Failed
  else check.outcome = Math.floor((checkValue - check.checkDC)/5);  // Check succeed by 5 or more
}

function _evaulateRollsAndMarkCrits(rolls, critThreshold) {
  if (!rolls) return;

  rolls.forEach(roll => {
    roll.evaluate({async: false});
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
  });
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

function _prepareFormulaRolls(item, actor, rollData, versatileRoll, checkOutcome) {
  let formulas = item.system.formulas;
  let enhancements = item.system.enhancements;
  if (item.system.usesWeapon) {
    const wrapper = _getWeaponFormulasAndEnhacements(actor, item.system.usesWeapon);
    formulas = {
      ...formulas, 
      ...wrapper.formulas
    };
    enhancements = {
      ...enhancements, 
      ...wrapper.enhancements
    };
  }

  if (formulas) {
    const damageRolls = [];
    const healingRolls = [];
    const otherRolls = [];

    for (let formula of Object.values(formulas)) {
      const isVerstaile = versatileRoll ? formula.versatile : false;
      const wrapper = _chooseRollFormulaAndApplyEnhancements(item, formula, isVerstaile, checkOutcome, enhancements);
      const modifierSources = wrapper.modifierSources;
      const rollFormula = wrapper.rollFormula;
      const roll = new Roll(rollFormula, rollData);
      roll.coreFormula = false;
      roll.label = isVerstaile ? "(Versatile) " : "";
      roll.category = formula.category;
      roll.applyModifications = formula.applyModifications;
      roll.modifierSources = modifierSources;
      
      switch (formula.category) {
        case "damage":
          let damageTypeLabel = getLabelFromKey(formula.type, DC20RPG.damageTypes);
          roll.label += "Damage - " + damageTypeLabel;
          roll.type = formula.type;
          roll.typeLabel = damageTypeLabel;
          damageRolls.push(roll);
          break;
        case "healing":
          let healingTypeLabel = getLabelFromKey(formula.type, DC20RPG.healingTypes);
          roll.label += "Healing - " + healingTypeLabel;
          roll.type = formula.type;
          roll.typeLabel = healingTypeLabel;
          healingRolls.push(roll);
          break;
        case "other":
          roll.label += "Other";
          otherRolls.push(roll);
          break;
      }
    }
    return [...damageRolls, ...healingRolls, ...otherRolls];
  }
  return [];
}

function _getWeaponFormulasAndEnhacements(actor, itemId) {
  const item = actor.items.get(itemId);
  if (!item) return {formulas: {}, enhancements: {}};
  return {
    formulas: item.system.formulas, 
    enhancements: item.system.enhancements
  };
}

function _chooseRollFormulaAndApplyEnhancements(item, formula, isVerstaile, checkOutcome, enhancements) {
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
      if (formula.applyModifications) {
        if (enh.modifications.hasAdditionalFormula) {
          for (let i = 0; i < enh.number; i++) {
            rollFormula += ` + ${enh.modifications.additionalFormula}`;
            modifierSources += ` + ${enh.name}`;
          }
        }
      }
    })
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

function _prepareAttackFromula(actor, attackFormula, helpDices) {
  const formula = attackFormula.formula;
  const rollType = attackFormula.checkType === "attack" ? "attackCheck" : "spellCheck";
  const globalMod = actor.system.globalFormulaModifiers[rollType] || "";
  return `${formula} ${globalMod} ${helpDices}`;
}

function _collectHelpDices(rollMenu) {
  let hitDicesFormula = "";
  if (rollMenu.d8 > 0) hitDicesFormula += `+ ${rollMenu.d8}d8`;
  if (rollMenu.d6 > 0) hitDicesFormula += `+ ${rollMenu.d6}d6`;
  if (rollMenu.d4 > 0) hitDicesFormula += `+ ${rollMenu.d4}d4`;
  return hitDicesFormula;
}

function _determineRollLevel(rollMenu) {
  const disLevel = rollMenu.dis;
  const advLevel = rollMenu.adv;
  return advLevel - disLevel;
}

//=======================================
//           PREPARE DETAILS            =
//=======================================
function _prepareSaveDetails(item) {
  let type = "";
  let dc = 0;
  if (item.system.actionType !== "attack") {
    type = item.system.save.type;
    dc = item.system.save.dc;
  }
  
  const enhancements = item.system.enhancements;
  if (enhancements) {
    Object.values(enhancements).forEach(enh => {
      if (enh.number && enh.modifications.overrideSave) {
        type = enh.modifications.save.type;
        dc = enh.modifications.save.dc;
      }
    })
  }

  return {
    dc: dc,
    type: type,
    label: getLabelFromKey(type, DC20RPG.saveTypes) + " Save",
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
    contestedLabel: getLabelFromKey(contestedKey, DC20RPG.contests)
  }
}

function _prepareAttackDetails(item) {
  const attackKey = item.system.attackFormula.checkType;
  return {
    rollLabel: getLabelFromKey(attackKey, DC20RPG.attackTypes) + " Check"
  }
}

function _getWinningRollValue(winningRoll, formulaRolls) {
  if (winningRoll.crit) _markCritFormulas(formulaRolls);
  return winningRoll.total;
}

function _markCritFormulas(formulaRolls) {
  formulaRolls.forEach(roll => {
    if (roll.applyModifications) {
      roll._total += 2
      roll.crit = true
      roll.modifierSources += ` + Critical`;
    }
  });
}

//=======================================
//        EXTRACT WINNING ROLL          =
//=======================================
function _extractAndMarkWinningCoreRoll(rolls, rollLevel) {
  let coreRolls = _extractCoreRolls(rolls);
  if (!coreRolls) return null;

  let bestRoll = {};
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

function _extractCoreRolls(rolls) {
  if (!rolls) return null;
  let coreRolls = [];
  rolls.forEach(roll => {
    if (roll.coreFormula) coreRolls.push(roll);
  });
  return coreRolls;
}

//=======================================
//           ROLL TRADE SKILL           =
//=======================================
function _rollTradeSkill(actor, tradeSkillKey) {
  const tradeSkill = actor.system.tradeSkills[tradeSkillKey];
  if (!tradeSkill) {
    ui.notifications.error("You need to select Trade Skill for that item.");
    return;
  }
  const dataset = {
    mastery: tradeSkill.skillMastery,
    bonus: tradeSkill.bonus,
    label: getLabelFromKey(tradeSkillKey, DC20RPG.tradeSkills) + " Check",
    type: "tradeCheck"
  }
  createVariableRollDialog(dataset, actor);

  return {
    notTradeSkill: false,
    roll: null
  }
}