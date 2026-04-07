import { runEventsFor } from "../helpers/actors/events.mjs";
import { finishRoll, finishSheetRoll, resetEnhancements } from "../helpers/actors/rollsFromActor.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";
import { DC20ChatMessage } from "../sidebar/chat/chat-message.mjs";
import * as helper from "./rollHelper.mjs"

export class DC20Roll {

  //=================================
  //          ROLL DETAILS          =
  //=================================
  static prepareItemCoreRollDetails(item, options={}) {
    switch(item.system.actionType) {
      case "check": return this.prepareCheckDetails(item.checkKey, options);
      case "attack": return this.prepareAttackDetails(item.system.attack.checkType, options);
    }
    return {};
  }

  static prepareAttackDetails(key, options={}) {
    if (key === "spell") return this.#prepareRollDetails(" + @attack.spell", "att", "attackCheck", options);
    return this.#prepareRollDetails(" + @attack.martial", "att", "attackCheck", options);
  }

  static prepareCheckDetails(key, options={}) {
    let partial = "";
    let rollType = "";

    switch (key) {
      case "flat": 
        break;

      case "initiative":
        partial = ` + @special.initiative`;
        rollType = "initiative";
        break;

      case "mig": case "agi": case "int": case "cha": case "prime":
        partial = ` + @${key}`;
        rollType = "attributeCheck";
        break;

      case "att":
        partial = " + @attack.martial";
        rollType = "attackCheck";
        break;

      case "mar":
        partial = " + @check.martial";
        rollType = "martialCheck";
        break;

      case "spe":
        partial = " + @check.spell";
        rollType = "spellCheck";
        break;

      case "language": 
        partial = " + @special.languageCheck";
        rollType = "attributeCheck"
        break;

      default:
        partial = ` + @allSkills.${key}`;
        rollType = "skillCheck";
        break;
    }

    return this.#prepareRollDetails(partial, key, rollType, options);
  }

  static prepareSaveDetails(key, options={}) {
    const partial = ` + @${key}Save`;
    return this.#prepareRollDetails(partial, key, "save", options);
  }

  static #prepareRollDetails(partial, key, rollType, options) {
    let dice = "d20";
    if (options.rollLevel) {
      const value = Math.abs(options.rollLevel) + 1;
      const type = options.rollLevel > 0 ? "kh" : "kl";
      dice = `${value}d20${type}`;
    }
    const modifier = `${partial} + @rollBonus`
    const formula = `${dice}${modifier}`;

    const ROLL_KEYS = rollType === "save" ? CONFIG.DC20RPG.ROLL_KEYS.saveTypes : CONFIG.DC20RPG.ROLL_KEYS.allChecks;
    ROLL_KEYS.language = "Language Check";
    ROLL_KEYS.att = "Attack Check";
    let label = options.customLabel || getLabelFromKey(key, ROLL_KEYS);
    const rollTitle = options.rollTitle || getLabelFromKey(key, ROLL_KEYS);
    
    let against = options.against;
    if (against) {
      label += ` vs ${against}`;
      against = parseInt(against);
    }

    let statuses = options.statuses  || [];
    statuses = statuses.map(status => {
      if (status.hasOwnProperty("id")) return status.id;
      else return status;
    });
    
