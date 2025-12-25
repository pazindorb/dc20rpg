import { getLabelFromKey } from "../utils.mjs";
import { sendDescriptionToChat } from "../../chat/chat-message.mjs";
import { itemMeetsUseConditions } from "../conditionals.mjs";
import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { itemDetailsToHtml } from "../items/itemDetails.mjs";
import { handleAfterRollEffectModification } from "../effects.mjs";

//=======================================
//           PREPARE DETAILS            =
//=======================================
export function prepareMessageDetails(item, actor, actionType, rolls) {
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
    sustain: actor.shouldSustain(item),
    applicableEffects: _prepareEffectsFromItems(item)
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
          if (number > 0) effects.push(effect.toObject(false));
        }
        else {
          effects.push(effect.toObject(false));
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
export function finishSheetRoll(roll, actor, rollMenu, details, afterRollEffects) {
  _runCritAndCritFailEvents(roll, actor, rollMenu)
  if (!details.initiative) _respectNat1Rules(roll, actor, details.type, null, rollMenu);
  rollMenu.clear();
  _deleteEffectsMarkedForRemoval(afterRollEffects);
  reenablePreTriggerEvents();
}

export function finishRoll(actor, item, rollMenu, coreRoll, afterRollEffects) {
  const checkKey = item.checkKey;
  if (checkKey) {
    if (actor.inCombat && !rollMenu.ignoreMCP) actor.mcp.apply(checkKey);
    _respectNat1Rules(coreRoll, actor, checkKey, item, rollMenu);
  }
  if (actor.shouldSustain(item)) actor.addSustain(item);
  _runCritAndCritFailEvents(coreRoll, actor, rollMenu)
  rollMenu.clear();
  resetEnhancements(item, actor, true);
  _toggleItem(item);
  _deleteEffectsMarkedForRemoval(afterRollEffects);
  reenablePreTriggerEvents();
  delete item.overridenDamage;
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
    if (["attackCheck", "spellCheck", "att", "mar", "spe"].includes(rollType) && !rollMenu.autoFail) {
      sendDescriptionToChat(actor, {
        rollTitle: "Critical Fail - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you before the start of your next turn.",
      });
      actor.toggleStatusEffect("exposed", { active: true, extras: {untilFirstTimeTriggered: true, untilTargetNextTurnStart: true} });
    }
  }

  if (coreRoll.fail && ["spellCheck", "spe"].includes(rollType)) {
    if (item && !item.system.rollMenu.free) {
      delete item.useCostHistory.resources.ap;
      item.use.revertUseCost();
    }
  }
}

function _toggleItem(item) {
  if (item.system.toggle?.toggleable && item.system.toggle.toggleOnRoll) {
    item.toggle({forceOn: true});
  }
}

function _deleteEffectsMarkedForRemoval(afterRollEffects) {
  if (!afterRollEffects) return;
  afterRollEffects.forEach(afterRoll => handleAfterRollEffectModification(afterRoll));
} 