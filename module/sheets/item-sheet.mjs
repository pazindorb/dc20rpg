import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { addFormula, getFormulaHtmlForCategory, removeFormula } from "../helpers/items/itemRollFormulas.mjs";
import { updateScalingValues } from "../helpers/items/scalingItems.mjs";
import { changeActivableProperty } from "../helpers/utils.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20RpgItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".item-sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/item/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    context.config = DC20RPG;
    context.system = this.item.system;
    context.flags = this.item.flags;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    context.itemsWithChargesIds = {};
    context.consumableItemsIds = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
      const itemIds = actor.getOwnedItemsIds(this.item.id);
      context.itemsWithChargesIds = itemIds.withCharges;
      context.consumableItemsIds = itemIds.consumable;
    }

    if (["weapon", "equipment", "consumable", "feature", "technique", "spell"].includes(this.item.type)) {
      this._prepareActionInfo(context);
    }

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.activable').click(ev => changeActivableProperty(datasetOf(ev).path, this.item));

    html.find('.add-formula').click(ev => addFormula(datasetOf(ev).category, this.item));
    html.find('.remove-formula').click(ev => removeFormula(datasetOf(ev).key, this.item));

    html.find('.update-resources').change(ev => updateScalingValues(this.item, datasetOf(ev) , valueOf(ev), "resources"));
    html.find('.update-scaling').change(ev => updateScalingValues(this.item, datasetOf(ev), valueOf(ev), "scaling"));

    html.find('.selectOtherItem').change(ev => this._onSelection(ev, this.item))
    if (!this.isEditable) return;
  }

  _prepareActionInfo(context) {
    const sheetData = {};
    sheetData.damageFormula = getFormulaHtmlForCategory("damage", this.item);
    sheetData.healingFormula = getFormulaHtmlForCategory("healing", this.item);
    sheetData.otherFormula = getFormulaHtmlForCategory("other", this.item);
    context.sheetData = sheetData;
  }

  _onSelection(event, item) {
    event.preventDefault();
    const itemId = $(".selectOtherItem option:selected").val();
    const itemName = $(".selectOtherItem option:selected").text();

    item.update({[`system.costs.otherItem`]: {itemId: itemId, itemName: itemName}});
  }
}
