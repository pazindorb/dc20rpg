import { prepareActiveEffects } from "../helpers/effects.mjs";
import { activateCommonLinsters } from "./item-sheet/is-listeners.mjs";
import { duplicateItemData, prepareItemData, preprareSheetData } from "./item-sheet/is-data.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20RpgItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".item-sheet-body", initial: "description" }, 
        { navSelector: ".roll-tabs", contentSelector: ".roll-content", initial: "details" } 
      ]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/item_v2/${this.item.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = await super.getData();
    duplicateItemData(context, this.item);
    prepareItemData(context, this.item);
    preprareSheetData(context, this.item);
    prepareActiveEffects(this.item, context);

    // Enrich text editors
    context.enriched = {};
    context.enriched.description = await TextEditor.enrichHTML(context.system.description);

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateCommonLinsters(html, this.item);
  }
}