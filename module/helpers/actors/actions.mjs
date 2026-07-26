import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { roundFloat } from "../utils.mjs";
       
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
    let moveKey = options.moveType;
    if (!moveKey) {
      moveKey = await _fromAvailableMovement(actor);
    }
    if (moveKey === "token") {
      moveKey = _fromTokenMovement(actor);
    }
    movePoints = actor.system.movement[moveKey].current;
  }

  const bonusMovePoints = options.bonusMove || 0;
  const currentMovePoints = actor.system.movePoints || 0;
  const newMovePoints = currentMovePoints + movePoints + bonusMovePoints;
  await actor.update({["system.movePoints"]: newMovePoints});
}

async function _fromAvailableMovement(actor) {
  const options = {};
  for (const [key, movement] of (Object.entries(actor.system.movement))) {
    if (movement.current > 0) options[key] = movement.label;
  }

  const keys = Object.keys(options)
  if (keys.length === 0) return "ground";
  if (keys.length === 1) return keys[0];

  let moveKey = await SimplePopup.open("input", {
    header: game.i18n.localize("dc20rpg.dialog.movementType.title"),
    inputs: [{
      type: "select",
      options: options,
      preselected: "ground"
    }]
  });
  return moveKey || "ground"; // Fallback
}

function _fromTokenMovement(actor) {
  const token = actor.getActiveTokens()[0];
  if (!token) return "ground";
  return token.document.movementAction;
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