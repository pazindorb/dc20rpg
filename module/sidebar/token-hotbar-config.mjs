import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class TokenHotbarConfig extends DC20Dialog {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.data = actor.system.tokenHotbar;
    this.settings = game.settings.get("dc20rpg", "tokenHotbarSettings");
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/sidebar/token-hotbar-config.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Token Hotbar Config";
    initialized.window.icon = "fa-solid fa-gears";
    initialized.actions.save = this._onSave;
    initialized.position.width = 620;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.data = this.data;
    context.settings = this.settings;
    context.resources = this._collectResources();
    return context;
  }

  _collectResources() {
    const res = this.actor.system.resources;
    if (!res) return {};

    const resources = {};
    // Basic Resources
    if (res.stamina) resources.stamina = res.stamina.label;
    if (res.mana) resources.mana = res.mana.label;
    if (res.grit) resources.grit = res.grit.label;
    if (res.restPoints) resources.restPoints = res.restPoints.label;

    // Custom Resources
    Object.entries(res.custom).forEach(([key, resource]) =>  resources[`custom.${key}`] = resource.name);
    return resources;
  }

  _onChangeString(path, value, dataset) {
    if (path.includes(".key")) {
      const labelPath = path.replace(".key", ".label");
      let label = '';
      if (value.includes("custom.")) {
        label = getValueFromPath(this.actor, `system.resources.${value}.name`);
      }
      else {
        label = game.i18n.localize(`dc20rpg.resource.${value}`);
      }
      setValueForPath(this, labelPath, label);
    }
    super._onChangeString(path, value, dataset);
  }

  _onChangeNumeric(path, value, nullable, dataset) {
    const limit = parseInt(dataset.limit);
    value = parseInt(value);
    if (value > limit) value = limit;
    super._onChangeNumeric(path, value, nullable, dataset);
  }

  async _onSave(event, target) {
    event.preventDefault();
    await this.actor.update({["system.tokenHotbar"]: this.data});
    await game.settings.set("dc20rpg", "tokenHotbarSettings", this.settings);
    ui.hotbar.render();
    this.close();
  }
}

/**
 * Opens Transfer Dialog popup.
 */
export function openTokenHotbarConfig(actor, options={}) {
  new TokenHotbarConfig(actor, options).render(true);
}