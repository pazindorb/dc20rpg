import { triggerHeldAction } from "../helpers/actors/actions.mjs";
import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { getActorFromIds, getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { deleteEffectOn, editEffectOn, toggleEffectOn } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { changeActivableProperty } from "../helpers/utils.mjs";
import { isStackable } from "../statusEffects/statusUtils.mjs";

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
      popOut: false,
      dragDrop: [
        {dragSelector: ".help-dice[data-key]", dropSelector: null},
      ],
    });
  }

  async getData() {
    const tokens = getSelectedTokens();
    if (tokens.length !== 1) return {active: [], disabled: []} 
    const actor = tokens[0].actor;
    const [active, disabled] = await this._prepareTemporaryEffects(actor);
    const help = this._prepareHelpDice(actor);
    const heldAction = this._prepareHeldAction(actor);
    return {
      help: help,
      active: active,
      disabled: disabled,
      tokenId: tokens[0].id,
      actorId: actor.id,
      heldAction: heldAction
    }
  }

  _prepareHelpDice(actor) {
    const dice = {};
    for (const [key, help] of Object.entries(actor.system.help.active)) {
      let icon = "fa-diamond";
      switch (help) {
        case "d8": icon = "fa-diamond"; break; 
        case "d6": icon = "fa-square"; break; 
        case "d4": icon = "fa-play fa-rotate-270"; break; 
      }
      dice[key] = {
        formula: help,
        icon: icon,
      }
    }
    this.helpDice = dice;
    return dice
  }

  _prepareHeldAction(actor) {
    const actionHeld = actor.flags.dc20rpg.actionHeld;
    if (!actionHeld?.isHeld) return;
    return actionHeld;
  }

  async _prepareTemporaryEffects(actor) {
    const active = [];
    const disabled = [];
    if (actor.allEffects.length === 0) return [active, disabled];

    for(const effect of actor.allEffects) {
      if (effect.isTemporary) {
        effect.descriptionHTML = await TextEditor.enrichHTML(effect.description, {secrets:true});
        effect.timeLeft = effect.roundsLeft;
        effect.allStatauses = await this._statusObjects(effect.statuses, effect.name);

        // If effect is toggleable from item we want to change default behaviour
        const item = effect.getSourceItem();
        if (item) {
          // Equippable
          if (item.system.effectsConfig?.mustEquip) effect.equippable = true; 

          // Toggleable
          if (item.system.toggle?.toggleable && item.system.effectsConfig?.linkWithToggle) effect.itemId = item.id; 
          else effect.itemId = ""; 
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
    for (const effectDoc of effects) {
      const effect = {...effectDoc};
      effect._id = effectDoc._id;
      const statusId = effect.system.statusId;
      if (statusId && isStackable(statusId)) {
        const alreadyPushed = mergedEffects.find(e => e.system.statusId === statusId);
        if (alreadyPushed) {
          alreadyPushed._id = effect._id;
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

  async _statusObjects(statuses, effectName) {
    const statusObjects = [];
    for (const status of CONFIG.statusEffects) {
      if (statuses.has(status.id) && effectName !== status.name) {
        statusObjects.push(status)
      }
    }
    return statusObjects;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('.toggle-effect').click(ev => this._onToggleEffect(datasetOf(ev).effectId, datasetOf(ev).actorId, datasetOf(ev).tokenId, datasetOf(ev).turnOn));
    html.find('.remove-effect').click(ev => this._onRemoveEffect(datasetOf(ev).effectId, datasetOf(ev).actorId, datasetOf(ev).tokenId));
    html.find('.toggle-item').click(ev => this._onToggleItem(datasetOf(ev).itemId, datasetOf(ev).actorId, datasetOf(ev).tokenId));
    html.find('.editable').mousedown(ev => ev.which === 2 ? this._onEditable(datasetOf(ev).effectId, datasetOf(ev).actorId, datasetOf(ev).tokenId) : ()=>{});
    html.find('.held-action').click(ev => this._onHeldAction(datasetOf(ev).actorId, datasetOf(ev).tokenId));
  }

  _onEditable(effectId, actorId, tokenId) {
    const owner = getActorFromIds(actorId, tokenId);
    if (owner) editEffectOn(effectId, owner);
  }

  _onToggleEffect(effectId, actorId, tokenId, turnOn) {
    const owner = getActorFromIds(actorId, tokenId);
    if (owner) toggleEffectOn(effectId, owner, turnOn === "true");
    this.render();
  }

  _onToggleItem(itemId, actorId, tokenId) {
    const owner = getActorFromIds(actorId, tokenId);
    if (owner) {
      const item = getItemFromActor(itemId, owner);
      if (item) changeActivableProperty("system.toggle.toggledOn", item);
    }
    this.render();
  }

  _onRemoveEffect(effectId, actorId, tokenId) {
    const owner = getActorFromIds(actorId, tokenId);
    if (owner) deleteEffectOn(effectId, owner);
    this.render();
  } 

  _onHeldAction(actorId, tokenId) {
    const owner = getActorFromIds(actorId, tokenId);
    if (owner) triggerHeldAction(owner);
    this.render();
  }

  _onDragStart(event) {
    super._onDragStart(event);
    const dataset = event.currentTarget.dataset;
    const key = dataset.key;

    const actorId = dataset.actorId;
    const tokenId = dataset.tokenId;
    const helpDice = this.helpDice[key];
    if (helpDice) {
      const dto = {
        key: key,
        formula: helpDice.formula,
        type: "help",
        actorId: actorId,
        tokenId: tokenId,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dto));
    }
  }

  _canDragDrop(selector) {
    return true;
  }

  _canDragStart(selector) {
    return true;
  }
}