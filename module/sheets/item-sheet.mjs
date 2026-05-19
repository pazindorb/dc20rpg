import { prepareActiveEffectsForItem } from "../helpers/effects.mjs";
import { duplicateItemData, prepareContainer, prepareItemData, preprareSheetData } from "./item-sheet/item-sheet-data.mjs";
import { generateKey } from "../helpers/utils.mjs";
import DC20RpgActiveEffect from "../documents/activeEffect.mjs";
import { tooltipElement, tooltipListeners } from "../helpers/tooltip.mjs";
import { actions } from "./item-sheet/item-sheet-actions.mjs";
import { getForItemType } from "./item-sheet/item-sheet-helper.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20ItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  editableDescription = false;

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    position: {
      width: 500,
      height: 600
    },
    classes: ["dc20rpg themed item-v13"],
  }

  /** @override */
  static PARTS = {
    header: {template: "systems/dc20rpg/templates/sheets/item/header.hbs"},
    core: {template: "systems/dc20rpg/templates/sheets/item/core.hbs", scrollable: [""]},
    config: {template: "systems/dc20rpg/templates/sheets/item/config.hbs", scrollable: [""]},
    roll: {template: "systems/dc20rpg/templates/sheets/item/roll.hbs", scrollable: [""]},
    usage: {template: "systems/dc20rpg/templates/sheets/item/usage.hbs", scrollable: [""]},
    magic: {template: "systems/dc20rpg/templates/sheets/item/magic.hbs", scrollable: [""]},
    area: {template: "systems/dc20rpg/templates/sheets/item/area.hbs", scrollable: [""]},
    enhancements: {template: "systems/dc20rpg/templates/sheets/item/enhancements.hbs", scrollable: [""]},
    targetModifiers: {template: "systems/dc20rpg/templates/sheets/item/targetModifiers.hbs", scrollable: [""]},
    effects: {template: "systems/dc20rpg/templates/sheets/item/effects.hbs", scrollable: [""]},
    advanced: {template: "systems/dc20rpg/templates/sheets/item/advanced.hbs", scrollable: [""]},
    classTable: {template: "systems/dc20rpg/templates/sheets/item/classTable.hbs", scrollable: [""]},
    advancement: {template: "systems/dc20rpg/templates/sheets/item/advancement.hbs", scrollable: [""]},
    contents: {template: "systems/dc20rpg/templates/sheets/item/contents.hbs", scrollable: [""]},
    infusion: {template: "systems/dc20rpg/templates/sheets/item/infusion.hbs", scrollable: [""]}
  };

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        {id: "core", icon: "fa-solid fa-list-ul"},
        {id: "config", icon: "fa-solid fa-gear"},
        {id: "roll", icon: "fa-regular fa-dice-d20"},
        {id: "usage", icon: "fa-solid fa-coins"},
        {id: "area", icon: "fa-solid fa-bullseye"},
        {id: "enhancements", icon: "fa-solid fa-layer-plus"},
        {id: "targetModifiers", icon: "fa-regular fa-crosshairs-simple"},
        {id: "effects", icon: "fa-solid fa-person-rays"},
        {id: "magic", icon: "fa-solid fa-wand-magic-sparkles"},
        {id: "advanced", icon: "fa-solid fa-gears"},
        {id: "classTable", icon: "fa-regular fa-table"},
        {id: "advancement", icon: "fa-solid fa-star"},
        {id: "contents", icon: "fa-solid fa-sack"},
        {id: "infusion", icon: "fa-solid fa-wand-magic-sparkles"}
      ],
      initial: "core",
      labelPrefix: "ITEM.TABS",
    }
  };

  /** @override */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.resizable = true;
    initialized.window.icon = getForItemType(options.document.type, "icon");
    initialized.actions = foundry.utils.mergeObject(initialized.actions, actions);
    initialized.actions.editDescription = this._onEditDescription;
    return initialized;
  }

  // ==================== RENDER =====================
  /** @override */
  async _renderFrame(options) {
    const frame = await  super._renderFrame(options);
    frame.appendChild(tooltipElement());
    frame.appendChild(this.#navTabElement());
    return frame;
  }

  #navTabElement() {
    const tabs = this._prepareTabs("sheet")
    const nav = document.createElement("nav");

    nav.id = "item-sheet-nav";
    nav.classList.add("item-sheet-tabs");
    nav.classList.add("tabs");
    nav.setAttribute("data-group", "sheet");
    let innerHTML = ""
    for (const tab of Object.values(tabs)) {
      innerHTML += `
      <a class="tab-element ${tab.cssClass || ''}" data-action="tab" data-group="sheet" data-tab="${tab.id}" data-tooltip="${game.i18n.localize(tab.label)}">
        <i class="${tab.icon}"></i>
      </a>
      `
    }

    nav.innerHTML = innerHTML;
    return nav;
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    const allowed = new Set(getForItemType(this.item.type, "tabs"));
    return Object.fromEntries(Object.entries(parts).filter(([part]) => allowed.has(part)));
  }

  /** @override */
  changeTab(tab, group, options) {
    if (group !== "sheet") super.changeTab(tab, group, options);
    this.#changeTabCustom(tab, group, options);
  }

  #changeTabCustom(tab, group, {event, navElement, force=false, updatePosition=true}={}) {
    if ( !tab || !group ) throw new Error("You must pass both the tab and tab group identifier");
    if ( (this.tabGroups[group] === tab) && !force ) return;  // No change necessary
    const tabElement = this.element.querySelector(`.tabs [data-group="${group}"][data-tab="${tab}"]`);
    if ( !tabElement ) throw new Error(`No matching tab element found for group "${group}" and tab "${tab}"`);

    // Update tab navigation
    for ( const t of this.element.querySelectorAll(`.tabs [data-group="${group}"]`) ) {
      t.classList.toggle("active", t.dataset.tab === tab);
      if ( t instanceof HTMLButtonElement ) t.ariaPressed = `${t.dataset.tab === tab}`;
    }

    // Update tab contents
    for ( const section of this.element.querySelectorAll(`.tab[data-group="${group}"]`) ) {
      section.classList.toggle("active", section.dataset.tab === tab);
    }
    this.tabGroups[group] = tab;

    // Update automatic width or height
    if ( !updatePosition ) return;
    const positionUpdate = {};
    if ( this.options.position.width === "auto" ) positionUpdate.width = "auto";
    if ( this.options.position.height === "auto" ) positionUpdate.height = "auto";
    if ( !foundry.utils.isEmpty(positionUpdate) ) this.setPosition(positionUpdate);
  }

  /** @override */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (group !== "sheet") return tabs;

    const allowed = new Set(getForItemType(this.item.type, "tabs"));
    for (const tab of Object.keys(tabs)) {
      if (!allowed.has(tab)) delete tabs[tab];
    }

    return tabs;
  }

  // ==================== CONTEXT =====================
  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    duplicateItemData(context, this.item);
    prepareItemData(context, this.item);
    preprareSheetData(context, this.item);
    prepareActiveEffectsForItem(this.item, context);
    if (this.item.type === "container") prepareContainer(this.item, context);

    context.editableDescription = this.editableDescription;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    context.enriched = {};
    context.enriched.description = await TextEditor.enrichHTML(context.system.description, {
      secrets: this.item.isOwner,
      autoLink: true,
      relativeTo: this.item
    });
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector(".description-box prose-mirror")?.addEventListener("save", () => {
      this.editableDescription = false;
      this.render();
    });
  }

  _onEditDescription(event, target) {
    this.editableDescription = true;
    this.render();
  }

  // ==================== LISTENERS =====================
  _attachFrameListeners() {
    super._attachFrameListeners();
    // this.window.content.addEventListener("drop", this._onDrop.bind(this));
    this.window.content.addEventListener("mouseover", this._onHover.bind(this));
    this.window.content.addEventListener("mouseout", this._onHover.bind(this));
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

  _canDragDrop(selector) {
    if (this.item.type === "container") return true;
    else return super._canDragDrop(selector);
  }

  _canDragStart(selector) {
    if (this.item.type === "container") return true;
    else return super._canDragStart(selector);
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    const droppedObject = JSON.parse(droppedData);

    switch (droppedObject.type) {
      case "Item":
        await this._onDropItem(droppedObject);
        break;

      case "ActiveEffect": 
        await this._onDropEffect(droppedObject);
        break;

      case "Resource": 
        await this._onDropResource(droppedObject);
        break;
    }
  }

  async _onDropItem(droppedObject) {
    const item = await Item.fromDropData(droppedObject);

    if (item.type === "infusion" && this.item.infusions) {
      return await this.item.infusions.apply(item);
    }

    // Handle container
    if (this.item.type === "container") {
      const originalItem = await fromUuid(droppedObject.uuid);
      let canAddToContainer = true
      const inventoryOnly = this.item.system.inventoryOnly;
      const isFromInventory = CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes[item.type];
      if (inventoryOnly && !isFromInventory) canAddToContainer = false;
      if (canAddToContainer) {
        await this.item.update({[`system.contents.${generateKey()}`]: item.toObject()});
        if (originalItem.actor) await originalItem.delete({transfer: true});
      }
    }

    // Handle custom resource
    const itemResource = item.system.resource;
    if (itemResource) {
      const customResource = {
        label: itemResource.name,
        img: item.img,
        key: itemResource.resourceKey
      };
      if (item.system.isResource) this._onDropResource(customResource);
    }
  }

  async _onDropResource(droppedObject) {
    this._addCustomResource(droppedObject, droppedObject.key);
  }

  async _onDropEffect(droppedObject) {
    const effect = await ActiveEffect.fromDropData(droppedObject);
    DC20RpgActiveEffect.gmCreate(effect, {parent: this.item, ignoreResponse: true});
  }

  _onHover(event) {
    const target = this._getHoverTarget(event.target);
    const dataset = target.dataset;
    const hover = dataset.hover;
    const isEntering = event.type === "mouseover";

    const data = {dataset: dataset};
    if (dataset.itemId) {
      if (this.item?.id === dataset.itemId) {
        data.item = this.item;
      }
      else {
        data.item = this.actor.items.get(dataset.itemId);
      }
    }

    switch (hover) {
      case "tooltip": tooltipListeners(event, dataset.tooltipType, isEntering, data, $(this.element)); break;
    }
  }

  _getHoverTarget(element) {
    if (element.className === "window-content" || !element.parentElement) return element;
    if (element.dataset.hover) return element;
    return this._getHoverTarget(element.parentElement);
  }

  _addCustomResource(customResource, key) {
    if (!this.item.system.costs.resources.custom) return;
    customResource.value = null;

    // Enhancements 
    const enhancements = this.item.system.enhancements;
    if (enhancements) {
      Object.keys(enhancements).forEach(enhKey=> enhancements[enhKey].resources.custom[key] = customResource); 
    }

    const updateData = {
      system: {
        [`costs.resources.custom.${key}`]: customResource,
        enhancements: enhancements
      }
    }
    this.item.update(updateData);
  }
}
