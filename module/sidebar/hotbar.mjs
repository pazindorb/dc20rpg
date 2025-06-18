import { promptItemRoll } from "../dialogs/roll-prompt.mjs";
import { regainBasicResource, subtractBasicResource } from "../helpers/actors/costManipulator.mjs";
import { getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { getItemActionDetails, getItemUseCost } from "../helpers/items/itemDetails.mjs";
import { getValueFromPath } from "../helpers/utils.mjs";
import { preprareSheetData } from "../sheets/item-sheet/is-data.mjs";
import { openTokenHotbarConfig } from "./token-hotbar-config.mjs";

// MAX SLOTS IN ROW 12 (columns)
// MARK REACTIONS SOMEHOW

export default class DC20Hotbar extends Hotbar { 
  constructor(options = {}) {
    super(options);
    this.tokenHotbar = game.settings.get("dc20rpg", "tokenHotbar");
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
    initialized.actions.roll = this._onRoll;
    initialized.actions.spendResource = this._spendResource;
    initialized.actions.regainResource = this._regainResource;
    initialized.actions.config = this._onConfigTokenHotbar;
    return initialized;
  }

  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("dblclick", this._onDoubleClick.bind(this));
    this.element.addEventListener("mousedown", this._onMiddleClick.bind(this));
    this.element.addEventListener("change", this._onChange.bind(this));
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
    context.actor = this.actor;

    const health = this.actor.system.resources.health;
    let hpPercent = Math.ceil(100 * health.current/health.max);
    if (isNaN(hpPercent)) hpPercent = 0;
    context.actor.system.resources.health.percent = Math.min(hpPercent, 100);
    let tempPercent = Math.ceil(100 * health.value/health.max);
    if (isNaN(tempPercent)) tempPercent = 0;
    context.actor.system.resources.health.percentTemp = Math.min(tempPercent, 100);

    context.sectionA = await this._prepareSectionSlots("sectionA");
    context.sectionB = await this._prepareSectionSlots("sectionB");
    const tokenHotbarSettings = game.settings.get("dc20rpg", "tokenHotbarSettings");
    context.sectionAWidth = tokenHotbarSettings["sectionA"].columns;
    context.sectionBWidth = tokenHotbarSettings["sectionB"].columns;

    context.resources = this._prepareResources() 
  }

  async _prepareSectionSlots(sectionKey) {
    const section = this.actor.system.tokenHotbar[sectionKey];
    const items = this.actor.items;

    const tokenHotbarSettings = game.settings.get("dc20rpg", "tokenHotbarSettings");
    const sc = tokenHotbarSettings[sectionKey];
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

    const reaction = item.system.isReaction ? `<i class='margin-left-3 margin-right-8 fa-solid fa-reply reaction'></i>` : "";
    const cost = useCost ? `<div class='cost-wrapper'>${reaction}${useCost}</div>` : "";
    const action = itemAction ? `<p><b>Action:</b> ${itemAction}</p>` : "";
    const saves = data.sheetData.saves ? `<p><b>Save:</b> ${data.sheetData.saves}</p>` : "";
    const contest = data.sheetData.contests ? `<p><b>Contest:</b> ${data.sheetData.contests}</p>` : "";

    let formulas = "";
    formulas += data.sheetData.damageFormula ? `<li class='margin-top-5'>Damage: ${data.sheetData.damageFormula}</li>` : "";
    formulas += data.sheetData.healingFormula ? `<li class='margin-top-5'>Healing: ${data.sheetData.healingFormula}</li>` : "";
    formulas += data.sheetData.otherFormula ? `<li class='margin-top-5'>Other: ${data.sheetData.otherFormula}</li>` : "";
    if (formulas) formulas = `<p><b>Outcome:</b> ${formulas}</p>`;

    let middleColumn = `${action} ${saves} ${contest} ${formulas}`;
    if (middleColumn.trim()) middleColumn = "<hr/>" + middleColumn;

    let descriptionColumn = item.system.description;
    if (descriptionColumn.trim()) {
      descriptionColumn = "<hr/>" + await TextEditor.enrichHTML(descriptionColumn, {secrets:true});
      descriptionColumn = descriptionColumn.replaceAll('"', "'");
    }

    return `
      <div class='header-section'><h4>${item.name}</h4> ${cost}</div>
      <div class='middle-section'>${middleColumn}</div>
      ${descriptionColumn}
    `
  }

  _prepareResources() {
    const tokenHotbar = this.actor.system.tokenHotbar;
    if (tokenHotbar.resource1.key && tokenHotbar.resource2.key && tokenHotbar.resource3.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-left-short");
      content += this._resource(tokenHotbar.resource3, "resource-middle");
      content += this._resource(tokenHotbar.resource2, "resource-right-short");
      return content;
    }
    if (tokenHotbar.resource1.key && tokenHotbar.resource2.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-left");
      content += this._resource(tokenHotbar.resource2, "resource-right");
      return content;
    }
    if (tokenHotbar.resource1.key) {
      let content = "";
      content += this._resource(tokenHotbar.resource1, "resource-wide");
      return content;
    }
    return "";
  }

  _resource(resource, clazz) {
    const value = getValueFromPath(this.actor, `system.resources.${resource.key}.value`);

    return `
      <div class="${clazz}">
        <input data-cType="actor-numeric" data-path="system.resources.${resource.key}.value" type="number" value="${value}"
        data-dtype="Number" title="${resource.label}" style="background: linear-gradient(to bottom, ${resource.color}, #161616);">
      </div>
    `;
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

  async _spendResource(event, target) {
    const key = target.dataset.resource;
    if (!key) return;
    await subtractBasicResource(key, this.actor, 1, true);
    this.render();
  }

  async _regainResource(event, target) {
    const key = target.dataset.resource;
    if (!key) return;
    await regainBasicResource(key, this.actor, 1, true);
    this.render();
  }

  _onConfigTokenHotbar(event, target) {
    openTokenHotbarConfig(this.actor);
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

  async _onChange(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "actor-numeric": 
        await this.actor.update({[path]: value})
        break;
    }
    this.render();
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