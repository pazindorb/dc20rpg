import { DC20Dialog } from "./dc20Dialog.mjs";

export class RollSelect extends DC20Dialog {

  static open(actor, options={}) {
    new RollSelect(actor, options).render(true);
  }

  constructor(actor, options = {}) {
    super(options);

    this.actor = actor;
    const actorOptions = actor.getRollOptions();
    delete actorOptions.save.prime;

    const selectOptions = {};
    if (options.basic) selectOptions.basic = actorOptions.basic;
    if (options.attribute) selectOptions.attribute = actorOptions.attribute;
    if (options.save) selectOptions.save = actorOptions.save;
    if (options.skill) selectOptions.skill = actorOptions.skill;
    if (options.trade && actorOptions.trade) selectOptions.trade = actorOptions.trade;
    this.selectOptions = selectOptions;
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/roll-select-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Select Roll";
    initialized.window.icon = "fa-light fa-dice-d20";
    initialized.position.width = 600;

    initialized.actions.confirmRoll = this._onConfirmRoll;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.selectOptions = this.selectOptions;
    context.showBasic = this.selectOptions?.basic || this.selectOptions?.attribute || this.selectOptions?.save;
    context.showSkill = this.selectOptions?.skill || this.selectOptions?.trade;

    let grid = "1fr";
    if (context.showSkill && context.showBasic) grid += " 1fr";
    context.grid = grid;

    return context;
  }

  _onConfirmRoll(event, target) {
    event.preventDefault();
    const key = target.dataset.key;
    const type = target.dataset.type;
    if (key && type) this.actor.roll(key, type, {quickRoll: event.shiftKey});
    this.close();
  }
}