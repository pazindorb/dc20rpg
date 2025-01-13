import { promptItemRoll } from "../../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../../dialogs/simple-popup.mjs";
import { DC20RPG } from "../config.mjs";
import { applyMultipleHelpPenalty } from "../rollLevel.mjs";
import { generateKey } from "../utils.mjs";
import { companionShare } from "./companion.mjs";
import { collectExpectedUsageCost, subtractAP } from "./costManipulator.mjs";
import { resetEnhancements, resetRollMenu } from "./rollsFromActor.mjs";

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

//===================================
//            HELP ACTION           =
//===================================
export function prepareHelpAction(actor, ignoreMHP) {
  const activeDice = actor.system.help.active; 
  let maxDice = actor.system.help.maxDice;
  if (actor.inCombat && !ignoreMHP) {
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

//===================================
//            MOVE ACTION           =
//===================================
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
  const movePointsUseOption = game.settings.get("dc20rpg", "useMovementPoints");
  const onTurn = movePointsUseOption === "onTurn";
  const onCombat = movePointsUseOption === "onCombat";
  const never = movePointsUseOption === "never";

  if (never) return true; 

  if (onCombat || onTurn) {
    const activeCombat = game.combats.active;
    if (!activeCombat?.started) return true;
    if (onTurn && !_actorsTurn(actor, activeCombat)) return true;
  }
  const movePoints = actor.system.movePoints;
  const newMovePoints = options.isUndo ? movePoints + amount : movePoints - amount;
  if (newMovePoints < -0.1) return Math.abs(newMovePoints);

  await actor.update({["system.movePoints"]: _roundFloat(newMovePoints)});
  return true;
}

function _actorsTurn(actor, activeCombat) {
  const combatantId = activeCombat.current.combatantId;
  const combatant = activeCombat.combatants.get(combatantId);

  const actorsTurn = combatant?.actorId === actor.id;
  if (actorsTurn) return true;

  if (companionShare(actor, "initiative")) {
    const ownerTurn = combatant?.actorId === actor.companionOwner.id;
    if (ownerTurn) return true;
  }
  return false;
}

export async function spendMoreApOnMovement(actor, missingMovePoints) {
  let moveKey = "ground";
  if (actor.hasOtherMoveOptions) {
    moveKey = await game.dc20rpg.tools.getSimplePopup("select", {selectOptions: CONFIG.DC20RPG.moveTypes, header: game.i18n.localize("dc20rpg.dialog.movementType.title"), preselect: "ground"})
  }

  const movePoints = actor.system.movement[moveKey].current;
  if (movePoints <= 0) return missingMovePoints; // We need to avoid infinite loops

  let apSpend = 0;
  let movePointsGained = 0;
  while ((missingMovePoints - movePointsGained) > 0) {
    apSpend++;
    movePointsGained += movePoints;
  }
  const movePointsLeft = Math.abs(missingMovePoints - movePointsGained);
  const proceed = await getSimplePopup("confirm", {header: `You need to spend ${apSpend} AP to make this move. After that you will have ${_roundFloat(movePointsLeft)} Move Poinst left. Proceed?`});
  if (proceed && subtractAP(actor, apSpend)) {
    await actor.update({["system.movePoints"]: _roundFloat(movePointsLeft)});
    return true;
  }
  return missingMovePoints;
}

export async function snapTokenToTheClosetPosition(actor, missingMovePoints, startPosition, endPosition) {
  

  return [missingMovePoints, endPosition];
}

function _roundFloat(float) {
  return Math.round(float * 10)/10;
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