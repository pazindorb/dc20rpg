import { restTypeFilter, runEventsFor } from "../helpers/actors/events.mjs";
import { emitSystemEvent } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { DC20ChatMessage } from "../sidebar/chat/chat-message.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

/**
 * Dialog window for resting.
 */
export class RestDialog extends DC20Dialog {

  static async open(actor, options={}) {
    if (options.sendToActorOwners) {
      const owners = getIdsOfActiveActorOwners(actor, false);
      if (owners.length > 0 && !owners.find(ownerId => game.user.id === ownerId)) options.users = owners;
    }

    // Send to other users
    if (options.users) {
      const payload = {
        actorId: actor.id,
        options: options
      };
      emitSystemEvent("startRest", payload);
    }

    else {
      await RestDialog.create(actor, options);
    }
  }

  static async create(actor, options={}) {
    new RestDialog(actor, options).render(true);
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedRestType = options.preselected || "long";
    this.history = {
      resources: {},
      rpToHP: 0,
      exhaustion: 0,
      doomed: false,
    }
    this.noActivity = true;
    this.newDay = false;
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/rest-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Rest";
    initialized.window.icon = "fa-solid fa-campground";
    initialized.position.width = 450;

    initialized.actions.rpSpend = this._onRpSpend;
    initialized.actions.activity = this._onSwitchActivity;
    initialized.actions.finishRest = this._onFinishRest;
    initialized.actions.resetRest = this._onResetRest;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.restTypes = CONFIG.DC20RPG.DROPDOWN_DATA.restTypes;
    context.selectedRestType = this.selectedRestType;
    context.restPoints = this.actor.system.resources.restPoints;
    context.rest = this.actor.system.rest;
    context.newDay = this.newDay;
    context.noActivity = this.noActivity;
    context.health = this.actor.system.resources.health;

    // Calculate health %
    const hpPercent = Math.ceil(100 * context.health.current/context.health.max);
    if (isNaN(hpPercent)) context.health.percent = 0;
    else context.health.percent = hpPercent <= 100 ? hpPercent : 100;

    const halfLongRestDone = this.actor.system.rest.longRest.half;
    context.halfButton = this.selectedRestType === "long" && !halfLongRestDone;
    context.resetButton = this.selectedRestType === "long" && halfLongRestDone;
    return context;
  }

  async _onSwitchActivity(event) {
    event.preventDefault();
    this.noActivity = !this.noActivity;
    this.render();
  }

  async _onRpSpend(event) {
    event.preventDefault();
    if (this.actor.resources.restPoints.canSpend(1)) {
      await this.actor.resources.restPoints.spend(1);
      await this.actor.resources.health.regain(1);
      this.history.rpToHP++;
    }
    this.render();
  }

  async _onResetRest(event) {
    event.preventDefault();
    await this._resetLongRest();
    this.render();
  }

  async _onFinishRest(event) {
    event.preventDefault();
    let closeAfter = true;
    let refreshType = this.selectedRestType;

    const halfFinished = this.actor.system.rest.longRest.half;
    if (refreshType === "long" && !halfFinished) {
      refreshType = "long4h";
    }

    if (this.newDay) {
      this.newDay = false;
      await this.actor.refresh.on("day");
    }
    await this.actor.refresh.on(refreshType);
    switch (refreshType) {
      case "short":
        await this.actor.refresh.on("halfOnShort");
        break;

      case "long4h":
        await this._respectActivity();
        await this.actor.update({["system.rest.longRest.half"]: true});
        closeAfter = false;
        break;

      case "long":
        await this._respectActivity();
        await this._clearDoomed();
        this._shouldRollExhaustionSave();
        this._resetLongRest();
        break;

      case "full":
        await this._clearExhaustion();
        await this._clearDoomed();
        break;
    }

    await runEventsFor("rest", this.actor, restTypeFilter(refreshType));

    if (closeAfter) {
      this.#finishWithRestChatMessage();
      this.close();
    }
    this.render();
  }

  async _respectActivity() {
    if (this.noActivity) {
      await this.actor.update({["system.rest.longRest.noActivity"]: true});
      if (!this.actor.statuses.has("exhaustion")) return;
      this.history.exhaustion++;
      await this.actor.toggleStatusEffect("exhaustion", { active: false });
    }
  }

  async _clearExhaustion() {
    await this.actor.update({["system.rest.longRest.exhSaveDC"]: 10});
    if (!this.actor.statuses.has("exhaustion")) return;
    this.history.exhaustion = "all";

    for (const effect of this.actor.effects) {
      if (effect.system?.statusId === "exhaustion") await effect.delete();
    }
  }

  async _clearDoomed() {
    if (!this.actor.statuses.has("doomed")) return;
    this.history.doomed = true;

    for (const effect of this.actor.effects) {
      if (effect.system?.statusId === "doomed") await effect.delete();
    }
  }

  async _shouldRollExhaustionSave() {
    const longRest = this.actor.system.rest.longRest;
    const noActivity = longRest.noActivity;
    if (noActivity) return;

    const details = {
      roll: "d20 + @attributes.mig.save",
      label: `Might Save vs DC ${longRest.exhSaveDC}`,
      rollTitle: "Exhaustion Save",
      type: "save",
      against: longRest.exhSaveDC
    }
    const roll = await RollDialog.open(this.actor, details);
    if (roll.total < longRest.exhSaveDC) {
      await this.actor.toggleStatusEffect("exhaustion", { active: true });
      await this.actor.update({["system.rest.longRest.exhSaveDC"]: longRest.exhSaveDC + 5});
    }
  }

  async _resetLongRest() {
    await this.actor.update({
      ["system.rest.longRest.half"]: false,
      ["system.rest.longRest.noActivity"]: false
    });
  }

  #finishWithRestChatMessage() {
    let content = "";
    if (this.history.rpToHP) {
      content += `<li>Rest Points spent on Health: ${this.history.rpToHP}</li>`;
    }
    for (const [key, value] of Object.entries(this.history.resources)) {
      if (key === "restPoints") continue;
      if (!value) continue;
      content += `<li>Regained ${value} ${this.actor.resources[key].label}</li>`;
    }

    if (this.history.doomed) content += "<li>Cleared all stacks of Doomed condition</li>";
    if (this.history.exhaustion) content += `<li>Cleared ${this.history.exhaustion} stacks of Exhaustion</li>`;

    if (content) content = `<ul>${content}</ul>`
    DC20ChatMessage.descriptionMessage({
      rollTitle: `${CONFIG.DC20RPG.DROPDOWN_DATA.restTypes[this.selectedRestType]} Finished`,
      image: this.actor.img,
      description: content,
    }, this.actor);
  }
}