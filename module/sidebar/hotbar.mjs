import { promptItemRoll } from "../dialogs/roll-prompt.mjs";
import { getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { getItemActionDetails, getItemUseCost } from "../helpers/items/itemDetails.mjs";
import { preprareSheetData } from "../sheets/item-sheet/is-data.mjs";

// MAX SLOTS IN ROW 12 (columns)
// MARK REACTIONS SOMEHOW

export default class DC20Hotbar extends Hotbar { 
  constructor(options = {}) {
    super(options);
    this.tokenHotbar = game.settings.get("dc20rpg", "tokenHotbar");
    this.tokenHotbarSize = game.settings.get("dc20rpg", "tokenHotbarSettings");
  }

  /** @override */
  static PARTS = {
    hotbar: {
      root: true,
      template: "systems/dc20rpg/templates/sidebar/hotbar.hbs"
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.actions.swap = this._onSwap;
    initialized.actions.roll =this._onRoll;
    return initialized;
  }

  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("dblclick", this._onDoubleClick.bind(this));
    this.element.addEventListener("mousedown", this._onMiddleClick.bind(this));
  }

  // ==================== CONTEXT =====================
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (this.tokenHotbar) await this._prepareTokenContext(context);
    else {this.actorId = ""};
    context.tokenHotbar = this.tokenHotbar;
    return context;
  }

  async _prepareTokenContext(context) {
    const tokens = getSelectedTokens();
    if (!tokens || tokens.length !== 1) return;

    const token = tokens[0];
    this.actor = token.actor;
    this.actorId = this.actor.id;

    context.sectionA = await this._prepareSectionSlots("sectionA");
    context.sectionB = await this._prepareSectionSlots("sectionB");
    context.sectionAWidth = this.tokenHotbarSize["sectionA"].columns;
    context.sectionBWidth = this.tokenHotbarSize["sectionB"].columns;
    context.actor = this.actor;
  }

  async _prepareSectionSlots(sectionKey) {
    const section = this.actor.system.tokenHotbar[sectionKey];
    const items = this.actor.items;

    const sc = this.tokenHotbarSize[sectionKey];
    const size = sc.rows * sc.columns;
    const slots = [];
    for (let i = 0; i < size; i++) {
      const itemId = section[i];
      const item = items.get(itemId);
      if (item) item.description = await this._prepareDescription(item);
      slots[i] = item || {}
    }
    return slots;
  }

  async _prepareDescription(item) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const useCost = getItemUseCost(item);
    const itemAction = getItemActionDetails(item);
    const data = {system: item.system};
    preprareSheetData(data, item);

    const cost = useCost ? `<p style='display:flex;'><b style='margin-right:3px; align-items: center;'>Cost:</b> ${useCost}</p>` : "";
    const action = itemAction ? `<p><b>Action:</b> ${itemAction}</p>` : "";
    const saves = data.sheetData.saves ? `<p><b>Save:</b> ${data.sheetData.saves}</p>` : "";
    const contest = data.sheetData.contests ? `<p><b>Contest:</b> ${data.sheetData.contests}</p>` : "";

    let formulas = "";
    formulas += data.sheetData.damageFormula ? `<li class='margin-top-5'>Damage: ${data.sheetData.damageFormula}</li>` : "";
    formulas += data.sheetData.healingFormula ? `<li class='margin-top-5'>Healing: ${data.sheetData.healingFormula}</li>` : "";
    formulas += data.sheetData.otherFormula ? `<li class='margin-top-5'>Other: ${data.sheetData.otherFormula}</li>` : "";
    if (formulas) formulas = `<p><b>Outcome:</b> ${formulas}</p>`;

    let middleColumn = `${cost} ${action} ${saves} ${contest} ${formulas}`;
    if (middleColumn.trim()) middleColumn = "<hr/>" + middleColumn;

    let descriptionColumn = item.system.description;
    if (descriptionColumn.trim()) {
      descriptionColumn = "<hr/>" + await TextEditor.enrichHTML(descriptionColumn, {secrets:true});
      descriptionColumn = descriptionColumn.replaceAll('"', "'");
    }

    return `
      <h4>${item.name}</h4>
      <div class='middle-section'>${middleColumn}</div>
      ${descriptionColumn}
    `
  }
  // ==================== CONTEXT =====================

  async _onRender(context, options) {
    if (context.tokenHotbar) {
      this.element.classList.add("token-hotbar");
    }
    await super._onRender(context, options);

    // Override drop behavior
    if (context.tokenHotbar) {
      new foundry.applications.ux.DragDrop.implementation({
        dragSelector: ".slot.full",
        dropSelector: ".slot",
        callbacks: {
          dragstart: this._onDragStart.bind(this),
          drop: this._onDropOnTokenHotbar.bind(this)
        }
      }).bind(this.element);
    }
  }
 

  // ==================== ACTIONS =====================
  _onSwap(event, target) {
    this.tokenHotbar = !this.tokenHotbar;
    game.settings.set("dc20rpg", "tokenHotbar", this.tokenHotbar);
    this.render();
  }

  _onRoll(event, target) {
    const dataset = event.target.dataset;
    const item = this._getItemFromSlot(dataset.index, dataset.section);
    if (!item) return;
    promptItemRoll(this.actor, item);
  }

  _onDoubleClick(event) {
    if (event.target.classList.contains("char-img")) {
      this.actor.sheet.render(true);
    }
  }

  _onMiddleClick(event) {
    if (event.target.classList.contains("item-slot") && event.button === 1) {
      event.preventDefault();
       const dataset = event.target.dataset;
      const item = this._getItemFromSlot(dataset.index, dataset.section);
      if (item) item.sheet.render(true);
    }
  }
  // ==================== ACTIONS =====================

  async _onDropOnTokenHotbar(event) {
    event.preventDefault();
    const dataset = event.target.dataset;
    const index = dataset.index;
    const section = dataset.section;
    if (!index || !section) return;

    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    const droppedObject = JSON.parse(droppedData);
    if (!droppedObject) return;

    switch (droppedObject.type) {
      case "Item": await this._onDropItem(droppedObject, index, section); break;
      case "Slot": await this._onDropSlot(droppedObject, index, section); break;
    }
  }

  async _onDropItem(dropped, index, section) {
    const itemId = dropped.uuid.replace(/^.*?Item\./, '');
    this.actor.update({[`system.tokenHotbar.${section}.${index}`]: itemId});
  }

  async _onDropSlot(dropped, index, section) {
    this.actor.update({[`system.tokenHotbar.${section}.${index}`]: dropped.itemId});
  }

  _onDragStart(event) {
    const dataset = event.target.dataset;
    const index = dataset.index;
    const sectionKey = dataset.section;
    const itemId = this._getItemIdFromSlot(index, sectionKey);
    if (!itemId) return;

    const dragData = {
      type: "Slot",
      itemId: itemId
    }

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    this.actor.update({[`system.tokenHotbar.${sectionKey}.-=${index}`]: null});
  }

  _getItemIdFromSlot(index, sectionKey) {
    if (!index || !sectionKey) return;
    const section = this.actor.system.tokenHotbar[sectionKey];
    const itemId = section[index];
    return itemId;
  }

  _getItemFromSlot(index, section) {
    const itemId = this._getItemIdFromSlot(index, section);
    if (!itemId) return;
    return this.actor.items.get(itemId);
  }
}

Hooks.on('controlToken', () => {if (ui.hotbar) ui.hotbar.render()});