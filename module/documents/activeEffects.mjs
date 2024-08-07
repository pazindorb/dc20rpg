/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class DC20RpgActiveEffect extends ActiveEffect {

  /**@override */
  _applyUpgrade(actor, change, current, delta, changes) {
    // There is a bug where if update doesn't overrides change value it causes it to become undefined
    super._applyUpgrade(actor, change, current, delta, changes);
    if (changes[change.key] === undefined) changes[change.key] = current;
  }

  /**@override */
  static async fromStatusEffect(statusId, options={}) {
    const effect = super.fromStatusEffect(statusId, options);
    return effect;
  }

  /**
   * Returns item that is the source of that effect. If item isn't the source it will return null;
   */
  getSourceItem() {
    if (this.parent.documentName === "Actor") {
      const itemId = this.origin?.split("Item.")[1];
      return this.parent.items.get(itemId);
    }
    else if (this.parent.documentName === "Item") {
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
    this._runStatusChangeCheck(data);
    super._preCreate(data, options, user);
  }

  _runStatusChangeCheck(updateData) {
    if(!updateData.hasOwnProperty("statuses")) return;

    const difs = this._statusDif(this.statuses, updateData.statuses);
    difs.toAdd.forEach(statusId => {
      const status = CONFIG.statusEffects.find(e => e.id === statusId);
      if (status) updateData.changes = updateData.changes.concat(status.changes);
    });
    difs.toRemove.forEach(statusId => {
      const status = CONFIG.statusEffects.find(e => e.id === statusId);
      if (status) {
        const newChanges = [];
        updateData.changes.forEach(change => {
          if (!this.isChangeFromStatus(change, status)) newChanges.push(change);
        });
        updateData.changes = newChanges;
      }
    });
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
}