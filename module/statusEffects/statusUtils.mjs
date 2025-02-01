export function isStackable(statusId) {
  const status = CONFIG.statusEffects.find(e => e.id === statusId);
  if (status) return status.stackable;
  else return false;
}

export async function addStatusWithIdToActor(actor, id, extras) {
  actor.toggleStatusEffect(id, { active: true, extras: extras });
}

export async function removeStatusWithIdFromActor(actor, id) {
  actor.toggleStatusEffect(id, { active: false, extras: {} });
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
    changes.forEach(change => _enhnanceRollLevel(change));
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
    changes.push(_newEvent("actorWithIdEndsNextTurn", effect.name, extras.actorId));
  }
  if (extras.repeatedSave && extras.repeatedSaveKey) {
    changes.push(_repeatedSave(effect.name, extras.repeatedSaveKey, extras.against, extras.id))
  }
  effect.changes = changes;
  return effect;
}

function _newEvent(trigger, label, actorId) {
  let change = `
  "trigger": "${trigger}",
  "eventType": "basic", 
  "label": "${label}",
  "postTrigger": "delete"
  `;
  if (actorId) change = `"actorId": "${actorId}",` + change;
  return {
    key: "system.events",
    mode: 2,
    priority: null,
    value: change
  }
}

function _repeatedSave(label, checkKey, against, statusId) {
  const change = `
  "eventType": "saveRequest", 
  "trigger": "turnEnd", 
  "label": "${label} - Repeated Save", 
  "checkKey": "${checkKey}", 
  "against": "${against}", 
  "statuses": ["${statusId}"], 
  "onSuccess": "delete"
  `;
  return {
    key: "system.events",
    mode: 2,
    priority: null,
    value: change
  }
}

function _enhnanceRollLevel(change) {
  if (change.key.includes("system.rollLevel.")) {
    change.value = '"afterRoll": "delete", ' + change.value;
  }
}

export function doomedToggle(actor, goUp) {
  if (_isImmune(actor, "doomed") && goUp) {
    ui.notifications.warn(`${actor.name} is immune to 'doomed'.`);
    return;
  }
  let doomed = actor.system.death.doomed;
  if (goUp) doomed = Math.min(++doomed, 9);
  else doomed = Math.max(--doomed, 0);
  actor.update({["system.death.doomed"] : doomed});
}

export function exhaustionToggle(actor, goUp) {
  if (_isImmune(actor, "exhaustion") && goUp) {
    ui.notifications.warn(`${actor.name} is immune to 'exhaustion'.`);
    return;
  } 
  let exhaustion = actor.system.exhaustion;
  if (goUp) exhaustion = Math.min(++exhaustion, 6);
  else exhaustion = Math.max(--exhaustion, 0);
  _checkStatus(exhaustion, actor);
  actor.update({["system.exhaustion"] : exhaustion});
}

function _isImmune(actor, key) {
  return actor.system.statusResistances[key].immunity;
}

function _checkStatus(exhaustion, actor) {
  if (exhaustion === 6) addStatusWithIdToActor(actor, "dead");
  if (exhaustion < 6) removeStatusWithIdFromActor(actor, "dead");
}