import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";

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

export function toggleStatusOn(statusId, owner, addOrRemove) {
  if (addOrRemove === 1) addStatusWithIdToActor(owner, statusId);
  if (addOrRemove === 3) removeStatusWithIdFromActor(owner, statusId);
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

  if (extras.mergeDescription) {
    effect.description += extras.mergeDescription;
  }
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
    const activeCombat = game.combats.active;
    if (activeCombat && activeCombat.started) {
      const isCurrent = _isActorCurrentCombatant(extras.actorId, activeCombat);
      if (isCurrent) changes.push(_newEvent("actorWithIdEndsNextTurn", effect.name, extras.actorId));
      else changes.push(_newEvent("actorWithIdEndsTurn", effect.name, extras.actorId));
    }
    else {
      changes.push(_newEvent("actorWithIdEndsTurn", effect.name, extras.actorId));
    }
  }
  if (extras.repeatedSave && extras.repeatedSaveKey !== "") {
    changes.push(_repeatedSave(effect.name, extras.repeatedSaveKey, extras.against, extras.id))
  }
  if (extras.forOneMinute) {
    effect.duration.rounds = 5;
    effect.system.duration.useCounter = true;
    effect.system.duration.onTimeEnd = "delete";
  }
  if (extras.forXRounds) {
    effect.duration.rounds = extras.forXRounds;
    effect.system.duration.useCounter = true;
    effect.system.duration.onTimeEnd = "delete";
  }
  effect.changes = changes;
  return effect;
}

function _isActorCurrentCombatant(actorId, combat) {
  for (const combatant of combat.activeCombatants) {
    if (combatant.actor.id === actorId) return true;
    
    if (combatant.companions && combatant.companions.length !== 0) {
      // Check companions
      const comapnionIds = combatant.companions;
      for (const cmb of combat.combatants) {
        if (!comapnionIds.includes(cmb.id)) continue;
        if (companionShare(cmb.actor, "initiative")) {
          if (cmb.actor.id === actorId) return true;
        }
      }
    }
  }
  return false;
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

export function fullyStunnedCheck(actor) {
  if (!actor.hasStatus("stunned")) return;
  const stunned = actor.statuses.find(status => status.id === "stunned");
  if (!stunned) return;

  // Add Fully Stunned condition
  if (stunned.stack >= 4) {
    if (actor.hasStatus("fullyStunned")) return;
    actor.toggleStatusEffect("fullyStunned", { active: true });
  } 
  
  // Remove Fully Stunned condition
  if (stunned.stack < 4) {
    if (!actor.hasStatus("fullyStunned")) return;
    actor.toggleStatusEffect("fullyStunned", { active: false });
  }
}

export function exhaustionCheck(actor) {
  // Add Dead condition
  if (actor.exhaustion >= 6) {
    if (actor.hasStatus("dead")) return;
    actor.toggleStatusEffect("dead", { active: true });
  }
}

export function dazedCheck(actor) {
  if (actor.hasStatus("dazed")) {
    const sustained = actor.system.sustain;
    for (const sustainKey of Object.keys(sustained)) {
      actor.dropSustain(sustainKey, "You can't Sustain an effect while Dazed.");
    }
  }
}

export function healthThresholdsCheck(currentHP, actor) {
  const maxHP = actor.system.resources.health.max;
  const deathThreshold = actor.type === "character" ? actor.system.death.treshold : 0;

  _checkStatus("bloodied", currentHP, Math.ceil(maxHP/2), actor);
  _checkStatus("wellBloodied", currentHP, Math.ceil(maxHP/4), actor);
  if (actor.type === "character") _checkStatus("deathsDoor", currentHP, 0, actor);
  _checkStatus("dead", currentHP, deathThreshold, actor);
}

function _checkStatus(statusId, currentHP, treshold, actor) {
  if (actor.hasStatus(statusId)) {
    if (currentHP > treshold) removeStatusWithIdFromActor(actor, statusId); 
  }
  else {
    if (currentHP <= treshold) addStatusWithIdToActor(actor, statusId);
  }
}