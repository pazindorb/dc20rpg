import { sendEffectRemovedMessage } from "../chat/chat-message.mjs";
import { effectEventsFilters, reenableEventsOn, runEventsFor, runInstantEvents } from "../helpers/actors/events.mjs";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class DC20RpgActiveEffect extends foundry.documents.ActiveEffect {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return this.mergeSchema(super.defineSchema(), {
      changes: new fields.ArrayField(new fields.SchemaField({
        key: new fields.StringField({required: true}),
        value: new fields.StringField({required: true}),
        mode: new fields.NumberField({required: true, nullable: false, integer: true, initial: CONST.ACTIVE_EFFECT_MODES.ADD}),
        priority: new fields.NumberField(),
        useCustom: new fields.BooleanField({required: true, initial: false})
      })),
      system: new fields.SchemaField({
        statusId: new fields.StringField({required: true}),
        duration: new fields.SchemaField({
          useCounter: new fields.BooleanField({required: true, initial: false}),
          resetWhenEnabled: new fields.BooleanField({required: true, initial: false}),
          onTimeEnd: new fields.StringField({required: true})
        }),
        effectKey: new fields.StringField({required: true}),
        macro: new fields.StringField({required: true}),
        addToChat: new fields.BooleanField({required: true, initial: false}),
        nonessential: new fields.BooleanField({required: true, initial: false}),
        disableWhen: new fields.SchemaField({
          path: new fields.StringField({required: true}),
          mode: new fields.StringField({required: true}),
          value: new fields.StringField({required: true})
        }),
        requireEnhancement: new fields.StringField({required: true}),
      })
    })
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }

  // We want to modify schema with our fields so we cannot use base document here
  /** @override */
  static get schema() {
    if ( this._schema ) return this._schema;
    const fields = foundry.data.fields;
    if ( !this.hasOwnProperty("_schema") ) {
      const schema = new fields.SchemaField(Object.freeze(this.defineSchema()));
      Object.defineProperty(this, "_schema", {value: schema, writable: false});
    }
    return this._schema;
  }

  get roundsLeft() {
    const useCounter = this.system.duration?.useCounter;
    const activeCombat = game.combats.active;
    if (useCounter && activeCombat) {
      const duration = this.duration;
      const beforeTurn = duration.startTurn > activeCombat.lastActiveTurn ? 1 : 0;
      const roundsLeft = duration.rounds + duration.startRound + beforeTurn - activeCombat.round;
      return roundsLeft;
    }
    else {
      return null;
    }
  }

  get isLinkedToItem() {
    if (!this.transfer) return false;
    const item = this.getSourceItem();
    if (!item) return false;
    const effectConfig = item.system.effectsConfig;
    if (!effectConfig) return false;

    if (item.system.toggle?.toggleable) return effectConfig.linkWithToggle;
    else return effectConfig.mustEquip;
  }

  get stateChangeLocked() {
    if (!this.transfer) return false;
    const item = this.getSourceItem();
    if (!item) return false;
    const effectConfig = item.system.effectsConfig;
    if (!effectConfig) return false;

    const toggleable = item.system.toggle?.toggleable;
    if (toggleable && effectConfig.linkWithToggle && !effectConfig.toggleItem) return true;
    if (toggleable && effectConfig.linkWithToggle && effectConfig.toggleItem) return false;
    return effectConfig.mustEquip
  }

  async disable({ignoreStateChangeLock}={}) {
    if (this.disabled) return;
    if (this.isLinkedToItem) {
      if (this.stateChangeLocked && !ignoreStateChangeLock) {
        ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
        return;
      }
      else {
        const parentItem = this.getSourceItem();
        await parentItem.update({["system.toggle.toggledOn"]: false});
      }
    }
    await this.update({disabled: true});
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("effectDisabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectDisabled: this});
      await reenableEventsOn("effectDisabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectDisabled: this});
    }
  }

  async enable({dontUpdateTimer, ignoreStateChangeLock}={}) {
    if (!this.disabled) return;
    if (this.isLinkedToItem) {
      if (this.stateChangeLocked && !ignoreStateChangeLock) {
        ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
        return;
      }
      else {
        const parentItem = this.getSourceItem();
        await parentItem.update({["system.toggle.toggledOn"]: true});
      }
    }

    const updateData = {disabled: false};
    // Check If we should use round counter
    const duration = this.system.duration;
    if (duration?.useCounter && duration?.resetWhenEnabled && !dontUpdateTimer) {
      const initial =  this.constructor.getInitialDuration();
      updateData.duration = initial.duration;
    }
    await this.update(updateData);
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("effectEnabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectEnabled: this}); 
      await reenableEventsOn("effectEnabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectEnabled: this}); 
    }
  }

  /**@override */
  apply(actor, change) {
    this._injectEffectIdToChange(change);
    super.apply(actor, change);
  }

  _injectEffectIdToChange(change) {
    const effect = change.effect;
    if (!effect) return;

    // We want to inject effect id only for events and roll levels
    if (change.key.includes("system.events") || change.key.includes("system.rollLevel")) {
      change.value = `"effectId": "${effect.id}", ` + change.value;
    }
  }

  /**@override */
  static async fromStatusEffect(statusId, options={}) {
    const effect = await super.fromStatusEffect(statusId, options);
    return effect;
  }

  /**
   * Returns item that is the source of that effect. If item isn't the source it will return null;
   */
  getSourceItem() {
    if (this.parent.documentName === "Item") {
      return this.parent;
    }
    return null;
  }
  
  getOwningActor() {
    if (this.parent.documentName === "Item") {
      return this.parent.actor;
    }
    if (this.parent.documentName === "Actor") {
      return this.parent;
    }
    return null;
  }

  // If we are removing a status from effect we need to run check 
  async _preUpdate(changed, options, user) {
    this._runStatusChangeCheck(changed);
    super._preUpdate(changed, options, user);
  }

  async _preCreate(data, options, user) {
    if (this.parent.documentName === "Actor") {
      await runEventsFor("effectApplied", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {createdEffect: this}); 
      await reenableEventsOn("effectApplied", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {createdEffect: this}); 
      if (this.preventCreation) return false;
    }
    this._runStatusChangeCheck(data);
    super._preCreate(data, options, user);
  }

  async _preDelete(options, user) {
    if (this.parent.documentName === "Actor") {
      await runEventsFor("effectRemoved", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {removedEffect: this}); 
      await reenableEventsOn("effectRemoved", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {removedEffect: this}); 
      if (this.preventRemoval) return false;
    }
    return await super._preDelete(options, user);
  }

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (userId === game.user.id) {
      // FORGE BUG FIX: For some reason Forge hosting does not update turn and round by default so we need to do it manually 
      if (data.duration.startTime === null) {
        this.update(this.constructor.getInitialDuration());
      }
      runInstantEvents(this, this.parent);
    }
  }

  _runStatusChangeCheck(updateData) {
    const newStatusId = updateData.system?.statusId;
    const oldStatusId = this.system?.statusId;
    if (newStatusId === undefined) return;
    if (newStatusId === oldStatusId) return;

    // remove old changes
    if(oldStatusId) {
      const oldStatus = CONFIG.statusEffects.find(e => e.id === oldStatusId);
      if (oldStatus) {
        const newChanges = [];
        updateData.changes.forEach(change => {
          if (!this.isChangeFromStatus(change, oldStatus)) newChanges.push(change);
        });
        updateData.changes = newChanges;
      }
    }
    // add new changes
    const newStatus = CONFIG.statusEffects.find(e => e.id === newStatusId)
    if (!updateData.changes) updateData.changes = [];
    if (newStatus) updateData.changes = updateData.changes.concat(newStatus.changes);
  }

  _statusDif(current, updated) {
    return {
      toAdd: new Set(updated).difference(current),
      toRemove: current.difference(new Set(updated))
    }
  }

  isChangeFromStatus(change, status) {
    let hasChange = false;
    status.changes.forEach(statusChange => {
      if (statusChange.key === change.key && 
          statusChange.value === change.value && 
          statusChange.mode === change.mode) {
            hasChange = true;
          }
    });
    return hasChange;
  }

  async respectRoundCounter() {
    const durationFlag = this.system.duration; 
    if (!durationFlag) return;
    if (!durationFlag.useCounter) return;
    if (this.roundsLeft === null) return;
    if (this.roundsLeft > 0) return;

    const onTimeEnd = durationFlag.onTimeEnd;
    if (!onTimeEnd) return;

    if (onTimeEnd === "disable") await this.disable();
    if (onTimeEnd === "delete") {
      sendEffectRemovedMessage(this.parent, this);
      await this.delete();
    }
  }
}