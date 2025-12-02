import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { RestDialog } from "../dialogs/rest.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { makeMoveAction, spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { runResourceChangeEvent } from "../helpers/actors/costManipulator.mjs";
import { minimalAmountFilter, parseEvent, runEventsFor } from "../helpers/actors/events.mjs";
import { displayScrollingTextOnToken, getAllTokensForActor, preConfigurePrototype, updateActorHp } from "../helpers/actors/tokens.mjs";
import { deleteEffectFrom } from "../helpers/effects.mjs";
import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { emitEventToGM } from "../helpers/sockets.mjs";
import { getValueFromPath, translateLabels } from "../helpers/utils.mjs";
import { DC20Roll } from "../roll/rollApi.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { dazedCheck, enhanceStatusEffectWithExtras, exhaustionCheck, fullyStunnedCheck, getStatusWithId, hasStatusWithId, healthThresholdsCheck } from "../statusEffects/statusUtils.mjs";
import { makeCalculations } from "./actor/actor-calculations.mjs";
import { prepareDataFromItems, prepareEquippedItemsFlags, prepareRollDataForItems, prepareUniqueItemData } from "./actor/actor-copyItemData.mjs";
import { enhanceEffects, modifyActiveEffects, suspendDuplicatedConditions } from "./actor/actor-effects.mjs";
import { preInitializeFlags } from "./actor/actor-flags.mjs";
import { enrichWithHelpers } from "./actor/actor-helpers.mjs";
import {prepareRollData, prepareRollDataForEffectCall } from "./actor/actor-roll.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class DC20RpgActor extends Actor {

  get class() {
    return this.items.get(this.system.details.class.id);
  }

  get exhaustion() {
    return getStatusWithId(this, "exhaustion")?.stack || 0
  }

  get slowed() {
    return this.system.moveCost - 1 || 0;
  }

  get dead() {
    return this.hasStatus("dead");
  }

  get allEffects() {
    const effects = [];
    for ( const effect of this.allApplicableEffects()) {
      effects.push(effect);
    }
    const sorted = effects.sort((a, b) => b.changes.length - a.changes.length);
    return sorted;
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

  /**
   * Collect all events from enabled effects + events with alwaysActive flag set to true
   */
  get activeEvents() {
    const events = [];
    for (const effect of this.allApplicableEffects()) {
      for (const change of effect.changes) {
        if (change.key === "system.events") {
          const changeValue = `"effectId": "${effect.id}", ` + change.value; // We need to inject effect id
          const paresed = parseEvent(changeValue);
          if (!effect.disabled || paresed.alwaysActive) {
            events.push(paresed);
          }
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

  get statusIds() {
    return this.statuses.map(status => status.id);
  }

  get myTurnActive() {
    const activeCombat = game.combats.active;
    if (!activeCombat?.started) return false;

    const myTurn = !!(activeCombat.activeCombatants.find(combatant => {
      if (this.token) return combatant.tokenId === this.token.id;
      else return combatant.actorId === this.id;
    }));
    if (myTurn) return true;

    if (companionShare(this, "initiative")) {
      const ownerTurn = !!(activeCombat.activeCombatants.find(combatant => combatant.actorId === this.companionOwner.id));
      if (ownerTurn) return true;
    }
    return false;
  }

  /** @override */
  *allApplicableEffects() {
    for (const effect of super.allApplicableEffects()) {
      const parent = effect.parent;
      if (parent.type === "infusion") continue;
      yield effect;
    }
  }

  companionShareFor(key) {
    if (this.shouldShareWithOwner(key)) return this.companionOwner;
    return this;
  }

  shouldShareWithOwner(key) {
    if (this.type !== "companion") return false;
    if (!this.companionOwner) return false;
    return getValueFromPath(this, `system.shareWithCompanionOwner.${key}`);
  }

  /** @override */
  prepareData() {
    this.statuses ??= new Set();
    this.coreStatuses ??= new Set();
    const specialStatuses = new Map();
    for ( const statusId of Object.values(CONFIG.specialStatusEffects) ) {
      specialStatuses.set(statusId, this.hasStatus(statusId));
    }
    super.prepareData();

    const tokens = this.getDependentTokens({scenes: canvas.scene}).filter(t => t.rendered).map(t => t.object) || [];
    for ( const [statusId, wasActive] of specialStatuses ) {
      const isActive = this.hasStatus(statusId);
      if ( isActive === wasActive ) continue;
      for ( const token of tokens ) {
        token._onApplyStatusEffect(statusId, isActive);
      }
    }
    for ( const token of tokens ) token.document.prepareData()
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
            this.reset();
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
    fullyStunnedCheck(this);
    exhaustionCheck(this);
    dazedCheck(this);
    
    prepareUniqueItemData(this);
    prepareEquippedItemsFlags(this);
    enhanceEffects(this);
    this.prepareActiveEffectsDocuments();
    prepareRollDataForItems(this);
    this.prepareOtherEmbeddedDocuments();
    prepareDataFromItems(this);

    // Refresh hotbar 
    if (ui.hotbar) {
      if (ui.hotbar.actorId === this.id) ui.hotbar.render();
    }
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
  }

  /**
   * We need to prepare Active Effects before we deal with other items.
   */
  prepareOtherEmbeddedDocuments() {
    for ( const collectionName of Object.keys(this.constructor.hierarchy || {}) ) {
      if (collectionName !== "effects") {
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
    enrichWithHelpers(this);
    this.prepared = true; // Mark actor as prepared
  }

  applyActiveEffects() {
    modifyActiveEffects(this.allApplicableEffects(), this);

    const overrides = {};
    this.statuses.clear();
    this.coreStatuses.clear();
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

      // Core status
      if (effect.system.statusId) this.coreStatuses.add(effect.system.statusId);
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

  //=====================================
  //=         ROLL FROM ACTOR           =
  //=====================================
  /** @override */
  getRollData(activeEffectCalls) { 
    const data = {...super.getRollData()}
    if (activeEffectCalls) return prepareRollDataForEffectCall(this, data);
    return prepareRollData(this, data);
  }

  async roll(key, type, options={}, details) {
    if (!details) {
      if (type === "save") details = DC20Roll.prepareSaveDetails(key, options);
      if (type === "check") details = DC20Roll.prepareCheckDetails(key, options);
    }
    return await RollDialog.open(this, details, options);
  }

  getRollOptions() {
    const options = {};
    options.basic = CONFIG.DC20RPG.ROLL_KEYS.baseChecks;
    options.attribute = CONFIG.DC20RPG.ROLL_KEYS.attributeChecks;
    options.save = CONFIG.DC20RPG.ROLL_KEYS.saveTypes;

    const skills = {};
    if (this.system.skills.acr && this.system.skills.ath) skills.mar = "Martial Check";
    Object.entries(this.system.skills).forEach(([key, skill]) => skills[key] = `${skill.label} Check`);
    options.skill = skills; 

    if (this.system.trades) {
      const trade = {};
      Object.entries(this.system.trades).forEach(([key, skill]) => trade[key] = `${skill.label} Check`);
      options.trade = trade; 
    }

    return options;
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
        const maxChargesFormula = item.system.costs?.charges?.maxChargesFormula;
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

  hasStatus(statusId) {
    return this.statusIds.has(statusId);
  }

  hasAnyStatus(statuses) {
    for (const statusId of statuses) {
      if (this.hasStatus(statusId)) return true;
    }
    return false;
  }

  getEffectWithName(effectName) {
    for (const effect of this.allApplicableEffects()) {
      if (effect.name === effectName) return effect;
    }
  }

  _prepareCustomResources() {
    // remove empty custom resources and calculate its max charges
    for (const [key, resource] of Object.entries(this.system.resources.custom)) {
      const fromFormula = resource.maxFormula ? evaluateDicelessFormula(resource.maxFormula, this.getRollData()).total : 0;
      resource.max = fromFormula + (resource.bonus || 0);
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
      for (const effect of this.allEffects) {
        const statuses = effect.statuses;
        // We only want to turn off standard status effects that way, not the ones from items.
        if (effect.fromStatus) {
          if (statuses.size === 1 &&  statuses.has(statusId)) existing.push(effect.id);
        }
      }
    }

    // Remove the existing effects unless the status effect is forced active
    if (!active && existing.length) {
      if (statusId === "prone") {
        const spendMovePointsToStandFromProne = game.settings.get("dc20rpg","spendMovePointsToStandFromProne");
        if (spendMovePointsToStandFromProne !== "never") {
          let confirmed = true;
          if (spendMovePointsToStandFromProne === "ask") confirmed = await SimplePopup.confirm("Should spend 2 Move Points to stand up from Prone?");

          if (confirmed) {
            let subtracted = await subtractMovePoints(this, 2);
            if (subtracted !== true) {
              subtracted = await spendMoreApOnMovement(this, subtracted);
            }
            if (subtracted !== true) {
              ui.notifications.warn("Not enough move points to stand up from Prone!");
              return false;
            }
          }
        }
      }

      // Sometimes one effects triggers removal of another one
      const effectId = existing.pop();
      const effect = this.effects.get(effectId);
      for (const statusId of effect.system.disableStatusOnRemoval) {
        await this.toggleStatusEffect(statusId, {active: false});
      }

      await this.deleteEmbeddedDocuments("ActiveEffect", [effectId]); // We want to remove 1 stack of effect at the time
      this.reset();
      return false;
    }
    
    // Create a new effect unless the status effect is forced inactive
    if ( !active && (active !== undefined) ) return;
    // Create new effect only if status is stackable
    if (existing.length > 0 && !status.stackable) return;
    // Do not create new effect if actor is immune to it.
    if (this.system.statusResistances[statusId]?.immunity) {
      ui.notifications.warn(`${this.name} is immune to '${statusId}'.`);
      return;
    }

    let effect = await ActiveEffect.implementation.fromStatusEffect(statusId);
    if ( overlay ) effect.updateSource({"flags.core.overlay": true});
    effect = enhanceStatusEffectWithExtras(effect, extras);
    const effectData = {...effect};
    effectData._id = effect._id;
    effectData.system.fromStatus = true;
    const created = await ActiveEffect.implementation.create(effectData, {parent: this, keepId: true});

    // Sometimes one effects triggers application of another one
    for (const statusId of created.system.enableStatusOnCreation) {
      await this.toggleStatusEffect(statusId, {active: true});
    }
    
    this.reset();
    return created;
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
      // If tokens are linked we want to roll initiative only for one token
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

  //======================================
  //=           CRUD OPERATIONS          =
  //======================================
  /**
   * Run update opperation on Document. If user doesn't have permissions to do so he will send a request to the active GM.
   * No object will be returned by this method.
   */
  async gmUpdate(updateData={}, operation={}) {
    if (!this.canUserModify(game.user, "update")) {
      emitEventToGM("updateDocument", {
        docUuid: this.uuid,
        updateData: updateData,
        operation: operation
      });
    }
    else {
      await this.update(updateData, operation);
    }
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

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    // HP change check
    if (userId === game.user.id) {
      if (changed.system?.resources?.health) {
        const newHP = changed.system.resources.health;
        const previousHP = this.hpBeforeUpdate;
        const tempHpChange = newHP.temp > 0 && !newHP.current;
        
        const newValue = newHP.value;
        const oldValue = previousHP.value;
        healthThresholdsCheck(newHP.current, this);
        
        const hpDif = oldValue - newValue;
        const tokens = getAllTokensForActor(this);
        if (hpDif < 0) {
          const text = `+${Math.abs(hpDif)}`;
          tokens.forEach(token => displayScrollingTextOnToken(token, text, "#009c0d"));
          if(!this.skipEventCall && !tempHpChange) runEventsFor("healingTaken", this, minimalAmountFilter(Math.abs(hpDif)), {amount: Math.abs(hpDif), messageId: this.messageId}); // Temporary HP does not trigger that event (it is not healing)
        }
        else if (hpDif > 0) {
          const text = `-${Math.abs(hpDif)}`;
          tokens.forEach(token => displayScrollingTextOnToken(token, text, "#9c0000"));
          if(!this.skipEventCall) runEventsFor("damageTaken", this, minimalAmountFilter(Math.abs(hpDif)), {amount: Math.abs(hpDif), messageId: this.messageId}); 
        }
      }
    }

    // Update Storage token
    if (this.type === "storage") {
      const storageType = changed?.system?.storageType;
      if (storageType) {
        switch(storageType) {
          case "partyInventory": 
            this.update({['prototypeToken.actorLink'] : true});
            break;
          case "randomLootTable": 
            this.update({['prototypeToken.actorLink'] : false});
            break;
          case "vendor": 
            this.update({['prototypeToken.actorLink'] : false});
            break;
        }
      }
    }
  }

  /** @inheritDoc */
  async _preUpdate(changes, options, user) {
    await updateActorHp(this, changes);
    if (changes.system?.resources?.health) {
      this.skipEventCall = changes.skipEventCall;
      this.messageId = changes.messageId;
      this.hpBeforeUpdate = this.system.resources.health;
    }

    // Run resource change event
    if (changes.system?.resources) {
      const before = this.system.resources;
      for (const [key, resource] of Object.entries(changes.system.resources)) {
        if (key === "health") continue;
        if (key === "custom") {
          for (const [customKey, customRes] of Object.entries(resource)) {
            await runResourceChangeEvent(customKey, customRes, before.custom[customKey], this, true);
          }
        }
        await runResourceChangeEvent(key, resource, before[key], this, false);
      }
    }
    return await super._preUpdate(changes, options, user);
  }

  //======================================
  //=           ITEMS ON ACTOR           =
  //======================================
  async prepareBasicActions() {
    if (this.type === "storage") return;

    // Remove all basic actions
    const basicActionIds = this.items.filter(item => item.type === "basicAction" || item.system?.itemKey === "unarmedStrike").map(item => item.id);
    await this.deleteEmbeddedDocuments("Item", basicActionIds);

    // Add basic actions
    const actionsData = [];
    for (const [key, uuid] of Object.entries(CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.basicActionsItems)) {
      const action = await fromUuid(uuid);
      const data = action.toObject();
      data.flags.dc20BasicActionsSource = uuid;
      data.flags.dc20BasicActionKey = key;
      actionsData.push(data);
    }

    if (this.type === "character") {
      const uuid = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.unarmedStrike;
      const action = await fromUuid(uuid);
      const data = action.toObject();
      data.flags.dc20BasicActionsSource = uuid;
      data.flags.dc20BasicActionKey = "unarmedStrike";
      actionsData.push(data);
    }
    await this.createEmbeddedDocuments("Item", actionsData);
  }

  /**
   * Returns all items from actor that match given type and filters (if provided)
   * 
   * @param {Array} types - array of types that should match item type
   * @param {Array} filters - array of optional filters (functions) that items should be run against. Filters must return true/false. Filter example:
   *                          (item) => item.name === "My specific weapon"
   * @param {boolean} toSelect - if true, method will return items as an object of {id: name} fields;
   */
  getAllItemsWithType(types, filters=[], toSelect) {
    const items = this.items.filter(item => types.includes(item.type));
    const matched = items.filter(item => this.#matchFilters(item, filters));
    if (toSelect) {
      const selectOptions = {};
      matched.forEach(item => selectOptions[item.id] = item.name);
      return selectOptions;
    }
    else {
      return matched;
    }
  }

  #matchFilters(item, filters) {
    for (const filter of filters) {
      if (!filter(item)) return false;
    }
    return true;
  }

  //======================================
  //=               SUSTAIN              =
  //======================================
  shouldSustain(item) {
    if (item.system.duration.type !== "sustain") return false;

    const activeCombat = game.combats.active;
    const notInCombat = !(activeCombat && activeCombat.started && this.inCombat);
    if (notInCombat) return false;
    return true;
  }

  async addSustain(item) {
    await this.update({[`system.sustain.${item.id}`]: {
      name: item.name,
      img: item.img,
      itemId: item.id,
      description: item.system.description,
      linkedEffects: []
    }});
  }

  async addEffectToSustain(key, effectUuid) {
    const sustain = this.system.sustain[key];
    if (!sustain) return;
    const linkedEffects = sustain.linkedEffects;
    linkedEffects.push(effectUuid);
    await this.gmUpdate({[`system.sustain.${key}.linkedEffects`]: linkedEffects});
  }

  async dropSustain(key, message) {
    const sustain = this.system.sustain[key];
    if (!sustain) return;

    for (const effectUuid of sustain.linkedEffects) {
      const effect = await fromUuid(effectUuid);
      if (!effect) continue;
      const owner = effect.getOwningActor();
      if (!owner) continue;
      deleteEffectFrom(effect.id, owner);
    }
    await this.update({[`system.sustain.-=${key}`]: null});

    if (message) {
      sendDescriptionToChat(this, {
        rollTitle: `[Sustain dropped] ${sustain.name}`,
        image: sustain.img,
        description: `You are no longer sustaining '${sustain.name}' - ${message}`,
      });
    }
  }

  rest(options) {
    RestDialog.open(this, options);
  }

  async moveAction(options={}) {
    await makeMoveAction(this, options);
  }
}