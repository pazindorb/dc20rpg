import { addBasicActions } from "../helpers/actors/actions.mjs";
import { parseEvent } from "../helpers/actors/events.mjs";
import { getSelectedTokens, preConfigurePrototype, updateActorHp } from "../helpers/actors/tokens.mjs";
import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { translateLabels } from "../helpers/utils.mjs";
import { enhanceStatusEffectWithExtras, getStatusWithId, hasStatusWithId } from "../statusEffects/statusUtils.mjs";
import { makeCalculations } from "./actor/actor-calculations.mjs";
import { prepareDataFromItems, prepareRollDataForItems } from "./actor/actor-copyItemData.mjs";
import { enhanceEffects, modifyActiveEffects, suspendDuplicatedConditions } from "./actor/actor-effects.mjs";
import { preInitializeFlags } from "./actor/actor-flags.mjs";
import { prepareRollData, prepareRollDataForEffectCall } from "./actor/actor-rollData.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DC20RpgActor extends Actor {

  get allEffects() {
    const effects = new Map();
    for ( const effect of this.allApplicableEffects() ) {
      effects.set(effect.id, effect);
    }
    return effects;
  }

  /**
   * Collect all events - even from disabled effects
   */
  get allEvents() {
    const events = [];
    for (const effect of this.allApplicableEffects()) {
      for (const change of effect.changes) {
        if (change.key === "system.events") {
          const changeValue = `"effectId": "${effect.id}", ` + change.value; // We need to inject effect id
          const paresed = parseEvent(changeValue);
          events.push(paresed);
        }
      }
    }
    return events;
  }

  get hasOtherMoveOptions() {
    const movements = this.system.movement;
    if (movements.burrow.current > 0) return true;
    if (movements.climbing.current > 0) return true;
    if (movements.flying.current > 0) return true;
    if (movements.glide.current > 0) return true;
    if (movements.swimming.current > 0) return true;
    return false
  }

  /** @override */
  prepareData() {
    this.statuses ??= new Set();
    const specialStatuses = new Map();
    for ( const statusId of Object.values(CONFIG.specialStatusEffects) ) {
      specialStatuses.set(statusId, this.hasStatus(statusId));
    }
    super.prepareData();

    let tokens;
    for ( const [statusId, wasActive] of specialStatuses ) {
      const isActive = this.hasStatus(statusId);
      if ( isActive === wasActive ) continue;
      tokens ??= this.getDependentTokens({scenes: canvas.scene}).filter(t => t.rendered).map(t => t.object);
      for ( const token of tokens ) token._onApplyStatusEffect(statusId, isActive);
    }
  }

  prepareBaseData() {
    if (this.type === "companion") this._prepareCompanionOwner();
    super.prepareBaseData();
  }

  _prepareCompanionOwner() {
    const companionOwnerId = this.system.companionOwnerId;
    if (companionOwnerId) {
      const companionOwner = game.actors.get(companionOwnerId);
      if (!companionOwner) {
        if (!ui.notifications) console.warn(`Cannot find actor with id "${companionOwnerId}" in Actors directory, try adding it again to ${this.name} companion sheet.`);
        else ui.notifications.warn(`Cannot find actor with id "${companionOwnerId}" in Actors directory, try adding it again to ${this.name} companion sheet.`);
        this.update({["system.companionOwnerId"]: ""}); // We want to clear that information from companion as it is outdated
        return;
      }

      this.companionOwner = companionOwner;
      // Register update actor hook, only once per companion
      if (this.companionOwner.id && !this.updateHookRegistered) {
        Hooks.on("updateActor", (actor, updateData) => {
          if (actor.id === this.companionOwner?.id) {
            this.companionOwner = actor;
            this.prepareData();
            this.sheet.render(false, { focus: false });
            this.getActiveTokens().forEach(token => token.refresh());
          }
        });
      }
      this.updateHookRegistered = true;
    }
    else {
      this.companionOwner = null;
    }
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
    suspendDuplicatedConditions(this);
    this.applyActiveEffects();

    let token = undefined;
    let controlled = false;
    const selectedTokens = getSelectedTokens();
    if (selectedTokens?.length > 0) {
      token = selectedTokens[0];
      controlled = true;
    }
    Hooks.call('controlToken', token, controlled); // Refresh token effects tracker
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
    translateLabels(this);
    this.prepared = true; // Mark actor as prepared
  }

  applyActiveEffects() {
    modifyActiveEffects(this.allApplicableEffects(), this);

    const overrides = {};
    this.statuses.clear();
    const numberOfDuplicates = new Map();

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

        // If condition exist already add +1 stack, if effect is stackable or remove multiplying changes if not
        if (hasStatusWithId(this, statusId)) {
          const status = CONFIG.statusEffects.find(e => e.id === statusId);
          if (status.stackable) newStatus.stack ++;
          else {
            // If it is not stackable it might cause some duplicates in changes we need to get rid of
            for (const change of changes) {
              if (effect.isChangeFromStatus(change, status)) {
                const dupCha = numberOfDuplicates.get(change);
                if (dupCha) numberOfDuplicates[change.key] = {change: change, number: dupCha.number + 1};
                else numberOfDuplicates[change.key] = {change: change, number: 1};
              }
            }
          }
        }

        // remove old status (if exist) and add new record
        this.statuses.delete(oldStatus);
        this.statuses.add(newStatus);
      }
    }

    // Remove duplicated changes from 
    for (const duplicate of Object.values(numberOfDuplicates)) {
      for (let i = 0; i < duplicate.number; i++) {
        let indexToRemove = changes.indexOf(duplicate.change);
        if (indexToRemove !== -1) {
          changes.splice(indexToRemove, 1);
        }
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
    const data = {...super.getRollData()}
    if (activeEffectCalls) return prepareRollDataForEffectCall(this, data);
    return prepareRollData(this, data);
  }

  /**
   * Returns object containing items owned by actor that have charges or are consumable.
   */
  getOwnedItemsIds(excludedId) {
    const excludedTypes = ["class", "subclass", "ancestry", "background", "loot"];

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
      const identified = item.system.statuses ? item.system.statuses.identified : true;
      if (item.type === "weapon" && identified) 
        weapons[item.id] = item.name;
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

  getEffectWithName(effectName) {
    for (const effect of this.allApplicableEffects()) {
      if (effect.name === effectName) return effect;
    }
  }

  _prepareCustomResources() {
    const customResources = this.system.resources.custom;

    // remove empty custom resources and calculate its max charges
    for (const [key, resource] of Object.entries(customResources)) {
      if (!resource.name) delete customResources[key];
      resource.max = resource.maxFormula ? evaluateDicelessFormula(resource.maxFormula, this.getRollData()).total : 0;
    }
  }

  async toggleStatusEffect(statusId, {active, overlay=false, extras}={}) {
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
        if (effect.sourceName === "None") {
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
    // Do not create new effect if actor is immune to it.
    if (this.system.conditions[statusId]?.immunity) {
      ui.notifications.warn(`${this.name} is immune to '${statusId}'.`);
      return;
    }

    let effect = await ActiveEffect.implementation.fromStatusEffect(statusId);
    if ( overlay ) effect.updateSource({"flags.core.overlay": true});
    effect = enhanceStatusEffectWithExtras(effect, extras);
    const effectData = {...effect};
    effectData._id = effect._id;
    return ActiveEffect.implementation.create(effectData, {parent: this, keepId: true});
  }

  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  /** @override */
  async rollInitiative({createCombatants=false, rerollInitiative=false, initiativeOptions={}}={}) {

    // Obtain (or create) a combat encounter
    let combat = game.combat;
    if ( !combat ) {
      if ( game.user.isGM && canvas.scene ) {
        const cls = getDocumentClass("Combat");
        combat = await cls.create({scene: canvas.scene.id, active: true});
      }
      else {
        ui.notifications.warn("COMBAT.NoneActive", {localize: true});
        return null;
      }
    }

    // Create new combatants
    if ( createCombatants ) {
      let tokens = this.getActiveTokens();

      //====== INJECTED ====== 
      // If tokens are linked we want to roll initative only for one token
      if (tokens[0] && tokens[0].document.actorLink === true) {
        let tokenFound = tokens[0];

        // We expect that player will controll token from which he wants to roll initiative, if not we will pick first one
        const controlledIds = canvas.tokens.controlled.map(token => token.id);
        for(const token of tokens) {
          if (controlledIds.includes(token.id)) {
            tokenFound = token;
            break;
          }
        }
        tokens = [tokenFound];
      }
      //====== INJECTED ====== 

      const toCreate = [];
      if ( tokens.length ) {
        for ( let t of tokens ) {
          if ( t.inCombat ) continue;
          toCreate.push({tokenId: t.id, sceneId: t.scene.id, actorId: this.id, hidden: t.document.hidden});
        }
      } else toCreate.push({actorId: this.id, hidden: false});
      await combat.createEmbeddedDocuments("Combatant", toCreate);
    }

    // Roll initiative for combatants
    const combatants = combat.combatants.reduce((arr, c) => {
      if ( this.isToken && (c.token !== this.token) ) return arr;
      if ( !this.isToken && (c.actor !== this) ) return arr;
      if ( !rerollInitiative && (c.initiative !== null) ) return arr;
      arr.push(c.id);
      return arr;
    }, []);

    await combat.rollInitiative(combatants, initiativeOptions);
    return combat;
  }

  async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
    // We want to suppress default bar behaviour for health as we have our special method to deal with health changes
    if (attribute === "resources.health") {
      isBar = false; 
      attribute += ".value";
    }
    return await super.modifyTokenAttribute(attribute, value, isDelta, isBar);
  }

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (userId === game.user.id) {
      this.prepareBasicActions();
      preConfigurePrototype(this);
      preInitializeFlags(this);
    }
  }

  /** @inheritDoc */
  async _preUpdate(changes, options, user) {
    updateActorHp(this, changes);
    return await super._preUpdate(changes, options, user);
  }

  prepareBasicActions() {
    if (!this.flags.basicActionsAdded) {
      addBasicActions(this);
    }
  }
}