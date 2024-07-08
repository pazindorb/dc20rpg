import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/events.mjs";

/**
 * Dialog window for picking custom attribute for skill roll.
 */
export class VariableAttributePickerDialog extends Dialog {

  constructor(actor , parentDataset, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.parentDataset = parentDataset;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/variable-attribute-picker.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return DC20RPG.attributes;
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.rollable').click(ev => this._onRoll(ev));
  }

  _onRoll(event) {
    event.preventDefault();
    const selectedAttributeKey = $(`.${datasetOf(event).selector} option:selected`).val();
    const selectedAttributeLabel = $(`.${datasetOf(event).selector} option:selected`).text();
    const parentDataset = this.parentDataset;

    const modifier = (parseInt(parentDataset.mastery) * 2) + parseInt(parentDataset.bonus);
    parentDataset.roll = `d20+ @attributes.${selectedAttributeKey}.check + ${modifier}`;
    parentDataset.label = parentDataset.label ? `${parentDataset.label} (${selectedAttributeLabel})` : '';
    
    this.close();
    rollFromSheet(this.actor, parentDataset);
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createVariableRollDialog(dataset, actor) {
  let dialog = new VariableAttributePickerDialog(actor, dataset, {title: "Variable Attribute Roll"});
  dialog.render(true);
}