import { DC20Dialog } from "./dc20Dialog.mjs";

class ResourceConfigDialog extends DC20Dialog {

  constructor(actor, resourceKey, options = {}) {
    super(options);
    this.actor = actor;
    this.key = resourceKey;
    this.resource = actor.system.resources.custom[resourceKey];
    // We do not want to commit any bonuses
    if (this.resource.bonus) delete this.resource.bonus; 
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/resource-config-dialog.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Configure Resource";
    initialized.window.icon = "fa-solid fa-gears";
    initialized.position.width = 520;
    initialized.actions.save = this._onSave;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.resourceKey = this.key;
    context.resource = this.resource;
    context.resetTypes = CONFIG.DC20RPG.DROPDOWN_DATA.resetTypes;
    return context;
  }

  async _onRemoveOption(path, value, dataset) {
    super._onRemoveOption(path, value, dataset);
    this.resource.refresh[`-=${dataset.key}`] = null; 
  }

  async _onMultiSelectChange(path, value, duplicates, dataset, target) {
    super._onMultiSelectChange(path, value, duplicates, dataset, target);
    if (this.resource.refresh.hasOwnProperty(`-=${value}`)) {
      delete this.resource.refresh[`-=${value}`];
    }
  }

  _onSave(event, target) {
    event.preventDefault();
    const updatePath = `system.resources.custom.${this.key}`;
    this.actor.update({ [updatePath] : this.resource });
    this.close();
  }
}

export function resourceConfigDialog(actor, resourceKey) {
  new ResourceConfigDialog(actor, resourceKey).render(true);
}