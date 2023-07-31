import { rollItem } from "../helpers/rolls.mjs";
import { evaulateFormula } from "../helpers/utils.mjs";

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

    if (['weapon', 'equipment', 'consumable', 'feature', 'technique', 'spell'].includes(this.type)) {
      this._initializeFlags();
      this._prepareCoreRoll();
      this._prepareMaxChargesAmount();
      this._prepareDC();
    }
    if (this.type === "weapon") this._prepareTableName("Weapons");
    if (this.type === "equipment") this._prepareTableName("Equipment");
    if (this.type === "consumable") this._prepareTableName("Consumables");
    if (this.type === "tool") this._prepareTableName("Tools");
    if (this.type === "loot") this._prepareTableName("Loot");
    if (this.type === "feature") this._prepareTableName("Features");
    if (this.type === "technique") this._prepareTableName("Techniques");
    if (this.type === "spell") this._prepareTableName("Spells");
    
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  async getRollData() {
    let systemData = foundry.utils.deepClone(this.system)
 
    // Grab the item's system data.
    let rollData = {
      system: systemData,
      rollBonus: systemData.coreFormula?.rollBonus
    }

    const actor = await this.actor;
    // If present, add the actor's roll data.
    if (actor) {
      rollData = {...rollData, ...actor.getRollData()};
    }

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

  async _prepareCoreRoll() {
    const system = this.system;
    const coreFormula = system.coreFormula;
    
    // Prepare formula
    if (coreFormula.overriden) {
      coreFormula.formula = coreFormula.overridenFormula;
    } else {
      let calculatedFormula = `d20 + @${coreFormula.attributeKey}`;
      if (system.coreFormula.combatMastery) calculatedFormula += " + @combatMastery";
      if (system.coreFormula.rollBonus) calculatedFormula +=  " + @rollBonus";
  
      coreFormula.formula = calculatedFormula;
    }

    // Calculate roll modifier for formula
    const rollData = await this.getRollData();
    coreFormula.rollModifier = coreFormula.formula ? evaulateFormula(coreFormula.formula, rollData, true) : 0;
  }

  async _prepareDC() {
    const save = this.system.save;
    const actor = await this.actor;

    if (save.calculationKey === "flat") return;
    if (!actor) {
      save.dc = null;
      return;
    }
    
    const saveDC = actor.system.saveDC
    switch (save.calculationKey) {
      case "martial":
        save.dc = saveDC.value + saveDC.bonus; 
        return;
      case "spell":
        save.dc = saveDC.value + saveDC.bonus; 
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

  async _prepareMaxChargesAmount() {
    const charges = this.system.costs.charges;
    const rollData = await this.getRollData();
    charges.max = charges.maxChargesFormula ? evaulateFormula(charges.maxChargesFormula, rollData, true) : null;    
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
