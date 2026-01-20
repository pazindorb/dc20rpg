import { sendDescriptionToChat, sendRollsToChat } from "../chat/chat-message.mjs";
import { runEventsFor } from "../helpers/actors/events.mjs";
import { finishRoll, finishSheetRoll, prepareMessageDetails, resetEnhancements } from "../helpers/actors/rollsFromActor.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";
import * as helper from "./rollHelper.mjs"

export class DC20Roll {

  //=================================
  //          ROLL DETAILS          =
  //=================================
  static prepareItemCoreRollDetails(item, options={}) {
    switch(item.system.actionType) {
      case "check": return this.prepareCheckDetails(item.checkKey, options);
      case "attack": return this.prepareAttackDetails(item.system.attackFormula.checkType, options);
    }
    return {};
  }

  static prepareAttackDetails(key, options={}) {
    if (key === "spell") return this.#prepareRollDetails(" + @attack.spell + @rollBonus", "att", "attackCheck", options);
    return this.#prepareRollDetails(" + @attack.martial + @rollBonus", "att", "attackCheck", options);
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
    const formula = `${dice}${partial}`;

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
      const messageDetails = prepareMessageDetails(item, actor, "", {});
      sendDescriptionToChat(actor, messageDetails, item);
      return null;
    }

    const rollMenu = item.system.rollMenu;
    const actionType = item.system.actionType;
    coreFormula.label = helper.labelForItemRoll(item);

    // 1. Subtract Cost
    const costsSubracted = rollMenu.free ? true : await item.use.respectUseCost();
    if (!costsSubracted) {
      resetEnhancements(item, actor);
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
      critThreshold: actionType === "attack" ? item.system.attackFormula.critThreshold : 20,
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

    // 7. Send to chat - TODO - rework in the future (together with chat and target rework) - update "prepareMessageDetails" as well
    if (!item.doNotSendToChat && !options.skipChatMessage) {
      const messageDetails = prepareMessageDetails(item, actor, actionType, rolls);
      if (!actionType) sendDescriptionToChat(actor, messageDetails, item);
      else if (actionType === "help") {
        messageDetails.rollTitle += " - Help Action";
        sendDescriptionToChat(actor, messageDetails, item);
      }
      else {
        messageDetails.rollLevel = rollMenu.rollLevel;
        sendRollsToChat(rolls, actor, messageDetails, true, item, options.rollMode);
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

  static async rollFormula(coreFormula, details, actor, options={}) {
    const rollMenu = actor.system.rollMenu;
    coreFormula.label = details.label;

    // 0. Prepare cost
    if (!details.costs) details.costs = {};
    if (rollMenu.apCost) {
      if (details.costs.ap != null) details.costs.ap += rollMenu.apCost;
      else details.costs.ap = rollMenu.apCost;
    }
    if (rollMenu.gritCost) {
      if (details.costs.grit != null) details.costs.grit += rollMenu.gritCost;
      else details.costs.grit = rollMenu.gritCost;
    }

    // 1. Subtract Cost
    if (details.costs) {
      for (const [key, value] of Object.entries(details.costs)) {
        if (!actor.resources[key].canSpend(value)) return;
      }
      // Do spend resources
      for (const [key, value] of Object.entries(details.costs)) {
        actor.resources[key].spend(value);
      }
    }

    // 2. Pre Item Roll Events
    if (["attackCheck", "spellCheck", "attributeCheck", "skillCheck", "initiative"].includes(details.type)) await runEventsFor("rollCheck", actor);
    if (["save"].includes(details.type)) await runEventsFor("rollSave", actor);

    // 3. Evaluate Roll
    const evalData = {rollMenu: rollMenu, afterRollEffects: options.afterRollEffects || []};
    const roll = await helper.evaluateCoreRoll(coreFormula, actor.getRollData(), evalData);
    roll.source = coreFormula.source;

    // 4. Send chat message
    if (!options.skipChatMessage) {
      const label = details.label || `${actor.name} : Roll Result`;
      const rollTitle = details.rollTitle || label;
      const messageDetails = {
        label: label,
        image: actor.img,
        description: details.description,
        against: details.against,
        rollTitle: rollTitle,
        rollLevel: rollMenu.rollLevel
      };
      sendRollsToChat({core: roll}, actor, messageDetails, false, null, options.rollMode);
    }

    // 5. Cleanup - TODO - rework this as well
    finishSheetRoll(roll, actor, rollMenu, details, evalData.afterRollEffects)

    return roll;
  }
}