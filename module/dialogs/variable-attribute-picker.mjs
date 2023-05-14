import { DC20RPG } from "../helpers/config.mjs";

export class VariableAttributePickerDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Variable Attribute",
      template: "systems/dc20rpg/templates/apps/variable-attribute-picker.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    console.info(DC20RPG.config.attributes);
    return DC20RPG;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('rollable').click(this._onRoll.bind(this));
  }

  _onRoll(event) {
    const dataset = dialogData;
    
    let skillMasteryValue = skillMasteryLevelToValue(dataset.mastery);


    let rollFormula = `d20+ @attributes.${selectedAttribute}.value + ${skillMasteryValue}`;
    let label = dataset.label ? `[ability] ${dataset.label}` : '';
    let roll = new Roll(rollFormula, this.actor.getRollData());
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
      rollMode: game.settings.get('core', 'rollMode'),
    });
    return roll;
  }

}