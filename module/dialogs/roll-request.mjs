import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { getLabelFromKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
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
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  _collectActors() {
    // Collect active players that are not the one calling for rolls
    const activePlayersIds = [];
    game.users
        .filter(user => user.active)
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
    return {
      selectedActors: this.selectedActors,
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
    const details = {
      checkKey: this.selectedRoll,
      label: "",
      roll: "",
      type: ""
    };

    switch(this.selectedRoll) {
      case "att":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = "d20+@attackMod.value.martial";
        details.type = "attackCheck"
        break;

      case "spe":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = "d20+@attackMod.value.spell";
        details.type = "spellCheck"
        break;

      case "mar":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = "d20+@special.marCheck";
        details.type = "skillCheck"
        break;

      case "agi": case "mig": case "cha": case "int":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = `d20+@attributes.${this.selectedRoll}.save`;
        details.type = "save"
        break;
        
      case "phy":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = "d20+@special.phySave";
        details.type = "save"
        break;

      case "men":
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = "d20+@special.menSave";
        details.type = "save"
        break;

      default: 
        details.label = getLabelFromKey(this.selectedRoll, DC20RPG.contests);
        details.roll = `d20+@skills.${this.selectedRoll}.modifier`;
        details.type = "skillCheck"
        break;
    }
    return details
  }
}

export function createRollRequestDialog() {
  const dialog = new RollRequestDialog({title: "Roll Request"});
  dialog.render(true);
}