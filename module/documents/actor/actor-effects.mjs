export function modifyActiveEffects(effects) {
  for ( const effect of effects ) {
    const item = fromUuidSync(effect.origin)
    if (!item || item.documentName !== "Item") continue;
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