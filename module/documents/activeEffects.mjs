/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class DC20RpgActiveEffect extends ActiveEffect {

  /**@override */
  prepareDerivedData() {
    // v11 compatibility (TODO: REMOVE LATER)
    if (!this.img && !this.icon) {
      const item = this.getSourceItem();
      if (item) this.icon = item.img;
      else this.icon = this.parent.img; 
    }
    // =====================
  }

  /**@override */
  _applyUpgrade(actor, change, current, delta, changes) {
    // There is a bug where if update doesn't overrides change value it causes it to become undefined
    super._applyUpgrade(actor, change, current, delta, changes);
    if (changes[change.key] === undefined) changes[change.key] = current;
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
}