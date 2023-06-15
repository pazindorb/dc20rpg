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

    if (this.type === "weapon") {
      this._prepareMasteryRollFormula();
    }

    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // Grab the item's system data.
    let rollData = {
      system: foundry.utils.deepClone(this.system)
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
      console.info(roll);
      return roll.total;
    }
  }

  _prepareMasteryRollFormula() {
    const system = this.system;
    const rollFormula = system.rollFormula;

    if (rollFormula.overriden) {
      rollFormula.formula = rollFormula.overridenFormula;
    } else {
      let calculatedFormula = `d20 + @${system.attributeKey}`;
      if (system.statuses.mastery) calculatedFormula += " + @combatMastery";
      if (system.rollBonus) calculatedFormula +=  " + @system.rollBonus";
  
      rollFormula.formula = calculatedFormula;
    }
  }
}
