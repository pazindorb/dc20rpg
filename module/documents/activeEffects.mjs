import { sendEffectRemovedMessage } from "../chat/chat-message.mjs";
import { reenableEventsOn, runEventsFor } from "../helpers/actors/events.mjs";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class DC20RpgActiveEffect extends ActiveEffect {

  get roundsLeft() {
    const useCounter = this.flags.dc20rpg?.duration?.useCounter;
    const activeCombat = game.combats.active;
    if (useCounter && activeCombat) {
      const duration = this.duration;
      const roundsLeft = duration.rounds + duration.startRound - activeCombat.round;
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
      await runEventsFor("effectDisabled", actor, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {effectDisabled: this});
      await reenableEventsOn("effectDisabled", actor, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {effectDisabled: this});
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
    const duration = this.flags.dc20rpg?.duration;
    if (duration?.useCounter && duration?.resetWhenEnabled && !dontUpdateTimer) {
      const initial =  this.constructor.getInitialDuration();
      updateData.duration = initial.duration;
    }
    await this.update(updateData);
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("effectEnabled", actor, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {effectEnabled: this});
      await reenableEventsOn("effectEnabled", actor, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {effectEnabled: this});
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
      await runEventsFor("effectApplied", this.parent, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {createdEffect: this});
      await reenableEventsOn("effectApplied", this.parent, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {createdEffect: this});
      if (this.preventCreation) return false;
    }
    this._runStatusChangeCheck(data);
    super._preCreate(data, options, user);
  }

  async _preDelete(options, user) {
    if (this.parent.documentName === "Actor") {
      await runEventsFor("effectRemoved", this.parent, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {removedEffect: this});
      await reenableEventsOn("effectRemoved", this.parent, {effectName: this.name, statuses: this.statuses, effectKey: this.flags.dc20rpg?.effectKey}, {removedEffect: this});
      if (this.preventRemoval) return false;
    }
    return await super._preDelete(options, user);
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
    if (this.roundsLeft === null) return;
    if (this.roundsLeft > 0) return;

    const onTimeEnd = this.flags.dc20rpg?.duration?.onTimeEnd;
    if (!onTimeEnd) return;

    if (onTimeEnd === "disable") await this.disable();
    if (onTimeEnd === "delete") {
      sendEffectRemovedMessage(this.parent, this);
      await this.delete();
    }
  }
}