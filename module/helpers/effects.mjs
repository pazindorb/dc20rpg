import { getSelectedTokens } from "./actors/tokens.mjs";

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
export const effectMacroHelper = {
  toggleEffectOnSelectedTokens: async function (effect) {
    const tokens = await getSelectedTokens();
    if (tokens) tokens.forEach(token => this.toggleEffectOnActor(effect, token.actor));
  },

  toggleEffectOnActor: function(effect, owner) {
    if (this.effectWithNameExists(effect.label, owner)) this.deleteEffectWithName(effect.label, owner);
    else this.addEffectToActor(effect, owner); 
  },

  addEffectToActor: function(effect, owner) {
    effect.owner = owner.uuid;
    owner.createEmbeddedDocuments("ActiveEffect", [effect]);
  },

  effectWithNameExists: function(effectName, owner) {
    return owner.effects.getName(effectName) !== undefined;
  },

  deleteEffectWithName: function(effectName, owner) {
    const effect = owner.effects.getName(effectName);
    effect.delete();
  },
}