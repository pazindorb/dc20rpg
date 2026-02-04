import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";
import { roundFloat } from "../utils.mjs";
import { resetEnhancements } from "./rollsFromActor.mjs";
       
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
      if (actor.hasOtherMoveOptions) {
        moveKey = await SimplePopup.open("input", {
          header: game.i18n.localize("dc20rpg.dialog.movementType.title"),
          inputs: [{
            type: "select",
            options: CONFIG.DC20RPG.DROPDOWN_DATA.moveTypes,
            preselected: "ground"
          }]
        });
      }
      else moveKey = "ground";
    }
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
export function holdAction(item, actor) {
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
  const result = await RollDialog.open(actor, item); 
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