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
}