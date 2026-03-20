import { companionShare } from "../helpers/actors/companion.mjs";

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

/** @deprecated */
export function hasStatusWithId(actor, statusId) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.statuses.hasStatusWithId' method is deprecated, and will be removed in the later system version. Use 'actor.statuses.has' instead.", { since: " 0.10.5", until: "0.11.0", once: true });
  return actor.statuses.has(statusId);
}

/** @deprecated since v0.10.5 until 0.11.0 */
export function getStatusWithId(actor, statusId) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.statuses.getStatusWithId' method is deprecated, and will be removed in the later system version. Use 'actor.statuses.get' instead.", { since: " 0.10.5", until: "0.11.0", once: true });
  return actor.statuses.get(statusId);
}

export function enhanceStatusEffectWithExtras(effect, extras) {
  if (!extras) return effect;
  const changes = effect.changes;

  if (extras.mergeDescription) {
    effect.description += extras.mergeDescription;
  }
  if (extras.untilFirstTimeTriggered) {
    changes.forEach(change => _enhnanceDynamicRollModifier(change));
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
  if (extras.sustain) {
    effect.system.sustained = extras.sustain;
  }

  if (extras.forOneMinute) {
    effect.duration.rounds = 5;
    effect.system.duration.useCounter = true;
    effect.system.duration.onTimeEnd = "delete";
  }
  else if (extras.forXRounds) {
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

function _enhnanceDynamicRollModifier(change) {
  if (change.key.includes("system.dynamicRollModifier.")) {
    change.value = '"afterRoll": "delete", ' + change.value;
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
  if (actor.statuses.has(statusId)) {
    if (currentHP > treshold) removeStatusWithIdFromActor(actor, statusId); 
  }
  else {
    if (currentHP <= treshold) addStatusWithIdToActor(actor, statusId);
  }
}