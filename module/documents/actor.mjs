import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { makeCalculations } from "./actor/actor-calculations.mjs";
import { prepareDataFromItems, prepareRollDataForItems } from "./actor/actor-copyItemData.mjs";
import { prepareRollData } from "./actor/actor-rollData.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DC20RpgActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: 
    // 1) data reset (to clear active effects),
    // 2) prepareBaseData(),
    // 3) prepareEmbeddedDocuments() (including active effects),
    // 4) prepareDerivedData().
    super.prepareData();
  }

  prepareBaseData() {
    super.prepareBaseData();
  }

  prepareEmbeddedDocuments() {
    prepareDataFromItems(this);
    prepareRollDataForItems(this)
    super.prepareEmbeddedDocuments();
  }

  /**
   * @override
   * This method collects calculated data (non editable on charcter sheet) that isn't defined in template.json
   */
  prepareDerivedData() {
    makeCalculations(this);
    this._prepareCustomResources();
    this.prepared = true; // Mark actor as prepared
  }

  /** @override */
  getRollData() { 
    // We want to operate on copy of original data because we are making some changes to it
    const data = foundry.utils.deepClone(super.getRollData());   
    return prepareRollData(this, data);
  }

  /**
   * Returns object containing items owned by actor that have charges or are consumable.
   */
  getOwnedItemsIds(excludedId) {
    const excludedTypes = ["class", "subclass", "ancestry", "background", "loot", "tool"];

    const itemsWithCharges = {};
    const consumableItems = {};
    const weapons = {};
    const items = this.items;
    items.forEach(item => {
      if (item.id !== excludedId && !excludedTypes.includes(item.type)) {
        const maxChargesFormula = item.system.costs.charges.maxChargesFormula;
        if (maxChargesFormula) itemsWithCharges[item.id] = item.name; 
        if (item.type === "consumable") consumableItems[item.id] = item.name;
        if (item.type === "weapon") weapons[item.id] = item.name;
      }
    });
    return {
      withCharges: itemsWithCharges,
      consumable: consumableItems,
      weapons: weapons
    }
  }

  getWeapons() {
    const weapons = {};
    this.items.forEach(item => {
      if (item.type === "weapon") weapons[item.id] = item.name;
    });
    return weapons;
  }

  _prepareCustomResources() {
    const customResources = this.system.resources.custom;

    // remove empty custom resources and calculate its max charges
    for (const [key, resource] of Object.entries(customResources)) {
      if (!resource.name) delete customResources[key];
      resource.max = resource.maxFormula ? evaluateDicelessFormula(resource.maxFormula, this.getRollData()).total : 0;
    }
  }
}