import { promptItemRoll } from "../../dialogs/roll-prompt.mjs";
import { DC20RPG } from "../config.mjs";
import { applyMultipleHelpPenalty } from "../rollLevel.mjs";
import { generateKey, getValueFromPath } from "../utils.mjs";
import { collectExpectedUsageCost, subtractAP } from "./costManipulator.mjs";
import { resetEnhancements, resetRollMenu } from "./rollsFromActor.mjs";

export function prepareHelpAction(actor) {
  const activeDice = actor.system.help.active; 
  let maxDice = actor.system.help.maxDice;
  if (_inCombat(actor)) {
    maxDice = Math.max(applyMultipleHelpPenalty(actor, maxDice), 4); 
  }
  activeDice[generateKey()] = `d${maxDice}`;
  actor.update({["system.help.active"]: activeDice});
}

export async function clearHelpDice(actor, key) {
  if (key) {
    await actor.update({[`system.help.active.-=${key}`]: null});
  }
  else {
    for (const key of Object.keys(actor.system.help.active)) {
      await actor.update({[`system.help.active.-=${key}`]: null})
    }
  }
}

function _inCombat(actor) {
  if (actor.inCombat) return true;
  else if (_companionCondition(actor, "initiative")) {
    return actor.companionOwner.inCombat;
  }
  return false;
}

export async function addBasicActions(actor) {
  const actionsData = [];
  for (const uuid of Object.values(DC20RPG.basicActionsItemsUuid)) {
    const action = await fromUuid(uuid);
    const data = action.toObject();
    data.flags.dc20BasicActionsSource = uuid;
    actionsData.push(data);
  }
  await actor.createEmbeddedDocuments("Item", actionsData);
  await actor.update({["flags.basicActionsAdded"]: true})
}

export async function makeMoveAction(actor, options={}) {
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

export async function subtractMovePoints(actor, amount, options) {
  if (!options.skipCombatCheck) {
    const activeCombat = game.combats.active;
    if (!activeCombat?.started) return true;
    const combatantId = activeCombat.current.combatantId;
    const combatant = activeCombat.combatants.get(combatantId);
    // We only spend move points when creature is moving on its own turn
    if (combatant.actorId !== actor.id) return true;
  }

  const movePoints = actor.system.movePoints;
  const newMovePoints = options.isUndo ? movePoints + amount : movePoints - amount;
  if (newMovePoints < -0.1) {
    ui.notifications.error("Not enough movement!");
    return false;
  }

  await actor.update({["system.movePoints"]: _roundFloat(newMovePoints)});
  return true;
}

function _roundFloat(float) {
  return Math.round(float * 10)/10;
}

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

function _companionCondition(actor, keyToCheck) {
	if (actor.type !== "companion") return false;
	if (!actor.companionOwner) return false;
	return getValueFromPath(actor, `system.shareWithCompanionOwner.${keyToCheck}`);
}