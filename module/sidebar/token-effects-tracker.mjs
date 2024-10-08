import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { getActorFromId, getActorFromToken, getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { deleteEffectOn, editEffectOn, toggleEffectOn } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { changeActivableProperty } from "../helpers/utils.mjs";

export function createTokenEffectsTracker() {
  const tokenEffectsTracker = new TokenEffectsTracker();
  Hooks.on('controlToken', (token, controlled) => {
    if (controlled) tokenEffectsTracker.render(true);
  });
}

export class TokenEffectsTracker extends Application {

  constructor(data = {}, options = {}) {
    super(data, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/sidebar/token-effects-tracker.hbs",
      classes: ["dc20rpg", "tokenEffects"],
      popOut: false
    });
  }

  async getData() {
    const tokens = getSelectedTokens();
    if (tokens.length !== 1) return {active: [], disabled: []} 
    const actor = getActorFromToken(tokens[0]);
    const actorId = actor.isToken ? tokens[0].id : actor.id;
    const [active, disabled] = await this._prepareTemporaryEffects(actor);
    return {
      active: active,
      disabled: disabled,
      ownerId: actorId
    }
  }

  async _prepareTemporaryEffects(actor) {
    const active = [];
    const disabled = [];
    if (actor.effects.size === 0) return [active, disabled];

    for(const effect of actor.effects) {
      if (effect.isTemporary) {
        effect.descriptionHTML = await TextEditor.enrichHTML(effect.description, {secrets:true});

        // If effect is toggleable from item we want to change default behaviour
        const item = effect.getSourceItem();
        if (item) {
          if (item.system.effectsConfig?.mustEquip) effect.equippable = true; 
          if (item.system.effectsConfig?.toggleable) effect.itemId = item.id; 
        }

        if(effect.disabled) disabled.push(effect);
        else active.push(effect);
      }
    }

    // Merge stackable conditions
    const mergedActive = this._mergeStackableConditions(active);
    const mergedDisabled = this._mergeStackableConditions(disabled);
    return [mergedActive, mergedDisabled];
  }

  _mergeStackableConditions(effects) {
    const mergedEffects = [];
    for (const effect of effects) {
      const statusId = effect.system.statusId;
      if (statusId) {
        const alreadyPushed = mergedEffects.find(e => e.system.statusId === statusId);
        if (alreadyPushed) {
          alreadyPushed.system.stack++;
        }
        else {
          effect.system.stack = 1;
          mergedEffects.push(effect);
        }
      }
      else {
        mergedEffects.push(effect);
      }
    }
    return mergedEffects;
  }

  // async _render(force = false, options = {}) {
  //   await super._render(force, options);
  // }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.toggle-effect').click(ev => this._onToggleEffect(datasetOf(ev).effectId, datasetOf(ev).ownerId));
    html.find('.remove-effect').click(ev => this._onRemoveEffect(datasetOf(ev).effectId, datasetOf(ev).ownerId));
    html.find('.toggle-item').click(ev => this._onToggleItem(datasetOf(ev).itemId, datasetOf(ev).ownerId));
    html.find('.editable').mousedown(ev => ev.which === 2 ? this._onEditable(datasetOf(ev).effectId, datasetOf(ev).ownerId) : ()=>{});
  }

  _onEditable(effectId, ownerId) {
    const owner = getActorFromId(ownerId);
    if (owner) editEffectOn(effectId, owner)
  }

  _onToggleEffect(effectId, ownerId) {
    const owner = getActorFromId(ownerId);
    if (owner) toggleEffectOn(effectId, owner);
  }

  _onToggleItem(itemId, ownerId) {
    const owner = getActorFromId(ownerId);
    if (owner) {
      const item = getItemFromActor(itemId, owner);
      if (item) changeActivableProperty("system.effectsConfig.active", item);
    }
  }

  _onRemoveEffect(effectId, ownerId) {
    const owner = getActorFromId(ownerId);
    if (owner) deleteEffectOn(effectId, owner);
  } 
}