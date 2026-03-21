import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";
import { getValueFromPath, parseFromString } from "../../helpers/utils.mjs";

export function prepareStatuses(actor) {
  const allStatuses = new Map();
  for (const effect of actor.allEffects) {
    effect.suspended = false;
    if (effect.disabled) continue;
    
    for (const statusId of effect.statuses) {
      const isStatusEffect = !!effect.system.statusId;
      const isLocked = effect.system.statusId !== statusId;

      if (allStatuses.has(statusId)) {
        const status = allStatuses.get(statusId);
        status.effects.push({name: effect.name, id: effect.id, isStatusEffect: isStatusEffect, isLocked: isLocked});
        if (status.stackable) status.stack += 1;
        else {
          effect.disabled = true;
          effect.suspended = `Effect suspended by: '${status.effects[0].name}'`
        }
      }
      else {
        const status = CONFIG.statusEffects.find(s => s.id === statusId);
        if (!status) {
          ui.notifications.error(`Status with id '${statusId}' not found in the system conifg.`);
          continue;
        }
        allStatuses.set(statusId, {
          id: statusId,
          name: status.name,
          img: status.img,
          description: status.description,
          stackable: status.stackable,
          condition: status.system.condition, // TODO move from system.condition to condition? not sure
          stack: 1,
          effects: [{name: effect.name, id: effect.id, isStatusEffect: isStatusEffect, isLocked: isLocked}]
        })
      }
    }
  }
  actor.statuses = allStatuses;
}

export function runSpecialStatusChecks(actor) {
  fullyStunnedCheck(actor);
  exhaustionCheck(actor);
  dazedCheck(actor);
}

function fullyStunnedCheck(actor) {
  const stunned = actor.statuses.get("stunned");
  const fullyStunned = actor.statuses.get("fullyStunned");
  if (!stunned) return;

  // Add Fully Stunned
  if (!fullyStunned && stunned.stack >= 4) {
    actor.toggleStatusEffect("fullyStunned", { active: true });
  }
  // Remove Fully Stunned
  if (fullyStunned && stunned.stack < 4) {
    actor.toggleStatusEffect("fullyStunned", { active: false });
  }
}

function exhaustionCheck(actor) {
  if (actor.exhaustion >= 6) {
    if (actor.statuses.has("dead")) return;
    actor.toggleStatusEffect("dead", { active: true });
  }
}

function dazedCheck(actor) {
  if (actor.statuses.has("dazed")) {
    const sustained = actor.system.sustain;
    for (const sustainKey of Object.keys(sustained)) {
      actor.dropSustain(sustainKey, "You can't Sustain an effect while Dazed.");
    }
  }
}

export function enhanceEffects(actor) {
  for (const effect of actor.allEffects) {
    for (const change of effect.changes) {
      const value = change.value;
      
      // formulas start with "<:" and end with ":>"
      if (typeof value === "string" && value.includes("<:") && value.includes(":>")) {
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

export function modifyActiveEffects(actor) {
  for (const effect of actor.allEffects) {
    const item = effect.getSourceItem();
    if (item && actor.isOwner) {
      _checkToggleableEffects(effect, item);
      _checkEquippedAndAttunedEffects(effect, item);
    }
    _checkEffectCondition(effect, actor);
  }
}

function _checkToggleableEffects(effect, item) {
  if (item.system.toggle?.toggleable && item.system.effectsConfig?.linkWithToggle) {
    const toggledOn = item.system.toggle.toggledOn;
    if (toggledOn) effect.enable({ignoreStateChangeLock: true});
    else effect.disable({ignoreStateChangeLock: true});
  }
}

function _checkEquippedAndAttunedEffects(effect, item) {
  if (item.system.toggle?.toggleable && item.system.effectsConfig?.linkWithToggle) return; // Toggle overrides equiped
  if (!item.system.effectsConfig?.mustEquip) return;

  const statuses = item.system.statuses;
  if (!statuses) return;
  const requireAttunement = item.system.properties?.attunement.active;

  let shouldEnable = statuses.equipped;
  if (requireAttunement) shouldEnable = statuses.equipped && statuses.attuned;
  if (shouldEnable) effect.enable({ignoreStateChangeLock: true});
  else effect.disable({ignoreStateChangeLock: true});
}

function _checkEffectCondition(effect, actor) {
  if (effect.disabled === true) return; // If effect is already turned off manually we can skip it
  const disableWhen = effect.system?.disableWhen;
  if (disableWhen) {
    const value = getValueFromPath(actor, disableWhen.path);
    if (!value) return;
    const expectedValue = parseFromString(disableWhen.value);
    const has = (value, expected) => {
      if (value.has) return value.has(expected);
      if (value.includes) return value.includes(expected);
      return undefined;
    };

    switch (disableWhen.mode) {
      case "==": effect.disabled = value === expectedValue; break;
      case "!=": effect.disabled = value !== expectedValue; break;
      case ">=": effect.disabled = value >= expectedValue; break;
      case ">": effect.disabled = value > expectedValue; break;
      case "<=": effect.disabled = value <= expectedValue; break;
      case "<": effect.disabled = value < expectedValue; break;
      case "has": effect.disabled = has(value, expectedValue) === true; break;
      case "hasNot": effect.disabled = has(value, expectedValue) === false; break;
    }
  }
}