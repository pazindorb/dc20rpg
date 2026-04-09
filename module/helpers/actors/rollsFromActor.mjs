import { reenablePreTriggerEvents, runEventsFor } from "./events.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { DC20ChatMessage } from "../../sidebar/chat/chat-message.mjs";
import { runPostRollEffectActions } from "../effects.mjs";

//=======================================
//              FINISH ROLL             =
//=======================================
export function finishSheetRoll(roll, actor, rollMenu, sheetRollData) {
  _runCritAndCritFailEvents(roll, actor, rollMenu)
  if (!sheetRollData.initiative) _respectNat1Rules(roll, actor, sheetRollData.type, null, rollMenu);
  rollMenu.clear();
  sheetRollData.clearEnhancements();
  runPostRollEffectActions();
  reenablePreTriggerEvents();
}

export function finishRoll(actor, item, rollMenu, coreRoll) {
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
  runPostRollEffectActions();
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
        enh.clear();
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
      DC20ChatMessage.descriptionMessage({
        rollTitle: "Critical Fail - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you before the start of your next turn.",
      }, actor);
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