import { DC20RPG } from "../helpers/config.mjs";
import { rollFlavor } from "../helpers/roll.mjs";
import { skillMasteryLevelToValue } from "../helpers/skills.mjs";

export class VariableAttributePickerDialog extends Dialog {

  constructor(actor , parentDataset, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.parentDataset = parentDataset;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Variable Attribute",
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
    html.find('.rollable').click(this._onRoll.bind(this));
  }

  _onRoll(event) {
    event.preventDefault();
    const selectedAttributeKey = $(".selectable option:selected").val();
    const selectedAttributeLabel = $(".selectable option:selected").text();
    const parentDataset = this.parentDataset;

    let skillMasteryValue = skillMasteryLevelToValue(parentDataset.mastery);
    
    let rollFormula = `d20+ @attributes.${selectedAttributeKey}.value + ${skillMasteryValue}`;
    let label = parentDataset.label ? `${parentDataset.label} - Variable: ${selectedAttributeLabel}` : '';
    let roll = new Roll(rollFormula, this.actor.getRollData());
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: rollFlavor(this.actor.img, label),
      rollMode: game.settings.get('core', 'rollMode'),
    });
    this.close();
    return roll;
  }

}