import { getActivePlayers } from "../../helpers/users.mjs";
import { openRestDialogForOtherPlayers } from "../../dialogs/rest.mjs";
import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { DC20Roll } from "../../roll/rollApi.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";

export class ActorRequestDialog extends DC20Dialog {

  constructor(requestType, selectOptions, request, onlyPC, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.selected = "";
    this._collectActors(onlyPC);
    this.selectOptions = selectOptions;
    this.request = request;

    this.header = game.i18n.localize(`dc20rpg.dialog.actorRequest.${requestType}.title`);
    if (requestType === "rest") this.icon = "fa-solid fa-bed";
    if (requestType === "roll") this.icon = "fa-solid fa-dice-d20";
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/gm-tools/actor-request-dialog.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Actor Request";
    initialized.window.icon = "fa-solid fa-users-viewfinder";
    initialized.position.width = 450;
    initialized.actions.confirm = this._onConfirmRequest;
    return initialized;
  }

  _collectActors(onlyPC) {
    const activePlayersIds = getActivePlayers().map(user => user.id);

    // Go over actors and collect the ones belonging to active users
    const selectedActors = {}
    game.actors.forEach(actor => {
      if (Object.keys(actor.ownership).some(userId => activePlayersIds.includes(userId))) {
        if (onlyPC) if (actor.type !== "character") return;
        selectedActors[actor.id] = {
          selected: false,
          actor: actor
        }
      }
    });
    this.selectedActors = selectedActors;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const hasActors = Object.keys(this.selectedActors).length > 0;

    context.selectedActors = this.selectedActors;
    context.hasActors = hasActors,
    context.rollOptions = this.selectOptions,
    context.selected = this.selected,
    context.header = this.header;
    context.icon = this.icon;
    return context;
  }

  _onConfirmRequest(event, target) {
    event.preventDefault();
    if (this.selected) this.request(this.selected, this.selectedActors);
    this.close();
  }
}

export function createActorRequestDialog(requestType, selectOptions, request, onlyPC) {
  const dialog = new ActorRequestDialog(requestType, selectOptions, request, onlyPC);
  dialog.render(true);
}

export function rollRequest(selected, selectedActors) {
  let rollDetails = DC20Roll.prepareCheckDetails(selected);
  if (["agi", "mig", "cha", "int", "phy", "men"].includes(selected)) {
    rollDetails = DC20Roll.prepareSaveDetails(selected);
  }
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) RollDialog.open(actor.actor, rollDetails, {sendToActorOwners: true});
  });
}

export function restRequest(selected, selectedActors) {
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) openRestDialogForOtherPlayers(actor.actor, selected);
  });
}
