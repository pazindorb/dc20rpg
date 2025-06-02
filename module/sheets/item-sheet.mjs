import { prepareActiveEffects } from "../helpers/effects.mjs";
import { activateCommonLinsters } from "./item-sheet/is-listeners.mjs";
import { duplicateItemData, prepareContainer, prepareItemData, preprareSheetData } from "./item-sheet/is-data.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20RpgItemSheet extends foundry.appv1.sheets.ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".item-sheet-body", initial: "description" }, 
        { navSelector: ".roll-tabs", contentSelector: ".roll-content", initial: "details" },
        { navSelector: ".advanced-tabs", contentSelector: ".advanced-content", initial: "adv-core"}
      ],
      dragDrop: [
        {dragSelector: ".effects-row[data-effect-id]", dropSelector: null},
        {dragSelector: ".item-list .item", dropSelector: null}
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
    if (this.item.type === "container") prepareContainer(this.item, context);

    // Enrich text editors
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    context.enriched = {};
    context.enriched.description = await TextEditor.enrichHTML(context.system.description, {secrets:true});

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateCommonLinsters(html, this.item);
  }

  _onDragStart(event) {
    // Create drag data
    let dragData;

    const dataset = event.currentTarget.dataset;
    if (dataset.effectId) {
      const effect = this.item.effects.get(dataset.effectId);
      dragData = effect.toDragData();
    }
    if (dataset.itemKey) {
      const item = this.item.system.contents[dataset.itemKey];
      if (!item) return

      dragData = item;
      dragData.fromContainer = true;
      dragData.containerUuid = this.item.uuid;
      dragData.itemKey = dataset.itemKey;
    }
    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }
}