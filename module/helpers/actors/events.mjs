import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { DC20Roll } from "../../roll/rollApi.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";
import { DC20ChatMessage } from "../../sidebar/chat/chat-message.mjs";
import { DC20Target } from "../../subsystems/target/target.mjs";
import { runTemporaryMacro } from "../macros.mjs";

let preTriggerTurnedOffEvents = [];

export async function runEventsFor(trigger, actor, filters=[], extraMacroData={}, specificEvent) {
  let eventsToRun = specificEvent ? [specificEvent] : actor.activeEvents.filter(event => event.trigger === trigger);
  eventsToRun = _filterEvents(eventsToRun, filters);
  eventsToRun = _sortByType(eventsToRun);

  const triggered = {
    damage: [],
    healing: [],
    checkRequest: [],
    saveRequest: [],
    resource: [],
    macro: [],
    basic: [],
    custom: []
  };

  // Pre Trigger - Collect triggered events by eventType
  for (const event of eventsToRun) {
    const trigger = await _runPreTrigger(event, actor);
    if (!trigger) continue;

    if (triggered[event.eventType]) triggered[event.eventType].push(event);
    else triggered.custom.push(event);
  }

  // Run events per type
  await _runDamageEvents(triggered.damage, actor);
  await _runHealingEvents(triggered.healing, actor);
  await _runRollRequestEvents(triggered.saveRequest, actor, "save");
  await _runRollRequestEvents(triggered.checkRequest, actor, "check");
  await _runResourceEvents(triggered.resource, actor);
  await _runMacroEvents(triggered.macro, actor, extraMacroData);
  await _runCustomEvents(triggered.custom, actor);

  // Run Post Trigger methods
  for (const event of eventsToRun) _runPostTrigger(event, actor);
}

async function _runDamageEvents(events, actor) {
  if (events.length === 0) return;

  const target = DC20Target.fromActor(actor);
  let skipEventCall = false;
  for (const event of events) {
    if (event.trigger === "damageTaken" || event.trigger === "healingTaken") skipEventCall = true;
    const dmg = {value: parseInt(event.value), source: event.label, type: event.type}
    target.addDamageRoll(dmg);
  }

  await target.calculateDamage({});
  for (const damage of target.calculated.damage) {
    await damage.modified.apply({skipEventCall: skipEventCall});
  }
}
async function _runHealingEvents(events, actor) {
  if (events.length === 0) return;

  const target = DC20Target.fromActor(actor);
  let skipEventCall = false;
  for (const event of events) {
    if (event.trigger === "damageTaken" || event.trigger === "healingTaken") skipEventCall = true;
    const heal = {value: parseInt(event.value), source: event.label, type: event.type};
    target.addHealingRoll(heal);
  }

  await target.calculateHealing({});
  for (const healing of target.calculated.healing) {
    await healing.modified.apply({skipEventCall: skipEventCall});
  }
}
async function _runRollRequestEvents(events, actor, category) {
  if (events.length === 0) return;

  const eventPerKey = _collectRollRequestsPerCheckKey(events);
  for (const combined of eventPerKey.values()) {
    const details = category === "save"
                    ? DC20Roll.prepareSaveDetails(combined.checkKey, {against: combined.against, statuses: combined.statuses, rollTitle: combined.label})
                    : DC20Roll.prepareCheckDetails(combined.checkKey, {against: combined.against, statuses: combined.statuses, rollTitle: combined.label})

    if (combined.events.length > 1) {
      details.description = details.rollTitle;
      details.rollTitle = `Combined ${category === "save" ? "Save" : "Check"}`;
    }
    const roll = await RollDialog.open(actor, details, {sendToActorOwners: true});
    for (const event of combined.events) {
      await _respectRollOutcome(roll, event, actor);
    }
  }
}
async function _runResourceEvents(events, actor) {
  if (events.length === 0) return;
  for (const event of events) {
    await _resourceManipulation(event.value, event.resourceKey, event.label, actor);
  }
}
async function _runMacroEvents(events, actor, extraMacroData) {
  if (events.length === 0) return;
  for (const event of events) {
    const effect = actor.getEffectById(event.effectId);
    if (!effect) continue;
    const command = effect.system.macro;
    if (!command) continue;
    await runTemporaryMacro(command, effect, {actor: actor, effect: effect, event: event, extras: extraMacroData});
  }
}
async function _runCustomEvents(events, actor) {
  if (events.length === 0) return;
  for (const event of events) {
    const effect = actor.getEffectById(event.effectId);
      const method = CONFIG.DC20Events[event.eventType];
      if (method) await method(event, actor, effect);
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

function _collectRollRequestsPerCheckKey(events) {
  const eventPerKey = new Map();
  for (const event of events) {
    if (eventPerKey.has(event.checkKey)) {
      const data = eventPerKey.get(event.checkKey);
      data.label += " / " + event.label
      if (event.against) data.label += ` [DC ${event.against}]`;
      
      data.against = null; // For more than one request we ignore that value
      if (event.statuses) {
        data.statuses = [...data.statuses, ...event.statuses]
      }
      data.events.push(event);
      eventPerKey.set(event.checkKey, data);
    }
    else {
      let label = event.label;
      if (event.against) label += ` [DC ${event.against}]`;

      eventPerKey.set(event.checkKey, {
        events: [event],
        checkKey: event.checkKey,
        against: event.against,
        statuses: event.statuses || [],
        label: label
      })
    }
  }
  return eventPerKey;
}

async function _respectRollOutcome(roll, event, actor) {
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
        const effect = actor.getEffectById(event.effectId);
        if (!effect) break;
        await effect.runMacro({event: event, extras: {success: true}});
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
        const effect = actor.getEffectById(event.effectId);
        if (!effect) break;
        await effect.runMacro({event: event, extras: {success: false}});
        break;
  
      default:
        console.warn(`Unknown on fail type: ${event.onFail}`);
    }
  }
}

