import { removeKeyword, removeUpdateItemFromKeyword } from "../helpers/actors/keywords.mjs";
import { activateDefaultListeners, datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

class KeywordEditor extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.updateData = this._perpareUpdateData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"],
      height: 500,
      width: 400
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/dialogs/keyword-editor-dialog.hbs`;
  }

  getData() {
    return {
      keywords: this.updateData,
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    activateDefaultListeners(this, html);
    html.find(".add-keyword").change(ev => this._onKeyword(valueOf(ev), true));
    html.find(".remove-keyword").click(ev => this._onKeyword(datasetOf(ev).keyword, false));
    html.find(".add-item-id").change(ev => this._onItemId(valueOf(ev), datasetOf(ev).keyword, true))
    html.find(".remove-item-id").click(ev => this._onItemId(datasetOf(ev).itemId, this._extractKeyword(ev), false))
    html.find(".save").click((ev) => this._onSave(ev));
  }

  _perpareUpdateData() {
    const keywords = foundry.utils.deepClone(this.actor.system.keywords);
    return keywords;
  }

  _onKeyword(keyword, add) {
    if (add) {
      this.updateData[keyword] = {
        value: "",
        updateItems: []
      }
    }
    else {
      delete this.updateData[keyword];
    }
    this.render();
  }

  _onItemId(itemId, keyword, add) {
    this.updateData[keyword].updateItems.push(itemId);
    const updateItems = this.updateData[keyword]?.updateItems;
    if (!updateItems) return;

    const asSet = new Set(updateItems);
    if (add) asSet.add(itemId);
    else asSet.delete(itemId);

    this.updateData[keyword].updateItems = Array.from(asSet);
    this.render();
  }

  async _onSave(ev) {
    ev.preventDefault();
    this.close();

    const currentKeywords = this.actor.system.keywords;
    const newKeywords = this.updateData;
    const removedKeywords = Object.keys(currentKeywords).filter(keyword => newKeywords[keyword] === undefined);

    for (const [key, newKeyword] of Object.entries(newKeywords)) {
      // Update Keyword
      await this.actor.update({[`system.keywords.${key}`]: newKeyword});
      
      // Call update on items linked to keyword
      for (const itemId of newKeyword.updateItems) {
        const item = this.actor.items.get(itemId)
        if (item) runTemporaryItemMacro(item, "onKeywordUpdate", this.actor, {keyword: key, newValue: newKeyword.value});
      }
    }

    // Remove deleted keywords
    for (const removed of removedKeywords) {
      await removeKeyword(this.actor, removed);
    }
  }

  _extractKeyword(ev) {
    return ev.currentTarget.parentElement?.parentElement?.dataset?.keyword || "";
  }
}

export function keywordEditor(actor) {
  new KeywordEditor(actor, {title: `Keywords Editor: ${actor.name}`}).render(true);
}