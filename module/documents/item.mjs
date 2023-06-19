import { DC20RPG } from "../helpers/config.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class DC20RpgItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  prepareDerivedData() {
    if (this.type === "weapon") {
      this._prepareMasteryRollFormula();
      this._prepareDC();
    }
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    let systemData = foundry.utils.deepClone(this.system)

    // Grab the item's system data.
    let rollData = {
      system: systemData,
      rollBonus: systemData.rollBonus
    }

    // If present, add the actor's roll data.
    if (this.actor) rollData = {...rollData, ...this.actor.getRollData()};

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.rollFormula.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: this.system.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.system.rollFormula.formula, rollData);
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  /**
   * Not Perfect, formulas skill can be funcked up after cleaning.
   */
  getRollModifier() {
    if(this.system.rollFormula.formula) {
      let formula = this.system.rollFormula.formula;
      const rollData = this.getRollData();

      let cleanFormula = formula.replace(/d\d+\s*([+-])\s*/g, "")
      let roll = new Roll(cleanFormula, rollData).evaluate({async: false});
      return roll.total;
    }
  }

  /**
   * Not Perfect, formulas skill can be funcked up after cleaning.
   */
    getFormulas(category) {
      const types = {...DC20RPG.damageTypes, ...DC20RPG.healingTypes}
      let formulas = this.system.formulas; 
      let formulaString = "";

      let filteredFormulas = Object.values(formulas)
        .filter(formula => formula.category === category);

      for (let i = 0; i < filteredFormulas.length; i++) {
        let formula = filteredFormulas[i];
        if (formula.formula === "") continue;
        formulaString += formula.formula;
        if (formula.versatile) formulaString += " (" + formula.versatileFormula + ")";
        formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
        formulaString += " + ";
      }
      
      if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
      return formulaString;
    }

  _prepareMasteryRollFormula() {
    const system = this.system;
    const rollFormula = system.rollFormula;

    if (rollFormula.overriden) {
      rollFormula.formula = rollFormula.overridenFormula;
    } else {
      let calculatedFormula = `d20 + @${system.attributeKey}`;
      if (system.statuses.mastery) calculatedFormula += " + @combatMastery";
      if (system.rollBonus) calculatedFormula +=  " + @rollBonus";
  
      rollFormula.formula = calculatedFormula;
    }
  }

  _prepareDC() {
    const save = this.system.save;
    const actor = this.actor;

    if (save.calculationKey === "flat") return;
    if (!actor) {
      save.dc = null;
      return;
    }
    
    switch (save.calculationKey) {
      case "martial":
        save.dc = 99; //get DC from actor's martial DC
        return;
      case "spell":
        save.dc = 55; //get DC from actor's spell DC
        return;
      default:
        let dc = 10;
        let key = save.calculationKey;
        dc += actor.system.attributes[key].value;
        if (save.addMastery) dc += actor.system.details.combatMastery;
        save.dc = dc;
        return;
    }

  }
}
