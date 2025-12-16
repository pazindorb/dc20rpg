import { RollDialog } from "../roll/rollDialog.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

export class ActionSelect extends DC20Dialog {

  static open(actor, options={}) {
    new ActionSelect(actor, options).render(true);
  }

  constructor(actor, options = {}) {
    super(options);

    this.actor = actor;
    const selectOptions = {
      reaction: {},
      offensive: {},
      defensive: {},
      skillBased: {},
      utility: {}
    };
    actor.getAllItemsWithType(["basicAction"]).forEach(action => {
      if (["basic", "weaponStyles"].includes(action.system.category)) return;
      selectOptions[action.system.category][action.id] = action
    });
    this.selectOptions = selectOptions;
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/action-select-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Select Action";
    initialized.window.icon = "fa-light fa-dice-d6";
    initialized.position.width = 600;

    initialized.actions.confirmRoll = this._onConfirmRoll;
    initialized.actions.markFavorite = this._onFavorite;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.selectOptions = this.selectOptions;
    return context;
  }

  _onConfirmRoll(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    RollDialog.open(this.actor, item, {quickRoll: event.shiftKey});
    this.close();
  }

  async _onFavorite(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);
    const favorite = item.flags.dc20rpg.favorite;
    await item.update({["flags.dc20rpg.favorite"]: !favorite});
    this.render();
  }
}