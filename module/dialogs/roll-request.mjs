import { prepareCheckDetailsFor, prepareSaveDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { promptRollToOtherPlayer } from "./roll-prompt.mjs";

/**
 * Dialog allowing DM to request rolls.
 */
export class RollRequestDialog extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.selectedRoll = "";
    this._collectActors();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/roll-request-dialog.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 400
    });
  }

  _collectActors() {
    // Collect active players that are not the one calling for rolls
    // Aslo we want to ignore GMs as when they create character they become owner of it
    const activePlayersIds = [];
    game.users
        .filter(user => user.active && !user.isGM)
        .filter(user => user.id !== game.user.id)
        .forEach(user => activePlayersIds.push(user.id));

    // Go over actors and collect the ones belonging to active users
    const selectedActors = {}
    game.actors.forEach(actor => {
      if (Object.keys(actor.ownership).some(userId => activePlayersIds.includes(userId))) {
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
      rollOptions: DC20RPG.contests,
      selectedRoll: this.selectedRoll
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev));
    html.find('.roll-request').click(ev => this._onRollRequest(ev));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
  }

  _onSelection(event) {
    event.preventDefault();
    this.selectedRoll = event.currentTarget.value;
    this.render(true);
  }

  _onActivable(path) {
    let value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render(true);
 }

  _onRollRequest(event) {
    event.preventDefault();
    if (this.selectedRoll) {
      const rollDetails = this._getRollDetails();
      Object.values(this.selectedActors).forEach(actor => {
        if (actor.selected) promptRollToOtherPlayer(actor.actor, rollDetails, false);
      })
    }
    this.close();
  }

  _getRollDetails() {
    // Save Request
    if (["agi", "mig", "cha", "int", "phy", "men"].includes(this.selectedRoll)) {
      return prepareSaveDetailsFor(this.selectedRoll);
    }
    // Check Request
    return prepareCheckDetailsFor(this.selectedRoll);
  }
}

export function createRollRequestDialog() {
  const dialog = new RollRequestDialog({title: "Roll Request"});
  dialog.render(true);
}