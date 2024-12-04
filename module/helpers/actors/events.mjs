import { _applyDamageModifications } from "../../chat/chat-utils.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../../dialogs/simple-popup.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./attrAndSkills.mjs";
import { applyDamage, applyHealing } from "./resources.mjs";

let preTriggerTurnedOffEvents = [];
/**
 * EVENT EXAMPLES:
 * "eventType": "damage", "label": "Rozpierdol", "trigger": "turnStart", "value": 1, "type": "fire", "continuous": "true"
 * "eventType": "healing", "label": "Rozpierdol", "trigger": "turnEnd", "value": 2, "type": "heal"
 * "eventType": "saveRequest", "label": "Fear Me", "trigger": "turnEnd", "checkKey": "mig", "statuses": ["rattled", "charmed"]
 * "eventType": "saveRequest/checkRequest", "label": "Exposee", "trigger": "turnStart", "checkKey": "mig", "statuses": ["exposed"], "against": "14"
 * "eventType": "saveRequest", "label": "That Hurts", "trigger": "damageTaken/healingTaken", "checkKey": "mig", "statuses": ["exposed"]
 * "eventType": "basic", "label": "That Hurts but once", "trigger": "damageTaken", "postTrigger":"disable/delete", "preTrigger": "disable/skip" "reenable": "turnStart", "effectName": "Hunter's Mark"
 * lista triggerów: "turnStart", "turnEnd", "damageTaken", "healingTaken", "attack"
 * triggers to add:
 * "targeted" - when you are a target of an attack - 
 * "diceRoll" - when you roll a dice?
 */
export async function runEventsFor(trigger, actor, filters={}) {
  let eventsToRun = actor.system.parsedEvents.filter(event => event.trigger === trigger);
  eventsToRun = _filterEvents(eventsToRun, filters);

  for (const event of eventsToRun) {
    let runTrigger = true;
    runTrigger = await _runPreTrigger(event, actor);  // For now preTrigger works only for itemRolls
    if (!runTrigger) continue;

    switch(event.eventType) {
      case "damage":
        // If actor is on deaths door continious damage shouldn't be applied
        if (event.continuous && actor.system.death.active) return;

        // Check if damage should be reduced
        let dmg = {
          value: parseInt(event.value),
          source: event.label,
          dmgType: event.type
        }
        dmg = _applyDamageModifications(dmg, actor.system.damageReduction); 
        await applyDamage(actor, dmg);
        break;

      case "healing":
        const heal = {
          source: event.label,
          value: parseInt(event.value),
          healType: event.type
        };
        await applyHealing(actor, heal);
        break;

      case "checkRequest":
        const checkDetails = prepareCheckDetailsFor(actor, event.checkKey, event.against, event.statuses, event.label);
        const checkRoll = await promptRollToOtherPlayer(actor, checkDetails);
        _rollOutcomeCheck(checkRoll, event, actor);
        if (event.against && event.onSuccess) {

        }
        break;

      case "saveRequest": 
        const saveDetails = prepareSaveDetailsFor(actor, event.checkKey, event.against, event.statuses, event.label);
        const saveRoll = await promptRollToOtherPlayer(actor, saveDetails);
        _rollOutcomeCheck(saveRoll, event, actor);
        break;
      
      case "basic":
        break;

      default:
        console.warn(`Unknown event type: ${event.eventType}`);
    }
    _runPostTrigger(event, actor);
  }
}

function _filterEvents(events, filters) {
  if (!filters) return events;

  if (filters.otherActorId) {
    events = events.filter(event => event.actorId === filters.otherActorId);
  }
  if (filters.amount) {
    events = events.filter(event => {
      if (event.minimum) {
        if (filters.amount >= event.minimum) return true;
        else return false;
      }
      return true;
    });
  }
  return events;
}

function _rollOutcomeCheck(roll, event, actor) {
  if (!roll) return;
  if (!event.against) return;
  const effect = actor.getEffectWithName(event.effectName);
  if (!effect) return;

  if (event.onSuccess && roll.total >= event.against) {
    switch (event.onSuccess) {
      case "disable":
        effect.update({disabled: true});
        break;
  
      case "delete": 
        effect.delete();
        break;
  
      default:
        console.warn(`Unknown on success type: ${event.onSuccess}`);
    }
  }
  else if (event.onFail && roll.total < event.against) {
    switch (event.onFail) {
      case "disable":
        effect.update({disabled: true});
        break;
  
      case "delete": 
        effect.delete();
        break;
  
      default:
        console.warn(`Unknown on fail type: ${event.onFail}`);
    }
  }
}

async function _runPreTrigger(event, actor) {
  if (!event.preTrigger) return true;
  const confirmation = await getSimplePopup("confirm", {header: `Do you want to use "${event.effectName}" as a part of that action?`});
  if (!confirmation) {
    // Disable event until enabled by reenablePreTriggerEvents() method
    if (event.preTrigger === "disable") {
      const effect = actor.getEffectWithName(event.effectName);
      if (effect) {
        await effect.update({disabled: true});
        preTriggerTurnedOffEvents.push(effect);
      }
      return false;
    }
    if (event.preTrigger === "skip") {
      return false;
    }
  }
  return true;
}

function _runPostTrigger(event, actor) {
  if (!event.postTrigger) return;
  const effect = actor.getEffectWithName(event.effectName);
  if (!effect) return;
  
  switch (event.postTrigger) {
    case "disable":
      effect.update({disabled: true});
      break;

    case "delete": 
      effect.delete();
      break;

    default:
      console.warn(`Unknown post trigger type: ${event.postTrigger}`);
  }
}

export function reenableEffects(reenable, actor) {
  const eventsToReenable = actor.allEvents.filter(event => event.reenable === reenable);

  for (const event of eventsToReenable) {
    const effect = actor.getEffectWithName(event.effectName);
    if (effect) effect.update({disabled: false});
  }
}

export function reenablePreTriggerEvents() {
  for(const effect of preTriggerTurnedOffEvents) {
    effect.update({disabled: false});
  }
  preTriggerTurnedOffEvents = [];
}

export function parseEventsOn(actor) {
  const events = actor.system.events;
  if (!events) return;
  const parsed = [];
  for(const json of events) {
    try {
      const obj = JSON.parse(`{${json}}`);
      parsed.push(obj)
    } catch (e) {
      console.warn(`Cannot parse event json {${json}} with error: ${e}`)
    }
  }
  actor.system.parsedEvents = parsed;
}

export function parseEvent(event) {
  if (!event) return;
  try {
    const obj = JSON.parse(`{${event}}`);
    return obj;
  } catch (e) {
    console.warn(`Cannot parse event json {${event}} with error: ${e}`)
  }
}

