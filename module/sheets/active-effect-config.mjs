import { createSystemsBuilder } from "../dialogs/systems-builder.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { getEffectModifiableKeys } from "../helpers/effects.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { createTemporaryMacro } from "../helpers/macros.mjs";
import { getValueFromPath, parseFromString, setValueForPath } from "../helpers/utils.mjs";

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

    const statusIds = {};
    CONFIG.statusEffects.forEach(status => statusIds[status.id]= status.name);
    return {
      ...data,
      logicalExpressions: DC20RPG.logicalExpressions,
      statusIds: statusIds,
      itemEnhancements: this._getItemEnhacements()
    }
  }

  _getItemEnhacements() {
    const item = this.object.parent;
    if (item.documentName !== "Item") return {};
    else {
      const dropdownData = {};
      item.allEnhancements.forEach((value, key) => dropdownData[key] = value.name)
      return dropdownData;
    }
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
    html.find('.open-systems-builder').click(ev => this._onSystemsBuilder(datasetOf(ev).type, datasetOf(ev).index, datasetOf(ev).isSkill));
    html.find('.update-key').change(ev => this._onUpdateKey(valueOf(ev), datasetOf(ev).index));
    html.find('.effect-macro').click(() => this._onEffectMacro());
  }

  _onActivable(pathToValue) {
    const value = getValueFromPath(this.object, pathToValue);
    setValueForPath(this.object, pathToValue, !value);
    this.render(true);
  }

  async _onUpdateKey(key, index) {
    index = parseFromString(index);
    const changes = this.object.changes; 
    changes[index].key = key;
    await this.object.update({changes: changes});
  }

  async _onSystemsBuilder(type, changeIndex, isSkill) {
    const changes = this.object.changes;
    if (!changes) return;
    const change = changes[changeIndex];
    if (change === undefined) return;

    const result = await createSystemsBuilder(type, change.value, isSkill);
    if (result) {
      changes[changeIndex].value = result;
      this.object.update({changes: changes});
    }
  }

  async _onEffectMacro() {
    const command = this.object.flags.dc20rpg?.macro || "";
    const macro = await createTemporaryMacro(command, this.object, {effect: this.object});
    macro.canUserExecute = (user) => {
      ui.notifications.warn("This is an Effect Macro and it cannot be executed here.");
      return false;
    };
    macro.sheet.render(true);
  }
}