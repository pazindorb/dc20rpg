import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { hideTooltip, itemTooltip } from "../../helpers/tooltip.mjs";
import { getValueFromPath, setValueForPath } from "../../helpers/utils.mjs";
import { collectItemsForType, filterDocuments, getDefaultItemFilters } from "./browser-utils.mjs";

export class CompendiumBrowser extends Dialog {

  constructor(itemType, lockItemType, parentWindow, preSelectedFilters, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedItems = [];
    this.collectedItemCache = {};
    this.lockItemType = lockItemType;
    this.parentWindow = parentWindow;
    this.filters = getDefaultItemFilters(preSelectedFilters);

    if (itemType === "inventory") {
      this.allItemTypes = CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes;
      itemType = "weapon";
    }
    else if (itemType === "advancement") {
      this.allItemTypes = {
        ...CONFIG.DC20RPG.DROPDOWN_DATA.featuresTypes,
        ...CONFIG.DC20RPG.DROPDOWN_DATA.spellsTypes,
        ...CONFIG.DC20RPG.DROPDOWN_DATA.techniquesTypes
      }
      itemType = "feature";
    }
    else {
      this.allItemTypes = CONFIG.DC20RPG.DROPDOWN_DATA.allItemTypes;
    }
    this._collectItems(itemType);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/compendium-browser/item-browser.hbs",
      classes: ["dc20rpg", "dialog"],
      dragDrop: [
        {dragSelector: ".item-row[data-uuid]", dropSelector: null},
      ],
      width: 850,
      height: 650,
      resizable: true,
      draggable: true,
    });
  }

  async getData() {
    const itemSpecificFilters = this._getFilters();
    const filteredItems = filterDocuments(this.collectedItems, itemSpecificFilters);
    
    return {
      itemType: this.currentItemType,
      collectedItems: filteredItems,
      collectingData: this.collectingData,
      lockItemType: this.lockItemType,
      allItemTypes: this.allItemTypes,
      filters: itemSpecificFilters,
      canAddItems: this.parentWindow !== undefined
    }
  }

  async _collectItems(itemType) {
    // We do not need to refresh if the same item type was selected
    if (this.currentItemType === itemType) return; 

    this.collectingData = true;
    this.currentItemType = itemType;
    
    // If we already collected that item type before we can get it from cache
    if (this.collectedItemCache[itemType]) {
      this.collectedItems = this.collectedItemCache[itemType];
    }
    // If there is nothing in the cache we need to collect those items
    else {
      this.collectedItems = await collectItemsForType(itemType);
      this.collectedItemCache[itemType] = this.collectedItems;
    }
    this.collectingData = false;
    this.render(true);
  }

  _getFilters() {
    const typeSpecific = this.filters[this.currentItemType] || {};
    const filters = [
      this.filters.name,
      ...Object.values(typeSpecific),
      this.filters.compendium,
      this.filters.sourceName,
    ]
    return filters;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".select-type").change(ev => this._onSelectType(valueOf(ev)));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".activable").click(ev => this._onActivable(datasetOf(ev).path));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".show-item").click(ev => this._onItemShow(ev));
    html.find(".add-item").click(ev => this._onAddItem(ev));

    html.find('.item-tooltip').hover(ev => {
      let position = null;
      const column = html.find(".filter-column");
      if (column[0]) {
        position = {
          width: column.width() - 10,
          height: column.height() - 10,
        };
      }
      const uuid = datasetOf(ev).uuid;
      const item = fromUuidSync(uuid);
      if (item) itemTooltip(item, ev, html, {position: position});
    },
    ev => hideTooltip(ev, html));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
  }

  _onSelectType(value) {
    this._collectItems(value);
    this.render(true);
  }

  _onValueChange(path, value) {
    setValueForPath(this, path, value);
    this.render(true);
  }

  _onActivable(path) {
    let value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render(true);
  }

  _onItemShow(ev) {
    const uuid = datasetOf(ev).uuid;
    const item = fromUuidSync(uuid);
    if (item) item.sheet.render(true);
  }

  _onAddItem(ev) {
    ev.stopPropagation();
    const uuid = datasetOf(ev).uuid;
    if (!uuid) return;

    const parentWindow = this.parentWindow;
    if (!parentWindow) return;

    const dragData = {
      uuid:  uuid,
      type: "Item"
    };
    const dragEvent = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer()
    });
    dragEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    parentWindow._onDrop(dragEvent);

    this.render(true);
  }

  async _render(...args) {
    const selector = this.element.find('.item-selector');
    let scrollPosition = 0;

    if (selector.length > 0) scrollPosition = selector[0].scrollTop;
    await super._render(...args);
    if (selector.length > 0) {
      this.element.find('.item-selector')[0].scrollTop = scrollPosition;
    }
  }

  _onDragStart(event) {
    const dataset = event.currentTarget.dataset;
    dataset.type = "Item";
    event.dataTransfer.setData("text/plain", JSON.stringify(dataset));
  }

  _canDragDrop(selector) {
    return true;
  }

  _canDragStart(selector) {
    return true;
  }

  setPosition(position) {
    super.setPosition(position);

    this.element.css({
      "min-height": "400px",
      "min-width": "600px",
    })
    this.element.find("#compendium-browser").css({
      height: this.element.height() -30,
    });
  }
}

let itemBrowserInstance = null;
export function createItemBrowser(itemType, lockItemType, parentWindow, preSelectedFilters) {
  if (itemBrowserInstance) itemBrowserInstance.close();
  const dialog = new CompendiumBrowser(itemType, lockItemType, parentWindow, preSelectedFilters, {title: `Item Browser`});
  dialog.render(true);
  itemBrowserInstance = dialog;
}