import { createSystemsBuilder } from "../dialogs/systems-builder.mjs";
import { getEffectModifiableKeys } from "../helpers/effects.mjs";
import { createTemporaryMacro } from "../helpers/macros.mjs";
import { applyStatusToEffect } from "../helpers/utils.mjs";

export class DC20RpgActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.effectKeys = getEffectModifiableKeys();
  }

    /** @override */
  static PARTS = {
    header: {template: "templates/sheets/active-effect/header.hbs"},
    tabs: {template: "templates/generic/tab-navigation.hbs"},
    details: {template: "systems/dc20rpg/templates/sheets/active-effect/details.hbs", scrollable: [""]},
    config: {template: "systems/dc20rpg/templates/sheets/active-effect/config.hbs", scrollable: [""]},
    duration: {template: "systems/dc20rpg/templates/sheets/active-effect/duration.hbs"},
    changes: {template: "systems/dc20rpg/templates/sheets/active-effect/changes.hbs", scrollable: ["ol[data-changes]"]},
    footer: {template: "systems/dc20rpg/templates/sheets/active-effect/footer.hbs"}
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
    initialized.actions.statusEffects = this._onAddStatusEffectChanges;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.logicalExpressions = CONFIG.DC20RPG.DROPDOWN_DATA.logicalExpressions;
    context.effectKeys = this.effectKeys;
    context.changeTypes = ActiveEffect.CHANGE_TYPES;
    context.expiryActions = {
      "": "",
      disable: "Disable Effect",
      delete: "Delete Effect",
      runMacro: "Run Macro"
    };

    return context;
  }

  async _onSystemsBuilder(event, target) {
    const dataset = target.dataset;
    const type = dataset.type;
    const index = dataset.index; 
    const isSkill = dataset.isSkill;
    const isAttack = dataset.isAttack;

    const changes = this.document.system.changes;
    if (!changes) return;
    const change = changes[index];
    if (!change) return;

    const result = await createSystemsBuilder(type, change.value, {isSkill: isSkill, isAttack: isAttack});
    if (result) {
      changes[index].value = result;
      this.document.update({["system.changes"]: changes});
    }
  }

  async _onEffectMacro(event, target) {
    const command = this.document.system?.macro || "";
    const macro = await createTemporaryMacro(command, this.document, {effectUuid: this.document.uuid});
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
  }

  async _onAddStatusEffectChanges(event, target) {
    for (const statusId of this.document.statuses) {
      applyStatusToEffect(this.document, statusId)
    }
    this.document.update({["system.changes"]: this.document.system.changes});
  }

  async close(options) {
    await super.close(options);
    const flags = this.document.flags.dc20rpg;
    if (flags?.itemSavePath) {
      const item = this.document.parent;
      if (item.documentName !== "Item") return;

      const effectData = this.document.toObject();
      effectData.origin = null;
      item.update({[flags.itemSavePath]: effectData});
      this.document.delete();
    }
  }
}