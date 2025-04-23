import { sendEffectRemovedMessage } from "../../chat/chat-message.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../../dialogs/simple-popup.mjs";
import { getEffectFrom } from "../effects.mjs";
import { runTemporaryMacro } from "../macros.mjs";
import { calculateForTarget } from "../targets.mjs";
import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "./attrAndSkills.mjs";
import { canSubtractBasicResource, canSubtractCustomResource, regainBasicResource, regainCustomResource, subtractBasicResource, subtractCustomResource } from "./costManipulator.mjs";
import { applyDamage, applyHealing } from "./resources.mjs";

let preTriggerTurnedOffEvents = [];
/**
 * EVENT EXAMPLES:
 * "eventType": "damage", "label": "Rozpierdol", "trigger": "turnStart", "value": 1, "type": "fire", "continuous": "true"
 * "eventType": "healing", "label": "Rozpierdol", "trigger": "turnEnd", "value": 2, "type": "heal"
 * "eventType": "saveRequest", "label": "Fear Me", "trigger": "turnEnd", "checkKey": "mig", "statuses": ["rattled", "charmed"]
 * "eventType": "saveRequest/checkRequest", "label": "Exposee", "trigger": "turnStart", "checkKey": "mig", "statuses": ["exposed"], "against": "14"
 * "eventType": "saveRequest", "label": "That Hurts", "trigger": "damageTaken/healingTaken", "checkKey": "mig", "statuses": ["exposed"]
 * "eventType": "basic", "label": "That Hurts but once", "trigger": "damageTaken", "postTrigger":"disable/delete", "preTrigger": "disable/skip" "reenable": "turnStart"
 * lista triggerów: "turnStart", "turnEnd", "damageTaken", "healingTaken", "attack"
 * triggers to add:
 * "targeted" - when you are a target of an attack - 
 * "diceRoll" - when you roll a dice?
 */
export async function runEventsFor(trigger, actor, filters=[], extraMacroData={}, specificEvent) {
  let eventsToRun = specificEvent ? [specificEvent] : actor.activeEvents.filter(event => event.trigger === trigger);
  eventsToRun = _filterEvents(eventsToRun, filters);
  eventsToRun = _sortByType(eventsToRun);

  for (const event of eventsToRun) {
    let runTrigger = true;
    runTrigger = await _runPreTrigger(event, actor);
    if (!runTrigger) continue;

    const target = {
      system: {
        damageReduction: actor.system.damageReduction,
        healingReduction: actor.system.healingReduction
      }
    }
    switch(event.eventType) {
      case "damage":
        // Check if damage should be reduced
        let dmg = {
          value: parseInt(event.value),
          source: event.label,
          type: event.type
        }
        dmg = calculateForTarget(target, {clear: {...dmg}, modified: {...dmg}}, {isDamage: true});
        await applyDamage(actor, dmg.modified, {fromEvent: true});
        break;

      case "healing":
        let heal = {
          source: event.label,
          value: parseInt(event.value),
          type: event.type
        };
        heal = calculateForTarget(target, {clear: {...heal}, modified: {...heal}}, {isHealing: true});
        await applyHealing(actor, heal.modified, {fromEvent: true});
        break;

      case "checkRequest":
        const checkDetails = prepareCheckDetailsFor(event.checkKey, event.against, event.statuses, event.label);
        const checkRoll = await promptRollToOtherPlayer(actor, checkDetails);
        await _rollOutcomeCheck(checkRoll, event, actor);
        break;

      case "saveRequest": 
        const saveDetails = prepareSaveDetailsFor(event.checkKey, event.against, event.statuses, event.label);
        const saveRoll = await promptRollToOtherPlayer(actor, saveDetails);
        await _rollOutcomeCheck(saveRoll, event, actor);
        break;

      case "resource":
        await _resourceManipulation(event.value, event.resourceKey, event.custom, event.label, actor);
        break;

      case "macro": 
        const effect = getEffectFrom(event.effectId, actor);
        if (!effect) break;
        const command = effect.flags.dc20rpg?.macro;
        if (!command) break;
        await runTemporaryMacro(command, effect, {actor: actor, effect: effect, event: event, extras: extraMacroData});
        break;
      
      case "basic":
        break;

      default:
        await _runCustomEventTypes(event, actor, effect);
    }
    _runPostTrigger(event, actor);
  }
}

