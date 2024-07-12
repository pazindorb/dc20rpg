import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function enhanceEffects(actor) {
  for (const effect of actor.effects) {
    for (const change of effect.changes) {
      const value = change.value;
      
      // formulas start with "<" and end with ">"
      if (value.startsWith("<") && value.endsWith(">")) {
        // We want to calculate that formula
        const formula = value.slice(1,-1);
        const calculated = evaluateDicelessFormula(formula, actor.getRollData(true));
        change.value = calculated.total;
      }
    }
  }
}

export function modifyActiveEffects(effects) {
  for ( const effect of effects ) {
    const item = effect.getSourceItem();
    if (!item) continue;
    _checkToggleableEffects(effect, item);
    _checkEquippedAndAttunedEffects(effect, item);
  }
}

function _checkToggleableEffects(effect, item) {
  if (item.system.effectsConfig?.toggleable) {
    effect.disabled = !item.system.effectsConfig.active;
  }
}

function _checkEquippedAndAttunedEffects(effect, item) {
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