import { getEffectModifiableKeys } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class DC20RpgActiveEffectConfig extends ActiveEffectConfig {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.keys = getEffectModifiableKeys();
    this.firstTimeOpen = true;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "active-effect-sheet"], //css classes
      width: 680,
      height: 460,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/shared/active-effect-config.hbs`;
  }

  /** @override */
  async getData(options={}) {
    const data = await super.getData(options);
    data.keys = this.keys;
    if (this.firstTimeOpen) this._customKeyCheck(data.data.changes, data.keys);
    return data;
  }

  _customKeyCheck(changes, keys) {
    for (let i = 0; i < changes.length; i++) {
      if (!changes[i].key) changes[i].useCustom = false;
      else if (keys[changes[i].key]) changes[i].useCustom = false;
      else changes[i].useCustom = true;
    }
    this.firstTimeOpen = false;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
  }

  _onActivable(pathToValue) {
    const value = getValueFromPath(this.object, pathToValue);
    setValueForPath(this.object, pathToValue, !value);
    this.render(true);
  }
}