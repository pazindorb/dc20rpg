import { rollItem } from "../helpers/rolls.mjs";
import { enchanceFormula } from "../helpers/utils.mjs";

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

    if (['weapon', 'equipment', 'consumable'].includes(this.type)) {
      this._initializeFlags();
      this._prepareCoreRoll();
      this._prepareDC();
    }
    if (this.type === "weapon") {
      this._prepareTableName("Weapons");
    }
    if (this.type === "equipment") {
      this._prepareTableName("Equipment");
    }
    if (this.type === "consumable") {
      this._prepareTableName("Consumables");
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
      rollBonus: systemData.coreFormula.rollBonus
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
  async roll(rollLevel, versatileRoll) {
    return rollItem(this.actor, this, rollLevel, versatileRoll, true);
  }

  _prepareCoreRoll() {
    const system = this.system;
    const coreFormula = system.coreFormula;
    
    // Prepare formula
    if (coreFormula.overriden) {
      coreFormula.formula = coreFormula.overridenFormula;
    } else {
      let calculatedFormula = `d20 + @${coreFormula.attributeKey}`;
      if (system.statuses.mastery) calculatedFormula += " + @combatMastery";
      if (system.coreFormula.rollBonus) calculatedFormula +=  " + @rollBonus";
  
      coreFormula.formula = calculatedFormula;
    }

    // Calculate roll modifier for formula
    if(coreFormula.formula) {
      coreFormula.formula = enchanceFormula(coreFormula.formula);
      const rollData = this.getRollData();

      let roll = new Roll(coreFormula.formula, rollData);
      roll.terms.forEach(term => {
        if (term.faces) term.faces = 0;
      });
      
      roll.evaluate({async: false});
      coreFormula.rollModifier = roll.total;
    } else {
      coreFormula.rollModifier = 0;
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

  _prepareTableName(fallbackName) {
    let tableName = this.system.tableName;
    if (!tableName || tableName.trim() === "") this.system.tableName = fallbackName;
  }

  _initializeFlags() {
    // Flags describing roll menu details
    if (this.flags.rollMenu === undefined) this.flags.rollMenu = {
      showMenu: false,
      dis: false,
      adv: false,
      disLevel: 0,
      advLevel: 0,
      freeRoll: false,
      versatileRoll: false
    };
  }
}
