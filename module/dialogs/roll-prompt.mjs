import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { runSheetRollLevelCheck } from "../helpers/rollLevel.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { toggleUpOrDown } from "../helpers/utils.mjs";

/**
 * Dialog window for rolling saves and check requested by the DM.
 */
export class RollPromptDialog extends Dialog {

  constructor(actor , details, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.details = details;
    this.promiseResolve = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/roll-prompt-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return {
      rollDetails: this.details,
      ...this.actor
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.rollable').click(ev => this._onRoll(ev));
    html.find('.roll-level-check').click(ev => this._onRollLevelCheck(ev));
    html.find('.toggle-actor-numeric').mousedown(async ev => {
      await toggleUpOrDown(datasetOf(ev).path, ev.which, this.actor, (datasetOf(ev).max || 9), 0);

      // We need to refresh our actor to get new roll menu
      this.actor = await game.actors.get(this.actor.id);
      this.render(true);
    });
  }

  async _onRoll(event) {
    event.preventDefault();
    const roll = await rollFromSheet(this.actor, this.details);
    this.promiseResolve(roll);
    this.close();
  }

  async _onRollLevelCheck(event) {
    event.preventDefault();
    await runSheetRollLevelCheck(this.details, this.actor);

    // We need to refresh our actor to get new roll menu
    this.actor = await game.actors.get(this.actor.id);
    this.render(true);
  }

  static async create(actor, details, dialogData = {}, options = {}) {
    const prompt = new RollPromptDialog(actor, details, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}

/**
 * Asks player triggering action to roll.
 */
export async function promptRoll(actor, details) {
  return await RollPromptDialog.create(actor, details, {title: `Roll ${details.label}`});
}

/**
 * Asks actor owners to roll. Only first response will be considered.
 */
export async function promptRollToOtherPlayer(actor, details) {
  const rollPromise = responseListener("rollPromptResult", game.user.id);
  emitSystemEvent("rollPrompt", { actorId: actor.id, details: details});
  const roll = await rollPromise;
  return roll;
}