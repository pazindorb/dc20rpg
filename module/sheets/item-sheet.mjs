import { DC20RPG } from "../helpers/config.mjs";
import * as items from "../helpers/items.mjs";
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
    const path = "systems/dc20rpg/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
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
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    if (["weapon", "equipment", "consumable", "feature", "technique", "spell"].includes(this.item.type)) {
      this._prepareActionInfo(context);
    }

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.activable').click(ev => changeActivableProperty(ev, this.item));

    html.find('.add-formula').click(ev => items.addFormula(ev, this.item));
    html.find('.remove-formula').click(ev => items.removeFormula(ev, this.item));

    if (!this.isEditable) return;
  }

  _prepareActionInfo(context) {
    const sheetData = {};
    sheetData.damageFormula = items.getFormulaHtmlForCategory("damage", this.item);
    sheetData.healingFormula = items.getFormulaHtmlForCategory("healing", this.item);
    sheetData.otherFormula = items.getFormulaHtmlForCategory("other", this.item);
    context.sheetData = sheetData;
  }
}