function _filterEvents(events, filters) {
  if (!filters) return events;
  if (filters.length === 0) return events;

  for (const filter of filters) {
    events = events.filter(event => {
      if (filter.required || event.hasOwnProperty(filter.eventField)) {
        return filter.filterMethod(event[filter.eventField]);
      }
      else return true;
    })
  }
  return events;
}

function _sortByType(events) {
  const resourceManipulation = [];
  const macro = [];
  const requests = [];
  const basic = [];

  events.forEach(event => {
    switch (event.eventType) {
      case "damage": case "healing": case "resource":
        resourceManipulation.push(event); break;
      case "macro": 
        macro.push(event); break;
      case "checkRequest": case "saveRequest":
        requests.push(event); break;
      default:
        basic.push(event); break;
    }
  })

  return [
    ...resourceManipulation,
    ...macro,
    ...requests,
    ...basic
  ]
}

async function _rollOutcomeCheck(roll, event, actor) {
  if (!roll) return;
  if (!event.against) return;

  if (event.onSuccess && roll.total >= event.against) {
    switch (event.onSuccess) {
      case "disable":
        _disableEffect(event.effectId, actor);
        break;
  
      case "delete": 
        _deleteEffect(event.effectId, actor);
        break;
  
      case "runMacro": 
        const effect = getEffectFrom(event.effectId, actor);
        if (!effect) break;
        const command = effect.flags.dc20rpg?.macro;
        if (!command) break;
        await runTemporaryMacro(command, effect, {actor: actor, effect: effect, event: event, extras: {success: true}});
        break;

      default:
        console.warn(`Unknown on success type: ${event.onSuccess}`);
    }
  }
  else if (event.onFail && roll.total < event.against) {
    switch (event.onFail) {
      case "disable":
        _disableEffect(event.effectId, actor);
        break;
  
      case "delete": 
        _deleteEffect(event.effectId, actor);
        break;

      case "runMacro": 
        const effect = getEffectFrom(event.effectId, actor);
        if (!effect) break;
        const command = effect.flags.dc20rpg?.macro;
        if (!command) break;
        await runTemporaryMacro(command, effect, {actor: actor, effect: effect, event: event, extras: {success: false}});
        break;
  
      default:
        console.warn(`Unknown on fail type: ${event.onFail}`);
    }
  }
}

async function _resourceManipulation(value, key, custom, label, actor) {
  const canSubtract = custom ? canSubtractCustomResource : canSubtractBasicResource;
  const regain = custom ? regainCustomResource : regainBasicResource;
  const subtract = custom ? subtractCustomResource : subtractCustomResource;

  const cost = {
    value: value,
    name: label
  }
  // Subtract
  if (value > 0) {
    if (canSubtract(key, actor, cost)) {
      await subtract(key, actor, value, true);
      ui.notifications.info(`"${label}" - subtracted ${value} from ${key}`);
    }
  }
  // Regain
  if (value < 0) {
    await regain(key, actor, Math.abs(value), true);
    ui.notifications.info(`"${label}" - regained ${Math.abs(value)} ${key}`);
  }
}

