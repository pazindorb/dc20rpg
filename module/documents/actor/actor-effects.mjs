import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";
import { getValueFromPath, parseFromString } from "../../helpers/utils.mjs";

export function enhanceEffects(actor) {
  for (const effect of actor.allApplicableEffects()) {
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
  const disableWhen = effect.flags.dc20rpg?.disableWhen;
  if (disableWhen) {
    const value = getValueFromPath(actor, disableWhen.path);
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

export function suspendDuplicatedConditions(actor) {
  const effects = actor.appliedEffects.sort((a, b) => {
    if (!a.statuses) a.statuses = [];
    if (!b.statuses) b.statuses = [];
    return b.statuses.size - a.statuses.size;
  });

  const uniqueEffectsApplied = new Map();
  effects.forEach(effect => {
    const statusId = effect.system.statusId;
    if (uniqueEffectsApplied.has(statusId)) {
      // We need to check which effect has more changes, we want to have the one with most amount of changes active
      const oldEffect = uniqueEffectsApplied.get(statusId);
      if (effect.changes.length <= oldEffect.changes.length) {
        effect.disabled = true;
        effect.suspended = true;
        effect.suspendedBy = oldEffect.name;
      }
      else {
        effect.disabled = false;
        effect.suspended = false;
        oldEffect.disabled = true;
        oldEffect.suspended = true;
        oldEffect.suspendedBy = effect.name;
        uniqueEffectsApplied.set(statusId, effect);
      }
    }
    else {
      effect.suspended = false;
      effect.statuses.forEach(statusId => {
        const status = CONFIG.statusEffects.find(e => e.id === statusId);
        if (status && !status.stackable) {
          uniqueEffectsApplied.set(statusId, effect);
        }
      })
    }
  });
}