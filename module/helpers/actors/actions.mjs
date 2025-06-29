import { promptItemRoll } from "../../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../../dialogs/simple-popup.mjs";
import { applyMultipleHelpPenalty } from "../rollLevel.mjs";
import { generateKey, roundFloat } from "../utils.mjs";
import { collectExpectedUsageCost, subtractAP } from "./costManipulator.mjs";
import { resetEnhancements, resetRollMenu } from "./rollsFromActor.mjs";

export async function addBasicActions(actor) {
  const actionsData = [];
  for (const [key, uuid] of Object.entries(CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.basicActionsItems)) {
    const action = await fromUuid(uuid);
    const data = action.toObject();
    data.flags.dc20BasicActionsSource = uuid;
    data.flags.dc20BasicActionKey = key;
    actionsData.push(data);
  }

  if (actor.type === "character") {
    const uuid = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.unarmedStrike;
    const action = await fromUuid(uuid);
    const data = action.toObject();
    data.flags.dc20BasicActionsSource = uuid;
    data.flags.dc20BasicActionKey = "unarmedStrike";
    actionsData.push(data);
  }
  await actor.createEmbeddedDocuments("Item", actionsData);
  await actor.update({["flags.basicActionsAdded"]: true})
}

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
export function prepareHelpAction(actor, options) {
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
  const movePoints = actor.system.movement[selectedMovement].current;
  if (movePoints <= 0) return missingMovePoints; // We need to avoid infinite loops

  let apSpend = 0;
  let movePointsGained = 0;
  while ((missingMovePoints - movePointsGained) > 0) {
    apSpend++;
    movePointsGained += movePoints;
  }
  const movePointsLeft = Math.abs(missingMovePoints - movePointsGained);
  const proceed = await getSimplePopup("confirm", {header: `You need to spend ${apSpend} AP to make this move. After that you will have ${roundFloat(movePointsLeft)} Move Points left. Proceed?`});
  if (proceed && subtractAP(actor, apSpend)) {
    await actor.update({["system.movePoints"]: roundFloat(movePointsLeft)});
    return true;
  }
  return missingMovePoints;
}

//===================================
//            HELD ACTION           =
//===================================
export function heldAction(item, actor) {
  const apCost = collectExpectedUsageCost(actor, item)[0].actionPoint;
  if (!subtractAP(actor, apCost)) return;

  const rollMenu = item.flags.dc20rpg.rollMenu;
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
  resetRollMenu(rollMenu, item);
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