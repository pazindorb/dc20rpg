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