import { DC20Dialog } from "./dc20Dialog.mjs";

export class SustainManager extends DC20Dialog {

  static open(actor) {
    new SustainManager(actor).render(true);
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/sustain-manager-dialog.hbs",
      scrollable: [".scrollable"]
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Spell Store";
    initialized.window.icon = "fa-solid fa-recycle";
    initialized.position.width = 400;

    initialized.actions.drop = this._onDropSustain;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.sustain = this.actor.system.sustain;
    return context;
  }

  async _onDropSustain(event, target) {
    event.preventDefault();
    await this.actor.dropSustain(target.dataset.key);
    this.render();
  }
}