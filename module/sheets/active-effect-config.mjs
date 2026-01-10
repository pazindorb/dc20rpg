import { createSystemsBuilder } from "../dialogs/systems-builder.mjs";
import { getEffectModifiableKeys } from "../helpers/effects.mjs";
import { createTemporaryMacro } from "../helpers/macros.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class DC20RpgActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
  changesCache = new Map();

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.effectKeys = getEffectModifiableKeys();
    this.itemEnhancements = this._getItemEnhacements();
  }

  _getItemEnhacements() {
    const item = this.document.parent;
    if (item.documentName !== "Item") return {};
    else {
      const dropdownData = {};
      item.allEnhancements.forEach((value, key) => dropdownData[key] = value.name)
      return dropdownData;
    }
  }

    /** @override */
  static PARTS = {
    header: {template: "templates/sheets/active-effect/header.hbs"},
    tabs: {template: "templates/generic/tab-navigation.hbs"},
    details: {template: "systems/dc20rpg/templates/sheets/active-effect/details.hbs", scrollable: [""]},
    config: {template: "systems/dc20rpg/templates/sheets/active-effect/config.hbs", scrollable: [""]},
    duration: {template: "systems/dc20rpg/templates/sheets/active-effect/duration.hbs"},
    changes: {template: "systems/dc20rpg/templates/sheets/active-effect/changes.hbs", scrollable: ["ol[data-changes]"]},
    footer: {template: "templates/generic/form-footer.hbs"}
  };

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        {id: "details", icon: "fa-solid fa-book"},
        {id: "config", icon: "fa-solid fa-gears"},
        {id: "duration", icon: "fa-solid fa-clock"},
        {id: "changes", icon: "fa-solid fa-feather"}
      ],
      initial: "details",
      labelPrefix: "EFFECT.TABS"
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.position.width = 740;
    initialized.classes.push("dc20rpg");
    initialized.actions.systemBuilder = this._onSystemsBuilder;
    initialized.actions.editMacro = this._onEffectMacro;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.disableRoundCounter = !this.document.system.duration.useCounter;
    context.source.system.duration.useCounter = this.document.system.duration.useCounter;
    context.logicalExpressions = CONFIG.DC20RPG.DROPDOWN_DATA.logicalExpressions;
    context.effectKeys = this.effectKeys;
    context.itemEnhancements = this.itemEnhancements;
    context.onTimeEndOptions = {
      "": "",
      disable: "Disable Effect",
      delete: "Delete Effect",
      runMacro: "Run Macro"
    };
    const statusIds = {};
    CONFIG.statusEffects.forEach(status => statusIds[status.id]= status.name);
    context.statusIds = statusIds;

    if (options.isFirstRender) {
      this._prepareChangesCache(context.source.changes, context.effectKeys);
    }
    this._setUseCustomFlagFromCache(context.source.changes);
    return context;
  }

  _prepareChangesCache(changes, keys) {
    for (let i = 0; i < changes.length; i++) {
      if (!changes[i].key) this.changesCache.set(i, false);
      else if (keys[changes[i].key]) this.changesCache.set(i, false);
      else this.changesCache.set(i, true);
    }
  }

  _setUseCustomFlagFromCache(changes) {
    for (let i = 0; i < changes.length; i++) {
      changes[i].useCustom = this.changesCache.get(i) || false;
    }
  }

  async _onSystemsBuilder(event, target) {
    const dataset = target.dataset;
    const type = dataset.type;
    const changeIndex = dataset.index; 
    const isSkill = dataset.isSkill;

    const changes = this.document.changes;
    if (!changes) return;
    const change = changes[changeIndex];
    if (change === undefined) return;

    const result = await createSystemsBuilder(type, change.value, isSkill);
    if (result) {
      changes[changeIndex].value = result;
      this.document.update({changes: changes});
    }
  }

  async _onEffectMacro(event, target) {
    const command = this.document.system?.macro || "";
    const macro = await createTemporaryMacro(command, this.document, {effect: this.document});
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
  }

  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if (event.target.name && (event.target.name.startsWith("changes.") || event.target.name === "system.duration.useCounter")) {
      this._updateChanges(event);
      this.render();
    }
    if (event.target.name && event.target.name.startsWith("cache.")) {
      this._updateCache(event);
    }
  }

  _updateChanges(event) {
    const path = event.target.name;
    const doc = this.document;

    switch (event.target.type) {
      case "checkbox":
        const boolValue = getValueFromPath(doc, path);
        setValueForPath(doc, path, !boolValue);
        break;

      case "text": case "select-one": case "textarea":
        const textValue = event.target.value;
        setValueForPath(doc, path, textValue);
        break;

      case "number": 
        const numberValue = event.target.value ? parseInt(event.target.value) : null;
        setValueForPath(doc, path, numberValue);
        break;
    }
    this.document.update({changes: doc.changes});
  }

  _updateCache(event) {
    const [type, stringIndex, field] = event.target.name.split(".");
    const index = parseInt(stringIndex);
    const value = this.changesCache.get(index) || false;
    this.changesCache.set(index, !value);
    this.render();
  }

  async close(options) {
    await super.close(options);
    const flags = this.document.flags.dc20rpg;
    if (flags?.enhKey || flags?.condKey) {
      const item = this.document.parent;
      if (item.documentName !== "Item") return;

      const effectData = this.document.toObject();
      effectData.origin = null;
      if (flags.condKey) item.update({[`system.conditionals.${flags.condKey}.effect`]: effectData});
      if (flags.enhKey) item.update({[`system.enhancements.${flags.enhKey}.modifications.addsEffect`]: effectData});
      await this.document.delete();
    }
  }
}