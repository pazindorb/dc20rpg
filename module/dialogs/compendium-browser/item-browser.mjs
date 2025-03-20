import { datasetOf, valueOf } from "../../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../../helpers/utils.mjs";
import { collectItemsForType, filterItems, getDefaultItemFilters } from "./browser-utils.mjs";

export class CompendiumBrowser extends Dialog {

  constructor(itemType, lockItemType, parentWindow, preSelectedFilters, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedItems = [];
    this.collectedItemCache = {};
    this.selectedIndex = -1;
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
      template: "systems/dc20rpg/templates/dialogs/compendium-browser-standalone.hbs",
      classes: ["dc20rpg", "dialog"],
      dragDrop: [
        {dragSelector: ".item-row[data-uuid]", dropSelector: null},
      ],
      width: 820,
      height: 640
    });
  }

  async getData() {
    const itemSpecificFilters = this._getFilters();
    const filteredItems = filterItems(this.collectedItems, itemSpecificFilters);
    // Prepare Selected item
    let selectedItem = null;
    if (filteredItems.length > 0) {
      selectedItem = filteredItems[this.selectedIndex];
      if (selectedItem) {
        selectedItem.descriptionHTML = await TextEditor.enrichHTML(selectedItem.system.description, {secrets:true});
      } 
    }
    this.selectedItem = selectedItem;
    
    return {
      itemType: this.currentItemType,
      collectedItems: filteredItems,
      selectedItem: selectedItem,
      collectingData: this.collectingData,
      lockItemType: this.lockItemType,
      allItemTypes: this.allItemTypes,
      filters: itemSpecificFilters
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
      this.filters.compendium,
      ...Object.values(typeSpecific)
    ]
    return filters;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".select-type").change(ev => this._onSelectType(valueOf(ev)));
    html.find(".select-row").click(ev => this._onSelectRow(datasetOf(ev).index));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".activable").click(ev => this._onActivable(datasetOf(ev).path));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".show-item").click(() => {if (this.selectedItem) this.selectedItem.sheet.render(true)});
    html.find(".add-item").click(() => this._onAddItem())

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
  }

  _onSelectType(value) {
    this._collectItems(value);
    this.selectedIndex = -1;
    this.render(true);
  }

  _onSelectRow(index) {
    this.selectedIndex = index;
    this.render(true);
  }

  _onValueChange(path, value) {
    this.selectedIndex = -1;
    setValueForPath(this, path, value);
    this.render(true);
  }

  _onActivable(path) {
    this.selectedIndex = -1;
    let value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render(true);
 }

 _onAddItem() {
  const parentWindow = this.parentWindow;
  if (!parentWindow) return;

  const itemUuid = this.selectedItem?.uuid;
  if (!itemUuid) return;

  const dragData = {
    uuid: this.selectedItem.uuid,
    type: "Item"
  };
  const dragEvent = new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new DataTransfer()
  });
  dragEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  parentWindow._onDrop(dragEvent);

  this.selectedIndex = -1;
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
}

export function createItemBrowser(itemType, lockItemType, parentWindow, preSelectedFilters) {
  const dialog = new CompendiumBrowser(itemType, lockItemType, parentWindow, preSelectedFilters, {title: `Item Browser`});
  dialog.render(true);
}