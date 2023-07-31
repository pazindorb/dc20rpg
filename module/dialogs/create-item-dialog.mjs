import { DC20RPG } from "../helpers/config.mjs";
import { createItemOnActor } from "../helpers/items.mjs";

/**
 * Dialog window for creating new items on actor.
 */
export class CreateItemDialog extends Dialog {

  constructor(actor, parentDataset, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.parentDataset = parentDataset;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/create-item-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    if (this.parentDataset.tab === "inventory") return DC20RPG.inventoryTypes;
    if (this.parentDataset.tab === "features") return DC20RPG.featuresTypes;
    if (this.parentDataset.tab === "techniques") return DC20RPG.techniquesTypes;
    if (this.parentDataset.tab === "spells") return DC20RPG.spellsTypes;
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.create-item').click(ev => this._onCreateItem(ev));
  }

  _onCreateItem(event) {
    event.preventDefault();
    const selectedTypeKey = $(".selectable option:selected").val();
    const selectedTypeLabel = $(".selectable option:selected").text();
    const itemName = `New ${selectedTypeLabel}`;

    this.close();
    createItemOnActor(this.actor, selectedTypeKey, itemName);
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createItemDialog(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  
  let dialog = new CreateItemDialog(actor, dataset, {title: "Create new Item"});
  dialog.render(true);
}