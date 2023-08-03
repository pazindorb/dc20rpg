import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { DC20RPG } from "../helpers/config.mjs";

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
      case "inventory":   return DC20RPG.inventoryTypes;
      case "features":    return DC20RPG.featuresTypes;
      case "techniques":  return DC20RPG.techniquesTypes;
      case "spells":      return DC20RPG.spellsTypes;
      default:            return DC20RPG.allItemTypes;
    }
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
export function createItemDialog(tab, actor) {
  let dialog = new CreateItemDialog(actor, tab, {title: "Create new Item"});
  dialog.render(true);
}