async function _runPreTrigger(event, actor) {
  if (!event.preTrigger) return true;
  const label = event.label || event.effectName;
  const confirmation = await getSimplePopup("confirm", {header: `Do you want to use "${label}" as a part of that action?`});
  if (!confirmation) {
    // Disable event until enabled by reenablePreTriggerEvents() method
    if (event.preTrigger === "disable") {
      const effect = await _disableEffect(event.effectId, actor);
      if (effect) preTriggerTurnedOffEvents.push(effect); 
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
  switch (event.postTrigger) {
    case "disable":
      _disableEffect(event.effectId, actor);
      break;

    case "delete": 
      _deleteEffect(event.effectId, actor);
      break;

    default:
      console.warn(`Unknown post trigger type: ${event.postTrigger}`);
  }
}

export async function reenableEventsOn(reenable, actor, filters=[]) {
  let eventsToReenable = actor.allEvents.filter(event => event.reenable === reenable);
  eventsToReenable = _filterEvents(eventsToReenable, filters);

  for (const event of eventsToReenable) {
    await _enableEffect(event.effectId, actor);
  }
}

export function reenablePreTriggerEvents() {
  for(const effect of preTriggerTurnedOffEvents) {
    effect.enable({dontUpdateTimer: true});
  }
  preTriggerTurnedOffEvents = [];
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

async function _deleteEffect(effectId, actor) {
  const effect = getEffectFrom(effectId, actor);
  if (!effect) return;
  sendEffectRemovedMessage(actor, effect);
  await effect.delete();
}

async function _disableEffect(effectId, actor) {
  const effect = getEffectFrom(effectId, actor, {active: true});
  if (!effect) return;
  await effect.disable();
  return effect;
}

async function _enableEffect(effectId, actor) {
  const effect = getEffectFrom(effectId, actor, {disabled: true});
  if (!effect) return;
  await effect.enable();
  return effect;
}

export async function runInstantEvents(effect, actor) {
  if (!effect.changes) return;

  for (const change of effect.changes) {
    if (change.key === "system.events" && change.value.includes('"instant"')) {
      const event = await parseEvent(change.value);
      event.effectId = effect.id;
      await runEventsFor("instantTrigger", actor, {}, {}, event);
    }
  }
}

//=================================
//=       CUSTOM EVENT TYPES      =
//=================================
export function registerEventType(eventType, method, displayedLabel) {
  CONFIG.DC20Events[eventType] = method;
  CONFIG.DC20RPG.eventTypes[eventType] = displayedLabel;
}

export function registerEventTrigger(trigger, displayedLabel) {
  CONFIG.DC20RPG.allEventTriggers[trigger] = displayedLabel;
}

export function registerEventReenableTrigger(trigger, displayedLabel) {
  CONFIG.DC20RPG.reenableTriggers[trigger] = displayedLabel;
}

async function _runCustomEventTypes(event, actor, effect) {
  const method = CONFIG.DC20Events[event.eventType];
  if (method) await method(event, actor, effect);
}

//=================================
//=        FILTER METHODS         =
//=================================
export function effectEventsFilters(effectName, statuses, effectKey) {
  const filters = [];
  if (effectName !== undefined) {
    filters.push({
      required: false,
      eventField: "withEffectName",
      filterMethod: (field) => {
        if (!field) return true;
        return field === effectName
      }
    })
  }
  if (effectKey !== undefined) {
    filters.push({
      required: false,
      eventField: "withEffectKey",
      filterMethod: (field) => {
        if (!field) return true;
        return field === effectKey
      }
    })
  }
  if (statuses !== undefined) {
    filters.push({
      required: false,
      eventField: "withStatus",
      filterMethod: (field) => {
        if (!field) return true;
        return statuses?.has(field);
      }
    })
  }
  return filters;
}

export function minimalAmountFilter(amount) {
  const filter = {
    required: false,
    eventField: "minimum",
    filterMethod: (field) => {
      if (!field) return true;
      return amount >= field;
    }
  }
  return [filter];
}

export function currentRoundFilter(actor, currentRound) {
  const filter = {
    required: true,
    eventField: "effectId",
    filterMethod: (field) => {
      const effect = getEffectFrom(field, actor);
      if (!effect) return true;
      return effect.duration.startRound < currentRound;
    }
  }
  return [filter];
}

export function actorIdFilter(actorId) {
  const filter = {
    required: true,
    eventField: "actorId",
    filterMethod: (field) => {
      if (!field) return true;
      return field === actorId
    }
  }
  return [filter];
}

export function triggerOnlyForIdFilter(expecetdId) {
  const filter = {
    required: false,
    eventField: "triggerOnlyForId",
    filterMethod: (field) => {
      if (!field) return true;
      return field === expecetdId;
    }
  }
  return [filter];
}

export function restTypeFilter(expectedRests) {
  const filter = {
    required: false,
    eventField: "restType",
    filterMethod: (field) => {
      if (!field) return true;
      return expectedRests.includes(field);
    }
  }
  return [filter];
}