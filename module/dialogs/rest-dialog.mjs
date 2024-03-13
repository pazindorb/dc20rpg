import { finishRest, regainRestPoint, resetLongRest, spendRestPoint } from "../helpers/actors/rest.mjs";
import { DC20RPG } from "../helpers/config.mjs";

/**
 * Dialog window for resting.
 */
export class RestDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.data = {
      selectedRestType: "long",
      noActivity: true
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/rest-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    const restTypes = DC20RPG.restTypes;
    this.data.rest = this.actor.system.rest;

    return {
      restTypes: restTypes,
      ...this.data
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev));
    html.find(".regain-rp").click(ev => this._onRpRegained(ev));
    html.find(".spend-rp").click(ev => this._onRpSpend(ev));
    html.find(".finish-rest").click(ev => this._onFinishRest(ev));
    html.find(".reset-rest").click(ev => this._onResetRest(ev));
    html.find(".activity-switch").click(ev => this._onSwitch(ev));
  }

  async _onSelection(event) {
    event.preventDefault();
    this.data.selectedRestType = event.currentTarget.value;
    this.render(true);
  }

  async _onSwitch(event) {
    event.preventDefault();
    this.data.noActivity = !this.data.noActivity;
    this.render(true);
  }

  async _onRpSpend(event) {
    event.preventDefault();
    await spendRestPoint(this.actor);
    this.render(true);
  }

  async _onRpRegained(event) {
    event.preventDefault();
    await regainRestPoint(this.actor);
    this.render(true);
  }

  async _onFinishRest(event) {
    event.preventDefault();
    const closeWindow = await finishRest(this.actor, this.data.selectedRestType, this.data.noActivity);
    if (closeWindow) this.close();
    else this.render(true);
  }

  async _onResetRest(event) {
    event.preventDefault();
    await resetLongRest(this.actor);
    this.render(true);
  }
}

/**
 * Creates RestDialog for given actor. 
 */
export function createRestDialog(actor) {
  let dialog = new RestDialog(actor, {title: "Begin Resting"});
  dialog.render(true);
}