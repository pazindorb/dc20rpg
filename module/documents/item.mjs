import { DC20RPG } from "../helpers/config.mjs";
import { rollItem } from "../helpers/rolls.mjs";
import { enchanceFormula, getLabelFromKey } from "../helpers/utils.mjs";

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
    return rollItem(this.actor, this, true);
  }

  getRollModifier() {
    if(this.system.rollFormula.formula) {
      let formula = this.system.rollFormula.formula;
      formula = enchanceFormula(formula);
      const rollData = this.getRollData();

      let roll = new Roll(formula, rollData);
      roll.terms.forEach(term => {
        if (term.faces) term.faces = 0;
      });
      
      roll.evaluate({async: false});
      return roll.total;
    }
  }

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
      if (formula.versatile) formulaString += "(" + formula.versatileFormula + ")";
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

  async _prepareDC() {
    const save = this.system.save;
    const actor = this.actor;

    if (save.calculationKey === "flat") return;
    if (!actor) {
      save.dc = null;
      return;
    }
    
    switch (save.calculationKey) {
      case "martial":
        await actor.system.details.martialDC
        save.dc = actor.system.details.martialDC;
        return;
      case "spell":
        await actor.system.details.spellDC
        save.dc = actor.system.details.spellDC; 
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
