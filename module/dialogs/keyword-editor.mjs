import { activateDefaultListeners, datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

// TODO - fix and move to appv2
class KeywordEditor extends DC20Dialog {

  constructor(actor, options) {
    super(options);
    this.actor = actor;
    this.newKeyword = {
      key: "",
      message: "",
      selectOptions: "",
      updateItems: {}
    }
    this.newItem = "";
    this.keywords = foundry.utils.deepClone(this.actor.system.keywords);
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/keyword-editor-dialog.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Keyword Editor";
    initialized.window.icon = "fa-solid fa-at";
    initialized.position.width = 560;
    initialized.actions.addKeyword = this._onAddKeyword;
    initialized.actions.removeKeyword = this._onRemoveKeyword;
    initialized.actions.addItem = this._onAddItem;
    initialized.actions.removeItem = this._onRemoveItem;
    initialized.actions.save = this._onSave;
    return initialized;
  }
  // ====================== INIT ======================

  // ==================== CONTEXT =====================
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.keywords = this.keywords;
    context.newKeyword = this.newKeyword;
    context.newItem = this.newItem;
    return context;
  }
  // ==================== CONTEXT =====================

  // ==================== ACTIONS =====================

  // ==================== ACTIONS =====================
  /** @override */
  async _onChangeString(path, value, dataset) {
    if (path === "add-item") this._onAddItem(dataset.keyword, value);
    else await super._onChangeString(path, value, dataset);
  }
  
  _onAddKeyword(event, target) {
    event.preventDefault();
    this.keywords[this.newKeyword.key] = this.newKeyword;
    this.newKeyword = {key: "", message: "", selectOptions: "", updateItems: {}}
    this.render();
  }

  _onRemoveKeyword(event, target) {
    const keyword = target.dataset.keyword;
    delete this.keywords[keyword];
    this.render();
  }

  _onAddItem(keyword, value) {
    let item = this.actor.items.get(value);
    if (!item) item = this.actor.items.getName(value);
    if (item) this.keywords[keyword].updateItems[item.id] = item.name;
    this.render();
  }

  _onRemoveItem(event, target) {
    const d = target.dataset;
    delete this.keywords[d.keyword].updateItems[d.itemId];
    this.render();
  }

  async _onSave(ev) {
    ev.preventDefault();
    this.close();

    const current = this.actor.system.keywords;
    const currentKeywords = new Set(Object.keys(this.actor.system.keywords));
    const newKeywords = new Set(Object.keys(this.keywords));

    const toRemove = currentKeywords.difference(newKeywords);
    const toAdd = newKeywords.difference(currentKeywords);
    const toUpdate = currentKeywords.intersection(newKeywords);

    toRemove.forEach(key => this.actor.update({[`system.keywords.-=${key}`]: null}))
    toAdd.forEach(key => this.actor.update({[`system.keywords.${key}`]: this.keywords[key]}))
    toUpdate.forEach(key => {
      const currentItems = new Set(Object.keys(current[key].updateItems));
      const newItems = new Set(Object.keys(this.keywords[key].updateItems));
      const toAdd = newItems.difference(currentItems);
      const toRemove = currentItems.difference(newItems);
      const newKeyword = this.keywords[key];
      const updateData = {
        [`system.keywords.${key}.message`]: newKeyword.message,
        [`system.keywords.${key}.selectOptions`]: newKeyword.selectOptions,
      }
      toAdd.forEach(itemId => {
        updateData[`system.keywords.${key}.updateItems.${itemId}`] = newKeyword.updateItems[itemId]
        const item = this.actor.items.get(itemId);
        if (item) item.update({[`system.keyword.key`]: key});
      });
      toRemove.forEach(itemId => {
        updateData[`system.keywords.${key}.updateItems.-=${itemId}`] = null
        const item = this.actor.items.get(itemId);
        if (item) item.update({[`system.keyword.key`]: ""});
      });
      this.actor.update(updateData); 
    });
  }
}

export function keywordEditor(actor) {
  new KeywordEditor(actor).render(true);
}