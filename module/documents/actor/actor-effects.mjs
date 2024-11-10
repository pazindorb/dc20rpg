import { parseEvent } from "../../helpers/actors/events.mjs";
import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";
import { getValueFromPath, parseFromString } from "../../helpers/utils.mjs";

export function enhanceEffects(actor) {
  for (const effect of actor.effects) {
    for (const change of effect.changes) {
      const value = change.value;
      
      // formulas start with "<:" and end with ":>"
      if (value.includes("<:") && value.includes(":>")) {
        // We want to calculate that formula and repleace it with value calculated
        const formulaRegex = /<:(.*?):>/g;
        const formulasFound = value.match(formulaRegex);

        formulasFound.forEach(formula => {
          const formulaString = formula.slice(2,-2); // We need to remove <: and :>
          const calculated = evaluateDicelessFormula(formulaString, actor.getRollData(true));
          change.value = change.value.replace(formula, calculated.total); // Replace formula with calculated value
        })
      }
    }
  }
}

export function modifyActiveEffects(effects, actor) {
  for ( const effect of effects ) {
    const item = effect.getSourceItem();
    if (item) {
      _checkToggleableEffects(effect, item);
      _checkEquippedAndAttunedEffects(effect, item);
    }
    _checkEffectCondition(effect, actor);
  }
}

function _checkToggleableEffects(effect, item) {
  if (item.system.toggleable && item.system.effectsConfig?.linkWithToggle) {
    effect.disabled = !item.system.toggledOn;
  }
}

function _checkEquippedAndAttunedEffects(effect, item) {
  if (!item.system.effectsConfig?.mustEquip) return;

  const statuses = item.system.statuses;
  if (!statuses) return;
  const requireAttunement = item.system.properties?.attunement.active;

  if (requireAttunement) {
    const equippedAndAttuned = statuses.equipped && statuses.attuned;
    effect.disabled = !equippedAndAttuned;
  }
  else {
    effect.disabled = !statuses.equipped;
  }
}

function _checkEffectCondition(effect, actor) {
  if (effect.disabled === true) return; // If effect is already turned off manually we can skip it
  const disableWhen = effect.flags.dc20rpg?.disableWhen;
  if (disableWhen) {
    const value = getValueFromPath(actor, disableWhen.path);
    const expectedValue = parseFromString(disableWhen.value)
    switch (disableWhen.mode) {
      case "==": effect.disabled = value === expectedValue; break;
      case "!=": effect.disabled = value !== expectedValue; break;
      case ">=": effect.disabled = value >= expectedValue; break;
      case ">": effect.disabled = value > expectedValue; break;
      case "<=": effect.disabled = value <= expectedValue; break;
      case "<": effect.disabled = value < expectedValue; break;
    }
  }
}

export function suspendDuplicatedConditions(actor) {
  const effects = actor.appliedEffects.sort((a, b) => {
    if (!a.statuses) a.statuses = [];
    if (!b.statuses) b.statuses = [];
    return b.statuses.size - a.statuses.size;
  });

  const uniqueEffectsApplied = new Set();
  effects.forEach(effect => {
    if (uniqueEffectsApplied.has(effect.system.statusId)) {
      effect.disabled = true;
      effect.suspended = true;
    }
    else {
      effect.suspended = false;
      effect.statuses.forEach(statusId => {
        const status = CONFIG.statusEffects.find(e => e.id === statusId);
        if (status && !status.stackable) {
          uniqueEffectsApplied.add(statusId);
        }
      })
    }
  });
}

export function collectAllEvents(actor) {
  const events = [];
  for (const effect of actor.effects) {
    for (const change of effect.changes) {
      if (change.key === "system.events") {
        const paresed = parseEvent(change.value);
        events.push(paresed);
      }
    }
  }
  return events;
}