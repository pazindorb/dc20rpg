import { _applyDamageModifications } from "../../chat/chat-utils.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./attrAndSkills.mjs";
import { applyDamage, applyHealing } from "./resources.mjs";

/**
 * EVENT EXAMPLES:
 * "eventType": "damage", "label": "Rozpierdol", "when": "turnStart", "value": 1, "type": "fire", "continuous": "true"
 * "eventType": "healing", "label": "Rozpierdol", "when": "turnEnd", "value": 2, "type": "heal"
 * "eventType": "saveRequest", "label": "Fear Me", "when": "turnEnd", "checkKey": "mig", "statuses": ["rattled", "charmed"]
 * "eventType": "saveRequest", "label": "Exposee", "when": "turnStart", "checkKey": "mig", "statuses": ["exposed"]
 */
export function runEventsFor(when, actor) {
  const eventsToRun = actor.system.events.filter(event => event.when === when);
  
  for (const event of eventsToRun) {
    switch(event.eventType) {
      case "damage":
        // If actor is on deaths door continious damage shouldn't be applied
        if (event.continuous && actor.system.death.active) return;

        // Check if damage should be reduced
        let dmg = {
          value: event.value,
          source: event.label,
          dmgType: event.type
        }
        dmg = _applyDamageModifications(dmg, actor.system.damageReduction); 
        applyDamage(actor, dmg);
        break;

      case "healing":
        const heal = {
          source: event.label,
          value: event.value,
          healType: event.type
        };
        applyHealing(actor, heal);
        break;

      case "checkRequest":
        const checkDetails = prepareCheckDetailsFor(actor, event.checkKey, event.against, event.statuses, event.label);
        promptRollToOtherPlayer(actor, checkDetails);
        break;

      case "saveRequest": 
        const saveDetails = prepareSaveDetailsFor(actor, event.checkKey, event.against, event.statuses, event.label);
        promptRollToOtherPlayer(actor, saveDetails);
        break;
      
      default:
        console.warn(`Unknown event type: ${event.eventType}`);
    }
  }
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
      console.warn(`Cannot parse event json: ${e}`)
    }
  }
  actor.system.events = parsed;
}

