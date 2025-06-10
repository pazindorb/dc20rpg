import { makeMoveAction } from "../helpers/actors/actions.mjs";
import { regainBasicResource, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { toggleStatusOn } from "../statusEffects/statusUtils.mjs";

export class DC20RpgTokenHUD extends foundry.applications.hud.TokenHUD {

  /** @override */
  static PARTS = {
    hud: {
      root: true,
      template: "systems/dc20rpg/templates/hud/token/root.hbs"
    }
  };

  /** @overload */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.actions.ap = this._onApAction;
    initialized.actions.move = this._onMoveAction;
    initialized.actions.effect = {handler: this._onEffect, buttons: [0, 2]};
    initialized.actions.aura = this._onAuraAction;
    initialized.actions.pickUp = this._onPickUpAction;
    return initialized;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this.oldDisplay = this.document.displayBars;
    this.document.displayBars = 40;
    context.statusEffects = this._prepareStatusEffects(context.statusEffects);
    context.linkedTemplates = this._prepareLinkedTemplates();
    context.movePoints = this.actor?.system?.movePoints || 0;

    if (!this.actor) {
      context.nonActor = true;
      context.canConfigure = true;
    }
    return context;
  }

  clear() {
    if(this.oldDisplay) {
      this.document.displayBars = this.oldDisplay;
      this.oldDisplay = undefined;
    }
    super.clear();
  }

  _onApAction(event, target) {
    const actor = this.actor;
    if (!actor) return;

    const type = target.dataset.type;
    if (type === "spend") subtractAP(actor, 1);
    if (type === "regain") regainBasicResource("ap", actor, 1, true);
  }

  async _onMoveAction() {
    const actor = this.actor;
    if (!actor) return;

    const subtracted = await subtractAP(actor, 1);
    if (!subtracted) return;

    const selectedMovement = this.document.movementAction;
    makeMoveAction(actor, {moveType: selectedMovement});
  }

  async _onEffect(event, target) {
    const actor = this.actor;
    if (!actor) return;

    const statusId = target.dataset.statusId;
    await toggleStatusOn(statusId, actor, event.which);
  }

  async _onAuraAction(event, target) {
    const auraId = target.dataset.auraId;
    const template = canvas.templates.documentCollection.get(auraId);
    if (template) {
      const linkedIds = this.document.flags.dc20rpg?.linkedTemplates || [];
      const updatedLinkedIds = linkedIds.filter(linkedId => linkedId !== auraId);
      await template.delete();
      await this.document.update({["flags.dc20rpg.linkedTemplates"]: updatedLinkedIds});
    }
  }

  async _onSubmit(event, form, formData) {
    if ((event.type === "change") && event.target.name === "movePoints") {
      return this._onMovePointsSubmit(event);
    }

    return super._onSubmit(event, form, formData);
  }

  _onMovePointsSubmit(event) {
    const newValue = event.target.value;
    const actor = this.actor;
    if (!actor) return;

    let isDelta = false;
    let add = false;
    if (newValue.startsWith("+")) {
      isDelta = true;
      add = true;
    }
    if (newValue.startsWith("-")) {
      isDelta = true;
      add = false;
    }

    let movePoints = parseFloat(newValue);
    if (isNaN(movePoints)) return;
    else movePoints = Math.abs(movePoints);

    if(isDelta) {
      const currentMovePoints = actor.system.movePoints || 0;
      const newMovePoints = add ? currentMovePoints + movePoints : currentMovePoints - movePoints;
      actor.update({["system.movePoints"]: Math.max(newMovePoints, 0)});
    }
    else {
      actor.update({["system.movePoints"]: movePoints});
    }
  }

  _prepareStatusEffects(statusEffects) {
    const actorStatuses = this.actor?.statuses || [];
    actorStatuses.forEach(status => {
      const statEff = statusEffects[status.id];
      if (!statEff.stack) statEff.stack = status.stack;
      else statEff.stack += status.stack;

      statEff.stackable = CONFIG.statusEffects.find(e => e.id === status.id)?.stackable;
      if (statEff.stack > 0) {
        // This means that status comes from some other effect
        if (!statEff.isActive) {
          statEff.isActive = true;
          statEff.fromOther = true;
        }
        statEff.isActive = true;
        statEff.cssClass = "active";
      } 
    })

    // Filter out hidden statuses (We dont want to show them in the UI)
    return Object.fromEntries(
      Object.entries(statusEffects).filter(([key, status]) => {
        const original = CONFIG.statusEffects.find(e => e.id === status.id);
        if (original?.system?.hide) return false;
        return true;
      })
    );
  }

  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  _getStatusEffectChoices() {

    // Include all HUD-enabled status effects
    const choices = {};
    for ( const status of CONFIG.statusEffects ) {
      if ( (status.hud === false) || ((foundry.utils.getType(status.hud) === "Object")
        && (status.hud.actorTypes?.includes(this.document.actor.type) === false)) ) {
        continue;
      }
      choices[status.id] = {
        _id: status._id,
        id: status.id,
        title: game.i18n.localize(status.name),
        src: status.img,
        isActive: false,
        isOverlay: false
      };
    }

    // Update the status of effects which are active for the token actor
    const activeEffects = this.actor?.appliedEffects || [];
    for ( const effect of activeEffects ) {
      if (effect.disabled) continue;
      for ( const statusId of effect.statuses ) {
        const status = choices[statusId];
        if (effect.sourceName === "None") status.fromOther = false;
        if ( !status ) continue;
        if ( status._id ) {
          if ( status._id !== effect.id ) continue;
        } else {
          if ( effect.statuses.size !== 1 ) continue;
        }
        if (effect.sourceName !== "None" && status.fromOther === undefined) status.fromOther = true;
        status.isActive = true;
        if ( effect.getFlag("core", "overlay") ) status.isOverlay = true;
        break;
      }
    }

    // Flag status CSS class
    for ( const status of Object.values(choices) ) {
      status.cssClass = [
        status.isActive ? "active" : null,
        status.isOverlay ? "overlay" : null
      ].filterJoin(" ");
    }
    return choices;
  }

  _prepareLinkedTemplates() {
    const linkedIds = this.document.flags.dc20rpg?.linkedTemplates;
    if (!linkedIds) return [];

    const linkedTemplates = [];
    for (const templateId of linkedIds) {
      const template = canvas.templates.documentCollection.get(templateId);
      if (!template) continue;

      const itemData = template.flags?.dc20rpg?.itemData || {};
      linkedTemplates.push({
        id: templateId,
        img: itemData.itemImg || "icons/svg/explosion.svg",
        name: itemData.itemName || "Unknown Source",
      })
    }
    return linkedTemplates;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const movePointsWrapper = this.element.querySelector(".move-points-wrapper");
    if (!movePointsWrapper) return;
    // We want to show move points wrapper at the start
    movePointsWrapper.classList.remove("hidden");
  }

  togglePalette(palette, active) {
    super.togglePalette(palette, active);
    // We want to show or hide move points wrapper
    const movePointsWrapper = this.element.querySelector(".move-points-wrapper");
    if (!movePointsWrapper) return;
    if (this.activePalette) movePointsWrapper.classList.add("hidden");
    else movePointsWrapper.classList.remove("hidden");
  }
}