import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { makeCalculations } from "./actor/actor-calculations.mjs";
import { prepareDataFromItems, prepareRollDataForItems } from "./actor/actor-copyItemData.mjs";
import { enhanceEffects, modifyActiveEffects } from "./actor/actor-effects.mjs";
import { prepareRollData, prepareRollDataForEffectCall } from "./actor/actor-rollData.mjs";

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
    enhanceEffects(this);
    this.prepareActiveEffectsDocuments();
    prepareRollDataForItems(this);
    this.prepareOtherEmbeddedDocuments();
  }

  /**
   * We need to prepare Active Effects before we deal with other documents.
   * We want them to use modifications applied by active effects.
   */
  prepareActiveEffectsDocuments() {
    for ( const collectionName of Object.keys(this.constructor.hierarchy || {}) ) {
      if (collectionName === "effects") {
        for ( let e of this.getEmbeddedCollection(collectionName) ) {
          e._safePrepareData();
        }
      }
    }
    this.applyActiveEffects();
  }

  /**
   * We need to prepare Active Effects before we deal with other items.
   */
  prepareOtherEmbeddedDocuments() {
    for ( const collectionName of Object.keys(this.constructor.hierarchy || {}) ) {
      if (collectionName !== "efects") {
        for ( let e of this.getEmbeddedCollection(collectionName) ) {
          e._safePrepareData();
        }
      }
    }
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

  applyActiveEffects() {
    modifyActiveEffects(this.allApplicableEffects());
    return super.applyActiveEffects();
  }

  /** @override */
  getRollData(activeEffectCalls) { 
    // We want to operate on copy of original data because we are making some changes to it
    const data = foundry.utils.deepClone(super.getRollData());   
    if (activeEffectCalls) return prepareRollDataForEffectCall(this, data);
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

  hasStatus(status) {
    return this.statuses.has(status);
  }

  hasAnyStatus(statuses) {
    for (const status of statuses) {
      if (this.statuses.has(status)) return true;
    }
    return false;
  }

  _prepareCustomResources() {
    const customResources = this.system.resources.custom;

    // remove empty custom resources and calculate its max charges
    for (const [key, resource] of Object.entries(customResources)) {
      if (!resource.name) delete customResources[key];
      resource.max = resource.maxFormula ? evaluateDicelessFormula(resource.maxFormula, this.getRollData()).total : 0;
    }
  }

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);

    // Re-associate imported Active Effects which are sourced to Items owned by this same Actor
    if ( data._id ) {
      const ownItemIds = new Set(data.items.map(i => i._id));
      for ( let effect of data.effects ) {
        if ( !effect.origin ) continue;
        const effectItemId = effect.origin.split(".").pop();
        if ( ownItemIds.has(effectItemId) ) {
          effect.origin = `Actor.${data._id}.Item.${effectItemId}`;
        }
      }
    }
  }
}