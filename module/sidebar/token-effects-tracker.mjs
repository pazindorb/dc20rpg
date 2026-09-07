import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { getSelectedTokens } from "../helpers/actors/tokens.mjs";

export function createTokenEffectsTracker() {
  const enabled = game.settings.get("dc20rpg", "enableTokenEffectsTracker");
  if (!enabled) return;

  const tokenEffectsTracker = new TokenEffectsTracker();
  tokenEffectsTracker.render(true);
  ui.tokenEffectsTracker = tokenEffectsTracker;
  registerTokenEffectsTrackerRefreshHooks();
}

function registerTokenEffectsTrackerRefreshHooks() {
  Hooks.on('controlToken', () => {if (ui.tokenEffectsTracker) ui.tokenEffectsTracker.render()});
  Hooks.on('updateActor', () => {if (ui.tokenEffectsTracker) ui.tokenEffectsTracker.render()});

  Hooks.on("createItem", (item) => {if (ui.tokenEffectsTracker && hasActorParent(item)) ui.tokenEffectsTracker.render()});
  Hooks.on("updateItem", (item) => {if (ui.tokenEffectsTracker && hasActorParent(item)) ui.tokenEffectsTracker.render()});
  Hooks.on("deleteItem", (item) => {if (ui.tokenEffectsTracker && hasActorParent(item)) ui.tokenEffectsTracker.render()});

  Hooks.on("createActiveEffect", (effect) => {if (ui.tokenEffectsTracker && hasActorParent(effect)) ui.tokenEffectsTracker.render()});
  Hooks.on("updateActiveEffect", (effect) => {if (ui.tokenEffectsTracker && hasActorParent(effect)) ui.tokenEffectsTracker.render()});
  Hooks.on("deleteActiveEffect", (effect) => {if (ui.tokenEffectsTracker && hasActorParent(effect)) ui.tokenEffectsTracker.render()});

  Hooks.on("combatTurnChange", () => ui.tokenEffectsTracker.render());
}

function hasActorParent(object) {
  const parent = object.parent;
  if (parent instanceof Actor) return true;
  if (parent) return hasActorParent(parent);
  return object instanceof Actor;
}

class TokenEffectsTracker extends DC20Dialog {

  static DEFAULT_OPTIONS = {
    id: "token-effects-tracker",
    classes: ["dc20rpg"],
    position: {
      width: 50,
      height: "auto",
    },
  }

  static PARTS = {
    root: {
      template: "systems/dc20rpg/templates/sidebar/token-effects-tracker.hbs",
      scrollable: [".scrollable"],
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const tokens = getSelectedTokens();
    if (tokens.length !== 1) return {...context, active: [], disabled: []};

    this.token = tokens[0];
    const actor = tokens[0]?.actor;
    if (!actor) {
      this.actor = null;
      return context;
    }
    this.actor = actor;
    const [active, disabled] = await this._prepareEffects(actor);

    context.ownerId = actor.id;
    context.help = actor.help.active;
    context.active = active;
    context.disabled = disabled;
    return context;
  }

  _prepareEffects(actor) {
    const enabled = [];
    const disabled = [];
    const enabledByImage = new Map();
    const disabledByImage = new Map();
    actor.allEffects
        .filter(effect => effect.isTemporary || effect.showIcon === CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS)
        .forEach(effect => {
          const effects = effect.disabled ? disabled : enabled;
          const effectsByImage = effect.disabled ? disabledByImage : enabledByImage;
          const stackedEffect = effectsByImage.get(effect.img);

          if (stackedEffect) {
            stackedEffect.imgStack = (stackedEffect.imgStack ?? 1) + 1;
          } else {
            delete effect.imgStack;
            effectsByImage.set(effect.img, effect);
            effects.push(effect);
          }
        });
    return [enabled, disabled];
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    this.#positionNextToSidebar();
    if (!this._sidebarResizeObserver) {
      const sidebar = document.querySelector("#sidebar");
      if (sidebar) {
        this._sidebarResizeObserver = new ResizeObserver(() => this.#positionNextToSidebar());
        this._sidebarResizeObserver.observe(sidebar);
      }
    }

    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".help-dice",
      callbacks: {
        dragstart: this._onDragStart.bind(this),
      }
    }).bind(this.element);
  }

  #positionNextToSidebar() {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    this.element.style.right = `${sidebarRect.width}px`;
  }

  _onDragStart(event) {
    if (event.target.classList.contains('help-dice')) this._onDragHelpDice(event);
  }

  _onDragHelpDice(event) {
    if (!this.actor) return;
    const dataset = event.target.dataset;
    const key = dataset.key;

    const helpDice = this.actor.help.active[key];
    if (helpDice) {
      const dto = {
        key: key,
        formula: helpDice.formula,
        type: "help",
        actorId: this.actor.id,
        tokenId: this.token.id,
      }
      event.dataTransfer.setData("text/plain", JSON.stringify(dto));
    }
  }

  // ==================== ACTIONS =====================
  _onMouseDown(event) {
    if (event.button === 0) this._onLeftClick(event);
    if (event.button === 1) this._onMiddleClick(event);
    if (event.button === 2) this._onRightClick(event);
  }

  _onLeftClick(event) {
    if (event.target.classList.contains("effect-img")) {
      const dataset = event.target.dataset;
      const effect = this.#getEffect(dataset.effectId);
      if (effect) {
        if (game.system.id === "dc20rpg") {
          if (event.shiftKey) effect.runManualEvent();
          else if (effect.disabled) effect.enable();
          else effect.disable();
        }
        else effect.update({disabled: !effect.disabled});
      }
    }
  }

  _onMiddleClick(event) {
    const dataset = event.target.dataset;
    if (event.target.classList.contains("effect-img")) {
      const effect = this.#getEffect(dataset.effectId);
      if (effect) effect.sheet.render(true);
    }
  }

  async _onRightClick(event) {
    const dataset = event.target.dataset;

    if (event.target.classList.contains("effect-img")) {
      const confirmed = await PDE.InputDialog.confirm(game.i18n.localize("dc20rpg.tokenEffectsTracker.deleteEffect"));
      if (!confirmed) return;
      const effect = this.#getEffect(dataset.effectId);
      if (effect) effect.delete();
    }
    if (event.target.classList.contains('help-dice') || event.target.parentElement.classList.contains('help-dice')) {
      let key = event.target.dataset?.key;
      if (!key) key = event.target.parentElement.dataset?.key;
      const confirmed = await PDE.InputDialog.confirm(game.i18n.localize("dc20rpg.tokenEffectsTracker.deleteHelpDice"));
      if (confirmed) this.actor.help.clear(key);
    }
  }

  async _getTooltipObject(dataset, event) {
    const effect = this.#getEffect(dataset.effectId);
    if (effect) return effect;
    return await super._getTooltipObject(dataset, event);
  }

  #getEffect(effectId) {
    return this.actor.allEffects.find(e => e._id === effectId);
  }
}