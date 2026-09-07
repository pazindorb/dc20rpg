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
    context.allowAddingSpells = this.allowAddingSpells;
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

  async _onRemoveSpell(event, target) {
    const spellKey = target.dataset.spellKey;
    await this.item.spellstore.removeSpell(spellKey);
    this.render();
  }

  async _onDrop(event) {
    if (!this.allowAddingSpells) return;
    const dropped = await super._onDrop(event);
    if (dropped.type !== "Item") return;
    const spell = await fromUuid(dropped.uuid);
    if (spell?.type !== "spell") return;

    await this.item.spellstore.storeSpell(spell);
    this.render();
  }

  async _getTooltipObject(dataset, event) {
    const itemData = this.item.system.spellstore[dataset.spellKey];
    return new Item(itemData);
  }
}