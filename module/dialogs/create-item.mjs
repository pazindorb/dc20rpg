import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";

/**
 * Dialog window for creating new items on actor.
 */
export class CreateItemDialog extends Dialog {

  constructor(actor, tab, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.tab = tab;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/create-item-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    switch(this.tab) {
      case "inventory":   return CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes;
      case "features":    return CONFIG.DC20RPG.DROPDOWN_DATA.featuresTypes;
      case "techniques":  return CONFIG.DC20RPG.DROPDOWN_DATA.techniquesTypes;
      case "spells":      return CONFIG.DC20RPG.DROPDOWN_DATA.spellsTypes;
      default:            return CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes;
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.create-item').click(ev => this._onCreateItem(ev));
  }

  _onCreateItem(event) {
    event.preventDefault();
    const selectedTypeKey = $(`.${datasetOf(event).selector} option:selected`).val();
    const selectedTypeLabel = $(`.${datasetOf(event).selector} option:selected`).text();
    const itemName = `New ${selectedTypeLabel}`;

    this.close();
    const itemData = {
      name: itemName,
      type: selectedTypeKey
    };
    createItemOnActor(this.actor, itemData);
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createItemDialog(tab, actor) {
  let dialog = new CreateItemDialog(actor, tab, {title: "Create new Item"});
  dialog.render(true);
}