async function _resourceManipulation(value, key, label, actor) {
  const resource = actor.resources[key];
  if (!resource) return;
  // Subtract
  if (value > 0) {
    if (resource.canSpend(value)) {
      await resource.spend(value);
      ui.notifications.info(`"${label}" - Subtracted ${value} from ${resource.label}`);
    }
  }
  // Regain
  if (value < 0) {
    await resource.regain(Math.abs(value));
    ui.notifications.info(`"${label}" - Regained ${Math.abs(value)} ${resource.label}`);
  }
}

async function _runPreTrigger(event, actor) {
  if (!event.preTrigger) return true;
  const label = event.label || event.effectName;
  const spendApMessage = `You need to spend 1 AP to trigger "${label}" event as part of that action. Proceed?`;
  const defaultMessage = `Do you want to trigger "${label}" event as a part of that action?`;
  const message = event.preTrigger === "spendAP" ? spendApMessage : (event.customMessage || defaultMessage) ;
  const confirmation = await SimplePopup.confirm(message);
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
  if (event.preTrigger === "spendAP") {
    if (confirmation) {
      const canSpend = actor.resources.ap.checkAndSpend(1);
      if (!canSpend) {
        const effect = await _disableEffect(event.effectId, actor);
        if (effect) preTriggerTurnedOffEvents.push(effect);
      }
      return canSpend;
    }
    else return false;
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
    ui.notifications.error(`Cannot parse event json {${event}} with error: ${e}`)
  }
}

async function _deleteEffect(effectId, actor) {
  const effect = actor.getEffectById(effectId);
  if (!effect) return;
  DC20ChatMessage.effectRemovalMessage(actor, effect);
  await effect.gmDelete();
}

async function _disableEffect(effectId, actor) {
  const effect = actor.getEffectById(effectId);
  if (!effect) return;
  await effect.disable();
  return effect;
}

async function _enableEffect(effectId, actor) {
  const effect = actor.getEffectById(effectId);
  if (!effect) return;
  await effect.enable();
  return effect;
}

export async function runInstantEvents(effect, actor) {
  if (!effect.changes) return;

  for (const change of effect.changes) {
    if (change.key === "system.events" && change.value.includes('"instant"')) {
      const event = await parseEvent(change.value);

      if (event.activeCombatantOnly) {
        if (!actor.myTurnActive) continue;
      }
      if (event.skipIfCaster) {
        if (event.actorId === actor.id) continue;
      }

      event.effectId = effect.id;
      await runEventsFor("instantTrigger", actor, [], {}, event);
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
export function effectEventsFilters(effectName, statuses, effectKey, effectId) {
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
  if (effectId !== undefined) {
    filters.push({
      required: false,
      eventField: "effectId",
      filterMethod: (field) => {
        if (!field) return true;
        return field === effectId;
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

export function skipTempHpChangeOnlyFilter(tempHpChangeOnly) {
  const filter = {
    required: false,
    eventField: "skipTempHpChangeOnly",
    filterMethod: (field) => {
      if (!field) return true;
      return !tempHpChangeOnly;
    }
  }
  return [filter];
}

export function changedResourceFilter(key, opperation) {
  const filters = [];
  filters.push({
    required: true,
    eventField: "changedResource",
    filterMethod: (field) => {
      if (!field) return false;
      return key === field;
    }
  });
  filters.push({
    required: true,
    eventField: "operation",
    filterMethod: (field) => {
      if (!field) return true;
      return opperation === field;
    }
  });
  return filters;
}

export function currentRoundFilter(actor, currentRound) {
  const filter = {
    required: true,
    eventField: "effectId",
    filterMethod: (field) => {
      const effect = actor.getEffectById(field);
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