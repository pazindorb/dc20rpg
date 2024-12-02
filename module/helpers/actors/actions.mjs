import { DC20RPG } from "../config.mjs";
import { applyMultipleHelpPenalty } from "../rollLevel.mjs";
import { generateKey } from "../utils.mjs";

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

export async function subtractMovePoints(actor, amount, skipCombatCheck) {
  if (!skipCombatCheck) {
    const activeCombat = game.combats.active;
    if (activeCombat?.started) {
      const combatantId = activeCombat.current.combatantId;
      const combatant = activeCombat.combatants.get(combatantId);
      // We only spend move points when creature is moving on its own turn
      if (combatant.actorId !== actor.id) return true;
    }
  }

  const movePoints = actor.system.movePoints;
  const newMovePoints = movePoints -  amount;
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