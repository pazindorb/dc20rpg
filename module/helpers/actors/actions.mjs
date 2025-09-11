import { promptItemRoll } from "../../dialogs/roll-prompt.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { applyMultipleHelpPenalty } from "../rollLevel.mjs";
import { generateKey, roundFloat } from "../utils.mjs";
import { resetEnhancements } from "./rollsFromActor.mjs";

//===================================
//            HELP ACTION           =
//===================================
/**
 * Performs a help action for the actor. 
 * "options" - all are optional: {
 *  "diceValue": Number - value on a dice (ex 8). If provided MHP will also be skipped.
 *  "ignoreMHP": Boolean - If provided MHP will be skipped.
 *  "subtract": Boolean - If provided help dice will be subtracted from the roll instead.
 *  "doNotExpire": Boolean - If provided help dice wont expire at the start of actor's next turn.
 * }
 */
export function prepareHelpAction(actor, options={}) {
  const activeDice = actor.system.help.active; 
  let maxDice = actor.system.help.maxDice;
  if (options.diceValue) maxDice = options.diceValue;
  else if (actor.inCombat && !options.ignoreMHP) {
    maxDice = Math.max(applyMultipleHelpPenalty(actor, maxDice), 4); 
  }
  const subtract = options.subtract ? "-" : "";
  activeDice[generateKey()] = {
    value: `${subtract}d${maxDice}`,
    doNotExpire: options.doNotExpire
  }
  actor.update({["system.help.active"]: activeDice});
}

export async function clearHelpDice(actor, key) {
  if (key) {
    await actor.update({[`system.help.active.-=${key}`]: null});
  }
  else {
    for (const [key, help] of Object.entries(actor.system.help.active)) {
      if (!help.doNotExpire) await actor.update({[`system.help.active.-=${key}`]: null})
    }
  }
}

export function getActiveHelpDice(actor) {
  const dice = {};
  for (const [key, help] of Object.entries(actor.system.help.active)) {
    let icon = "fa-dice";
    switch (help.value) {
      case "d20": case "-d20": icon = "fa-dice-d20"; break;
      case "d12": case "-d12": icon = "fa-dice-d12"; break; 
      case "d10": case "-d10": icon = "fa-dice-d10"; break; 
      case "d8": case "-d8": icon = "fa-dice-d8"; break; 
      case "d6": case "-d6": icon = "fa-dice-d6"; break; 
      case "d4": case "-d4": icon = "fa-dice-d4"; break; 
    }
    dice[key] = {
      formula: help.value,
      icon: icon,
      subtraction: help.value.includes("-"),
      doNotExpire: help.doNotExpire
    }
  }
  return dice;
}

//===================================
//            MOVE ACTION           =
//===================================
/**
 * Performs a move action for the actor. 
 * "options" - all are optional: {
 *  "movePoints": String - specific number of move points gained
 *  "moveType": String - specific movement type (ex. ground)
 * }
 */
export async function makeMoveAction(actor, options={}) {
  const movePointsUseOption = game.settings.get("dc20rpg", "useMovementPoints");
  if (movePointsUseOption === "never") return; // We dont care about move points
  
  let movePoints = options.movePoints;
  if (!movePoints) {
    const moveKey = options.moveType || "ground";
    movePoints = actor.system.movement[moveKey].current;
  }

  const currentMovePoints = actor.system.movePoints || 0;
  const newMovePoints = currentMovePoints + movePoints;
  await actor.update({["system.movePoints"]: newMovePoints});
}

export async function clearMovePoints(actor) {
  await actor.update({["system.movePoints"]: 0});
}

export async function subtractMovePoints(actor, cost) {   
  if (!actor) return true;
  const movePoints = actor.system.movePoints;
  const newMovePoints = movePoints - cost;
  if (newMovePoints < -0.1) return Math.abs(newMovePoints);

  await actor.update({["system.movePoints"]: roundFloat(newMovePoints)});
  return true;
}

export async function spendMoreApOnMovement(actor, missingMovePoints, selectedMovement="ground") {
  const spendExtraAP = game.settings.get("dc20rpg","spendMoreApOnMovePoints");
  if (spendExtraAP === "never") return missingMovePoints;

  const movePoints = actor.system.movement[selectedMovement].current;
  if (movePoints <= 0) return missingMovePoints; // We need to avoid infinite loops

  let apSpend = 0;
  let movePointsGained = 0;
  while ((missingMovePoints - movePointsGained) > 0) {
    apSpend++;
    movePointsGained += movePoints;
  }
  const movePointsLeft = Math.abs(missingMovePoints - movePointsGained);
  let proceed = true;
  if (spendExtraAP === "ask") proceed = await SimplePopup.confirm(`You need to spend ${apSpend} AP to make this move. After that you will have ${roundFloat(movePointsLeft)} Move Points left. Proceed?`);
  if (proceed && actor.resources.ap.checkAndSpend(apSpend)) {
    await actor.update({["system.movePoints"]: roundFloat(movePointsLeft)});
    return true;
  }
  return missingMovePoints;
}

//===================================
//            HELD ACTION           =
//===================================
export function heldAction(item, actor) {
  const cost = item.use.collectUseCost();
  if (!actor.resources.ap.checkAndSpend(cost.resources.ap)) return;

  const rollMenu = item.system.rollMenu;
  const enhancements = {};
  item.allEnhancements.entries().forEach(([key, enh]) => enhancements[key] = enh.number);
  const actionHeld = {
    isHeld: true,
    itemId: item.id,
    itemImg: item.img,
    enhancements: enhancements,
    mcp: null,
    apForAdv: rollMenu.apCost,
    rollsHeldAction: false
  }
  actor.update({["flags.dc20rpg.actionHeld"]: actionHeld});
  resetEnhancements(item, actor);
  rollMenu.clear();
}

export async function triggerHeldAction(actor) {
  const actionHeld = actor.flags.dc20rpg.actionHeld;
  if (!actionHeld.isHeld) return;

  const item = actor.items.get(actionHeld.itemId);
  if (!item) return;
  
  await actor.update({["flags.dc20rpg.actionHeld.rollsHeldAction"]: true});
  const result = await promptItemRoll(actor, item);
  await actor.update({["flags.dc20rpg.actionHeld.rollsHeldAction"]: false});
  if (!result) return;
  clearHeldAction(actor);
}

export function clearHeldAction(actor) {
  const clearActionHeld = {
    isHeld: false,
    itemId: null,
    itemImg: null,
    enhancements: null,
    mcp: null,
    apForAdv: 0,
    rollsHeldAction: false
  }
  actor.update({["flags.dc20rpg.actionHeld"]: clearActionHeld});
}