import { generateKey } from "../helpers/utils.mjs";

export async function addStatusWithIdToActor(actor, id, extras) {
  actor.toggleStatusEffect(id, { active: true, extras: extras });
}

export async function removeStatusWithIdFromActor(actor, id) {
  actor.toggleStatusEffect(id, { active: false });
}

export function hasStatusWithId(actor, statusId) {
  for ( const status of actor.statuses) {
    if (status.id === statusId) return true;
  }
  return false;
}

export function getStatusWithId(actor, statusId) {
  for ( const status of actor.statuses) {
    if (status.id === statusId) return status;
  }
  return null;
}

export function enhanceStatusEffectWithExtras(effect, extras) {
  if (!extras) return effect;
  const changes = effect.changes;

  if (extras.untilFirstTimeTriggered) {
    changes.push(_newEvent("targetConfirm", effect.name, extras.actorId)); 
  }
  if (extras.untilTargetNextTurnStart) {
    changes.push(_newEvent("turnStart", effect.name, extras.actorId));
  }
  if (extras.untilTargetNextTurnEnd) {
    changes.push(_newEvent("turnEnd", effect.name, extras.actorId));
  }
  if (extras.untilYourNextTurnStart) {
    changes.push(_newEvent("actorWithIdStartsTurn", effect.name, extras.actorId));
  }
  if (extras.untilYourNextTurnEnd) {
    changes.push(_newEvent("actorWithIdEndsTurn", effect.name, extras.actorId));
  }
  effect.changes = changes;
  return effect;
}

function _newEvent(trigger, label, actorId) {
  const change = `
  "trigger": "${trigger}",
  "eventType": "basic", 
  "label": "${label}",
  "postTrigger": "delete",
  "actorId": "${actorId}"
  `;
  return {
    key: "system.events",
    mode: 2,
    priority: null,
    value: change
  }
}