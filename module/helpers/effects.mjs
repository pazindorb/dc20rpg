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
    effect.orignName = effect.sourceName;
    if (effect.statuses?.size > 0) _connectEffectAndStatus(effect, statuses);
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
      .filter(status => effect.statuses.has(status.id))
      .map(status => status.effectId = effect.id);
}


//==================================================
//    Manipulating Effects On Other Objects        =  
//==================================================
export function createEffectOn(type, owner) {
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

export function toggleConditionOn(statusId, effectId, owner) {
  if (effectId) deleteEffectOn(effectId, owner);
  else _createConditionOn(statusId, owner);
}

function _createConditionOn(statusId, owner) {
  const status = CONFIG.statusEffects.find(status => status.id === statusId);
  const cls = getDocumentClass("ActiveEffect");
  const createData = foundry.utils.deepClone(status);
  createData.statuses = [status.id];
  delete createData.id;
  cls.migrateDataSafe(createData);
  cls.cleanData(createData);
  createData.name = game.i18n.localize(createData.name);
  cls.create(createData, {parent: owner});
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