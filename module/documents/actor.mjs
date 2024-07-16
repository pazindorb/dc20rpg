import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { getStatusWithId, hasStatusWithId } from "../statusEffects/statusUtils.mjs";
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
    // We need to map statuses object in or stackable format to keys only
    // so we can apply specialStatusEffects
    this.statuses = this.statuses.map(status => status.id);
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

    const overrides = {};
    this.statuses.clear();

    // Organize non-disabled effects by their application priority
    const changes = [];
    for ( const effect of this.allApplicableEffects() ) {
      if ( !effect.active ) continue;
      changes.push(...effect.changes.map(change => {
        const c = foundry.utils.deepClone(change);
        c.effect = effect;
        c.priority = c.priority ?? (c.mode * 10);
        return c;
      }));
      for ( const statusId of effect.statuses ) {
        let oldStatus = getStatusWithId(this, statusId);
        let newStatus = oldStatus || {id: statusId, stack: 1};

        // If condition exist already add +1 stack
        if (hasStatusWithId(this, statusId)) newStatus.stack ++;

        // remove old status (if exist) and add new record
        this.statuses.delete(oldStatus);
        this.statuses.add(newStatus);
      }
    }
    changes.sort((a, b) => a.priority - b.priority);

    // Apply all changes
    for ( let change of changes ) {
      if ( !change.key ) continue;
      const changes = change.effect.apply(this, change);
      Object.assign(overrides, changes);
    }

    // Expand the set of final overrides
    this.overrides = foundry.utils.expandObject(overrides);
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

  hasStatus(statusId) {
    return hasStatusWithId(this, statusId)
  }

  hasAnyStatus(statuses) {
    for (const statusId of statuses) {
      if (hasStatusWithId(this, statusId)) return true;
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

  async toggleStatusEffect(statusId, {active, overlay=false}={}) {
    const status = CONFIG.statusEffects.find(e => e.id === statusId);
    if ( !status ) throw new Error(`Invalid status ID "${statusId}" provided to Actor#toggleStatusEffect`);
    const existing = [];

    // Find the effect with the static _id of the status effect
    if ( status._id ) {
      const effect = this.effects.get(status._id);
      if ( effect ) existing.push(effect.id);
    }

    // If no static _id, find all single-status effects that have this status
    else {
      for ( const effect of this.effects ) {
        const statuses = effect.statuses;
        // We only want to turn off standard status effects that way, not the ones from items.
        if (effect.orignName === "None") {
          if (statuses.size === 1 &&  statuses.has(statusId)) existing.push(effect.id);
        }
      }
    }

    // Remove the existing effects unless the status effect is forced active
    if (!active && existing.length) {
      await this.deleteEmbeddedDocuments("ActiveEffect", [existing.pop()]); // We want to remove 1 stack of effect at the time
      return false;
    }

    // Create a new effect unless the status effect is forced inactive
    if ( !active && (active !== undefined) ) return;
    // Create new effect only if status is stackable
    if (existing.length > 0 && !status.stackable) return;

    const effect = await ActiveEffect.implementation.fromStatusEffect(statusId);
    if ( overlay ) effect.updateSource({"flags.core.overlay": true});
    return ActiveEffect.implementation.create(effect, {parent: this, keepId: true});
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