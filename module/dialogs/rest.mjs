import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { restTypeFilter, runEventsFor } from "../helpers/actors/events.mjs";
import { emitSystemEvent } from "../helpers/sockets.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";
import { promptRoll } from "./roll-prompt.mjs";

/**
 * Dialog window for resting.
 */
export class RestDialog extends DC20Dialog {

  constructor(actor, preselected, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedRestType = preselected || "long";
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
    initialized.position.width = 420;

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
    
    const availableTypes = Object.keys(CONFIG.DC20RPG.DROPDOWN_DATA.restTypes);
    const index = availableTypes.indexOf(this.selectedRestType);
    if (index === -1) {
      ui.notifications.warn("Rest Type does not exist");
      return;
    }
    const restTypes = availableTypes.slice(0, index+1);
    if (this.newDay) restTypes.push("day");
    if (restTypes.find(x => x === "short")) restTypes.push("halfOnShort");
    if (this.selectedRestType === "full") restTypes.push("long4h");
    if (this.selectedRestType === "long") {
      const halfFinished = this.actor.system.rest.longRest.half;
      if (!halfFinished) {
        restTypes[restTypes.indexOf("long")] = "long4h";
      }
    }

    await this._refreshResources(restTypes);
    await this._refreshItems(restTypes);

    let runEvent = true;
    if (this.selectedRestType === "long") {
      await this._respectActivity();
      const halfFinished = this.actor.system.rest.longRest.half;
      if (!halfFinished) { // 1nd Half of Long Rest
        await this.actor.update({["system.rest.longRest.half"]: true});
        closeAfter = false;
      }
      else { // 2st Half of Long Rest
        await this._clearDoomed();
        this._resetLongRest();
        this._shouldRollExhaustionSave();

        // We don't want to run short and quick rest events twice (we did in 1st part of the Long Rest)
        await runEventsFor("rest", this.actor, ["long"]); 
        runEvent = false;
      }
    }
    if (this.selectedRestType === "full") {
      await this._clearExhaustion();
      await this._clearDoomed();
    }

    if (runEvent) await runEventsFor("rest", this.actor, restTypeFilter(restTypes));
    if (closeAfter) {
      this._finishRestChatMessage();
      this.close();
    }
    this.render();
  }

  async _refreshResources(resetTypes) {
    for (const resource of this.actor.resources.iterate()) {
      if (resetTypes.includes(resource.reset)) {
        const regainType = resource.reset === "halfOnShort" && !resetTypes.includes("long") ? "half" : "max";
        const oldValue = resource.value;
        await resource.regain(regainType);
        const newValue = this.actor.resources[resource.key].value;
        this.history.resources[resource.key] = newValue - oldValue;
      }
    }
  }

  async _refreshItems(restTypes) {
    for (const item of this.actor.items) {
      if (!item.system.usable) continue;
      if (!item.use.hasCharges) continue;
      
      const charges = item.system.costs.charges;
      if (restTypes.includes(charges.reset)) {
        const half = charges.reset === "halfOnShort" && !restTypes.includes("long") ? true : false;
        await item.use.regainCharges(half);
      }
    }
  }

  async _respectActivity() {
    if (this.noActivity) {
      this.history.exhaustion++;
      await this.actor.toggleStatusEffect("exhaustion", { active: false });
      await this.actor.update({["system.rest.longRest.noActivity"]: true});
    }
  }

  async _clearExhaustion() {
    await this.actor.update({["system.rest.longRest.exhSaveDC"]: 10});
    if (!this.actor.hasStatus("exhaustion")) return;
    this.history.exhaustion = "all";

    for (const effect of this.actor.effects) {
      if (effect.system?.statusId === "exhaustion") await effect.delete();
    }
  }

  async _clearDoomed() {
    if (!this.actor.hasStatus("doomed")) return;
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
    const roll = await promptRoll(this.actor, details);
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

  _finishRestChatMessage() {
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
    sendDescriptionToChat(this.actor, {
      rollTitle: `${CONFIG.DC20RPG.DROPDOWN_DATA.restTypes[this.selectedRestType]} Finished`,
      image: this.actor.img,
      description: content,
    });
  }
}

/**
 * Opens Rest Dialog popup for given actor.
 */
export function createRestDialog(actor, preselected) {
  new RestDialog(actor, preselected).render(true);
}

export function openRestDialogForOtherPlayers(actor, preselected) {
  emitSystemEvent("startRest", {
    actorId: actor.id,
    preselected: preselected
  });
}