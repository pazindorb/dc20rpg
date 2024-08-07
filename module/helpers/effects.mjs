import { addStatusWithIdToActor, removeStatusWithIdFromActor } from "../statusEffects/statusUtils.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";

export function prepareActiveEffectsAndStatuses(owner, context) {
  // Prepare all statuses 
  const statuses = foundry.utils.deepClone(CONFIG.statusEffects);

  // Define effect header categories
  const effects = {
    temporary: {
      type: "temporary",
      effects: []
    },
    passive: {
      type: "passive",
      effects: []
    },
    inactive: {
      type: "inactive",
      effects: []
    },
    disabled: {
      type: "disabled",
      effects: []
    }
  };


  // Iterate over active effects, classifying them into categories
  for ( let effect of owner.effects ) {
    effect.originName = effect.sourceName;
    if (effect.statuses?.size > 0) _connectEffectAndStatus(effect, statuses);
    if (effect.sourceName === "None") {} // None means it is a condition, we can ignore that one.
    else if (effect.isTemporary && effect.disabled) effects.disabled.effects.push(effect);
    else if (effect.disabled) effects.inactive.effects.push(effect);
    else if (effect.isTemporary) effects.temporary.effects.push(effect);
    else effects.passive.effects.push(effect);
  }
  context.effects = effects;
  context.statuses = statuses
}

export function prepareActiveEffects(owner, context) {
  const effects = {
    temporary: {
      type: "temporary",
      effects: []
    },
    passive: {
      type: "passive",
      effects: []
    }
  };

  for ( let effect of owner.effects ) {
    if (effect.isTemporary) effects.temporary.effects.push(effect);
    else effects.passive.effects.push(effect);
  }
  context.effects = effects;
}

function _connectEffectAndStatus(effect, statuses) {
  statuses
      .filter(status => effect.statuses.has(status.id) && !effect.disabled)
      .map(status => {
        status.effectId = effect.id;
        
        // Collect stacks for conditions
        if (!status.stack) status.stack = 1;
        else if (status.stackable) status.stack += 1; 

        // If status comes from other active effects we want to give info about it with tooltip
        if ((effect.statuses.size > 1 && effect.name !== status.name) || effect.sourceName !== "None") {
          if (!status.tooltip) status.tooltip = `Additional stack from ${effect.name}`
          else status.tooltip += ` and ${effect.name}`
          status.fromOther = true
        }

        return status;
      });
}


//==================================================
//    Manipulating Effects On Other Objects        =  
//==================================================
export function createEffectOn(type, owner) {
  const duration = type === "temporary" ? 1 : undefined
  const inactive = type === "inactive";
  owner.createEmbeddedDocuments("ActiveEffect", [{
    label: "New Effect",
    img: "icons/svg/aura.svg",
    origin: owner.uuid,
    "duration.rounds": duration,
    disabled: inactive
  }]);
}

export function editEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.sheet.render(true);
}

export function deleteEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.delete();
}

export function toggleEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.update({disabled: !effect.disabled});
}

export function toggleConditionOn(statusId, owner, addOrRemove) {
  if (addOrRemove === 1) addStatusWithIdToActor(owner, statusId);
  if (addOrRemove === 3) removeStatusWithIdFromActor(owner, statusId);
}

export function getEffectFrom(effectId, owner) {
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
    if (this.effectWithNameExists(effect.name, owner)) this.deleteEffectWithName(effect.name, owner);
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