    return {
      modifier: modifier,
      roll: formula,
      label: label,
      rollTitle: rollTitle,
      type: rollType,
      against: against,
      checkKey: key,
      statuses: statuses
    }
  }

  //=================================
  //          HANDLE ROLLS          =
  //=================================
  static async rollItem(coreFormula, item, options={}) {
    const actor = item.actor;

    // 0. Handle not usable items
    if (!item.system.usable) {
      const chatMessageData = item.toChatMessageData();
      options.item = item;
      DC20ChatMessage.descriptionMessage(chatMessageData, actor, options);
      return null;
    }

    const rollMenu = item.system.rollMenu;
    const actionType = item.system.actionType;
    coreFormula.label = helper.labelForItemRoll(item);

    // 1. Subtract Cost
    const costsSubracted = rollMenu.free ? true : await item.use.respectUseCost();
    if (!costsSubracted) {
      resetEnhancements(item, actor, false);
      rollMenu.clear();
      return;
    }

    // 2. Add changes related to ammo
    if (item.ammo?.active) {
      const ammo = item.ammo?.active;
      if (ammo) {
        item.system.rollRequests = foundry.utils.mergeObject(item.system.rollRequests, ammo.system.rollRequests);
        item.system.againstStatuses = foundry.utils.mergeObject(item.system.againstStatuses, ammo.system.againstStatuses);
        item.system.formulas = foundry.utils.mergeObject(item.system.formulas, ammo.system.formulas);
        item.system.macros = foundry.utils.mergeObject(item.system.macros, ammo.system.macros);
        item.damageOverride = ammo.system.overridenDamageType;
      }
    }

    // 3. Prepare Roll Data
    const rollData = await item.getRollData();
    const evalData = {
      rollMenu: rollMenu,
      rollConfig: item.system.rollConfig,
      afterRollEffects: options.afterRollEffects || []
    }

    // 4. Pre Item Roll Events and macros
    await item.callMacro("preItemRoll", {coreFormula: coreFormula, evalData: evalData, rollData: rollData});
    await helper.runEnhancementMacro(item, "preItemRoll", {coreFormula: coreFormula, evalData: evalData, rollData: rollData});
    if (actionType === "attack") await runEventsFor("attack", actor);
    if (actionType === "check") await runEventsFor("rollCheck", actor);
    await runEventsFor("rollItem", actor);

    // 5. Evaluate Rolls
    const rolls = {
      core: await helper.evaluateCoreRoll(coreFormula, rollData, evalData),
      formula: await helper.evaluateFormulaRoll(item, rollData, evalData)
    }
    if (actionType === "help") {
      let ignoreMHP = item.system.help?.ignoreMHP;
      if (!ignoreMHP) ignoreMHP = rollMenu.ignoreMCP;
      actor.help.prepare({ignoreMHP: ignoreMHP, subtract: item.system.help?.subtract, duration: item.system.help?.duration})
    }

    // 6. Post Item Roll
    await item.callMacro("postItemRoll", {rolls: rolls});
    await helper.runEnhancementMacro(item, "postItemRoll", {rolls: rolls});

    // 7. Send to chat
    if (!item.doNotSendToChat && !options.skipChatMessage) {
      const chatMessageData = item.toChatMessageData();
      options.item = item;

      if (!actionType) {
        DC20ChatMessage.descriptionMessage(chatMessageData, actor, options);
      }
      else if (actionType === "help") {
        chatMessageData.rollTitle += " - Help Action";
        DC20ChatMessage.descriptionMessage(chatMessageData, actor, options);
      }
      else {
        chatMessageData.rollLevel = rollMenu.rollLevel;
        DC20ChatMessage.rollMessage(rolls, chatMessageData, actor, options);
      }
    }

    // 8. Cleanup - TODO - rework this as well
    finishRoll(actor, item, rollMenu, rolls.core, evalData.afterRollEffects);
    if (item.removeInfusionAfter) {
      item.infusions.active[item.removeInfusionAfter].remove();
      item.reset();
    }
    // Remove all items marked with "deleteAfter"
    for (const itm of actor.items) {
      if (itm.deleteAfter) itm.delete();
    }

    // 9. Return core roll
    return rolls.core;
  } 

  static async rollFormula(coreFormula, sheetRollData, actor, options={}) {
    const rollMenu = actor.system.rollMenu;
    coreFormula.label = sheetRollData.label;

    // 1. Subtract Cost
    const costsSubracted = rollMenu.free ? true : await sheetRollData.respectUseCost();
    if (!costsSubracted) {
      sheetRollData.clearEnhancements();
      rollMenu.clear();
      return;
    }

    // 2. Pre Item Roll Events
    if (["attackCheck", "spellCheck", "attributeCheck", "skillCheck", "initiative"].includes(sheetRollData.type)) await runEventsFor("rollCheck", actor);
    if (["save"].includes(sheetRollData.type)) await runEventsFor("rollSave", actor);

    // 3. Evaluate Roll
    const evalData = {rollMenu: rollMenu, afterRollEffects: options.afterRollEffects || []};
    const roll = await helper.evaluateCoreRoll(coreFormula, actor.getRollData(), evalData);
    roll.source = coreFormula.source;

    // 4. Send chat message
    if (!options.skipChatMessage) {
      const label = sheetRollData.label || `${actor.name} : Roll Result`;
      const rollTitle = sheetRollData.rollTitle || label;
      const messageDetails = {
        label: label,
        image: actor.img,
        description: sheetRollData.description,
        against: sheetRollData.against,
        name: rollTitle,
        rollLevel: rollMenu.rollLevel,
      };
      DC20ChatMessage.rollMessage({core: roll, formula: []}, messageDetails, actor, options);
    }

    // 5. Cleanup - TODO - rework this as well
    finishSheetRoll(roll, actor, rollMenu, sheetRollData, evalData.afterRollEffects)

    return roll;
  }
}