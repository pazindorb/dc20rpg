import { sendDescriptionToChat } from "../../chat/chat-message.mjs";
import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { handleAfterRollEffectModification } from "../effects.mjs";

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