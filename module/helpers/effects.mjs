export function prepareActiveEffectCategories(effects) {
    // Define effect header categories
    const categories = {
      temporary: {
        type: "temporary",
        label: "Temporary Effects",
        effects: []
      },
      passive: {
        type: "passive",
        label: "Passive Effects",
        effects: []
      },
      inactive: {
        type: "inactive",
        label: "Inactive Effects",
        effects: []
      }
    };

    // Iterate over active effects, classifying them into categories
    for ( let effect of effects ) {
      effect.orignName = effect.sourceName;
      if ( effect.disabled ) categories.inactive.effects.push(effect);
      else if ( effect.isTemporary ) categories.temporary.effects.push(effect);
      else categories.passive.effects.push(effect);
    }
    return categories;
}

//==================================================
//    Manipulating Effects On Other Objects        =  
//==================================================
export async function createEffectOn(type, owner) {
  const duration = type === "temporary" ? 1 : undefined
  const inactive = type === "inactive";
  owner.createEmbeddedDocuments("ActiveEffect", [{
    label: "New Effect",
    icon: "icons/svg/aura.svg",
    origin: owner.uuid,
    "duration.rounds": duration,
    disabled: inactive
  }]);
}

export function editEffectOn(effectId, owner) {
  const effect = _getEffectFrom(effectId, owner);
  effect.sheet.render(true);
}

export function deleteEffectOn(effectId, owner) {
  const effect = _getEffectFrom(effectId, owner);
  effect.delete();
}

export function toggleEffectOn(effectId, owner) {
  const effect = _getEffectFrom(effectId, owner);
  effect.update({disabled: !effect.disabled});
}

function _getEffectFrom(effectId, owner) {
  return owner.effects.get(effectId);
}

//===========================================================
//     Method exposed for efect management with macros      =  
//===========================================================
export function deleteEffectWithName(effectName, owner) {
  const effect = owner.effects.getName(effectName);
  effect.delete();
}

export function effectWithNameExists(effectName, owner) {
  return owner.effects.getName(effectName) !== undefined;
}

export function addEffectToActor(details, owner) {
  details.owner = owner.uuid;
  owner.createEmbeddedDocuments("ActiveEffect", [details]);
}