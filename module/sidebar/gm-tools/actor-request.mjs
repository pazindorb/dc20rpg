import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../../helpers/actors/attrAndSkills.mjs";
import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../../helpers/utils.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";
import { getActivePlayers } from "../../helpers/users.mjs";
import { createRestDialog, openRestDialogForOtherPlayers } from "../../dialogs/rest.mjs";

export class ActorRequestDialog extends Dialog {

  constructor(title, selectOptions, request, onlyPC, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.selected = "";
    this._collectActors(onlyPC);

    this.header = title;
    this.selectOptions = selectOptions;
    this.request = request;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/gm-tools/actor-request-dialog.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 400
    });
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

  getData() {
    const hasActors = Object.keys(this.selectedActors).length > 0;
    return {
      selectedActors: this.selectedActors,
      hasActors: hasActors,
      rollOptions: this.selectOptions,
      selected: this.selected,
      title: this.header
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(valueOf(ev)));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find('.confirm-request').click(ev => this._onConfirmRequest(ev));
  }

  _onSelection(value) {
    this.selected = value;
    this.render();
  }

  _onActivable(path) {
    let value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render();
 }

 _onConfirmRequest(event) {
    event.preventDefault();
    if (this.selected) this.request(this.selected, this.selectedActors);
    this.close();
  }
}

export function createActorRequestDialog(title, selectOptions, request, onlyPC) {
  const dialog = new ActorRequestDialog(title, selectOptions, request, onlyPC, {title: "Actor Request"});
  dialog.render(true);
}

export function rollRequest(selected, selectedActors) {
  let rollDetails = prepareCheckDetailsFor(selected);
  if (["agi", "mig", "cha", "int", "phy", "men"].includes(selected)) {
    rollDetails = prepareSaveDetailsFor(selected);
  }
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) promptRollToOtherPlayer(actor.actor, rollDetails, false);
  });
}

export function restRequest(selected, selectedActors) {
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) openRestDialogForOtherPlayers(actor.actor, selected);
  });
}
