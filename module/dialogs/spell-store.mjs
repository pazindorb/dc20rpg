import { tooltipListeners } from "../helpers/tooltip.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

export class SpellStore extends DC20Dialog {

  static open(item, castingOptions={}) {
    new SpellStore(item, castingOptions).render(true);
  }

  constructor(item, castingOptions, options = {}) {
    super(options);
    this.item = item;
    this.allowAddingSpells = !!castingOptions.allowAddingSpells;
    this.castingOptions = castingOptions;
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/spell-store-dialog.hbs",
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
    initialized.window.icon = "fa-solid fa-book-sparkles";
    initialized.position.width = 400;

    initialized.actions.castSpell = this._onCastSpell;
    initialized.actions.removeSpell = this._onRemoveSpell;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.spellstore = this.item.system.spellstore;
    context.allowAddingSpells = false; // TODO: Add it in the future
    return context;
  }

  _onCastSpell(event, target) {
    event.preventDefault();
    const spellKey = target.dataset.spellKey;
    if (spellKey) {
      this.item.spellstore.castSpell(spellKey, this.castingOptions);
      this.close();
    }
  }

  _onRemoveSpell(event, target) {
    const spellKey = target.dataset.spellKey;
    this.item.spellstore.removeSpell(spellKey);
  }

  // TODO: Add it in the future
  // _onDrop(event) {
  //   if (!this.allowAddingSpells) return;
  //   const dropped = super._onDrop(event);
    
  //   dropped
  // }

  _onHover(event) {
    const target = super._getHoverTarget(event.target);
    const dataset = target.dataset;
    if (!dataset.spellKey) super._onHover(event);

    const spell = this.item.system.spellstore[dataset.spellKey];
    if (!spell) return;

    const hover = dataset.hover;
    const isEntering = event.type === "mouseover";
    const data = {dataset: dataset};
    data.item = spell;

    if (hover === "tooltip") tooltipListeners(event, dataset.tooltipType, isEntering, data, $(this.element));
  }
}