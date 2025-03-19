import { validateUserOwnership } from "../helpers/compendiumPacks.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class CompendiumBrowser extends Dialog {

  constructor(itemType, lockItemType, parentWindow, preSelectedFilters, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedItems = [];
    this.collectedItemCache = {};
    this.selectedIndex = -1;
    this.lockItemType = lockItemType;
    this.parentWindow = parentWindow;
    this.filters = this._prepareFilters(preSelectedFilters);
    
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
      template: "systems/dc20rpg/templates/dialogs/compendium-browser.hbs",
      classes: ["dc20rpg", "dialog"],
      dragDrop: [
        {dragSelector: ".item-row[data-uuid]", dropSelector: null},
      ],
      width: 820,
      height: 640
    });
  }

  _prepareFilters(preSelectedFilters) {
    let parsedFilters = {};
    if (preSelectedFilters) {
      try {
        parsedFilters = JSON.parse(preSelectedFilters);
      } catch (e) {
        console.warn(`Cannot parse pre selected filters '${preSelectedFilters}' with error: ${e}`)
      }
    }

    return {
      name: this._filter("text"),
      compendium: this._filter("multi-select", {
        system: true,
        world: true,
        module: true
      }),
      feature: {
        featureOrigin: this._filter("text", parsedFilters["featureOrigin"]),
        featureType: this._filter("select", parsedFilters["featureType"], CONFIG.DC20RPG.DROPDOWN_DATA.featureSourceTypes)
      },
      technique: {
        techniqueOrigin: this._filter("text", parsedFilters["techniqueOrigin"]),
        techniqueType: this._filter("select", parsedFilters["techniqueType"], CONFIG.DC20RPG.DROPDOWN_DATA.techniqueTypes)
      },
      spell: {
        spellOrigin: this._filter("text", parsedFilters["spellOrigin"]),
        spellType: this._filter("select", parsedFilters["spellType"], CONFIG.DC20RPG.DROPDOWN_DATA.spellTypes),
        magicSchool: this._filter("select", parsedFilters["magicSchool"], CONFIG.DC20RPG.DROPDOWN_DATA.magicSchools),
        spellLists: this._filter("multi-select", parsedFilters["spellLists"] || {
          arcane: true,
          divine: true,
          primal: true
        }, "spellLists") 
      },
      weapon: {
        weaponType: this._filter("select", parsedFilters["weaponType"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes),
        weaponStyle: this._filter("select", parsedFilters["weaponStyle"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles),

      },
      equipment: {
        equipmentType: this._filter("select", parsedFilters["equipmentType"], CONFIG.DC20RPG.DROPDOWN_DATA.equipmentTypes)
      },
      consumables: {
        consumableType: this._filter("select", parsedFilters["consumableType"], CONFIG.DC20RPG.DROPDOWN_DATA.techniqueTypes)
      }
    }
  }

  _filter(filterType, defaultValue, options) {
    return {
      filterType: filterType,
      value: defaultValue || "",
      options: options
    }
  }

  async getData() {
    const filteredItems = this._getFilteredItems();
    // Prepare Selected item
    let selectedItem = null;
    if (filteredItems.length > 0) {
      selectedItem = filteredItems[this.selectedIndex];
      if (selectedItem) {
        selectedItem.descriptionHTML = await TextEditor.enrichHTML(selectedItem.system.description, {secrets:true});
      } 
    }
    this.selectedItem = selectedItem;

    // Collect Filters
    const basicFilters = {
      name: this.filters.name,
      compendium: this.filters.compendium
    }
    const itemSpecificFilters = this.filters[this.currentItemType];
    
    return {
      itemType: this.currentItemType,
      collectedItems: filteredItems,
      selectedItem: selectedItem,
      collectingData: this.collectingData,
      lockItemType: this.lockItemType,
      allItemTypes: this.allItemTypes,
      basicFilters: basicFilters,
      itemSpecificFilters: itemSpecificFilters
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
      this.collectingData = false;
      this.render(true);
    }
    
    const hideItems = game.dc20rpg.compendiumBrowser.hideItems;
    // Finally we need to collect all items of given type from packs
    const collectedItems = [];
    for (const pack of game.packs) {
      if (!validateUserOwnership(pack)) continue;

      if (pack.documentName === "Item") {
        if (pack.isOwner) continue;
        const items = await pack.getDocuments();
        for(const item of items) {
          if (item.type === itemType) {
            const packageType = pack.metadata.packageType;
            // If system item is overriden by some other module we want to hide it from browser
            if (packageType === "system" && hideItems.has(item.id)) continue;

            // For DC20 Players Handbook module we want to keep it as a system instead of module pack
            const isDC20Handbook = pack.metadata.packageName === "dc20-core-rulebook";
            item.fromPack = isDC20Handbook ? "system" : packageType;
            collectedItems.push(item);
          }
        }
      }
    }
    this._sort(collectedItems);
    this.collectedItems = collectedItems;
    this.collectedItemCache[itemType] = collectedItems;
    
    this.collectingData = false;
    this.render(true);
  }

  _sort(array) {
    array.sort(function(a, b) {
      const textA = a.name.toUpperCase();
      const textB = b.name.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  _getFilteredItems() {
    const filters = this.filters;
    return this.collectedItems
                  .filter(item => item.name.toLowerCase().includes(filters.name.value.toLowerCase()))
                  .filter(item => filters.compendium.value[item.fromPack])
                  .filter(item => this._checkItemTypeSpecificFilters(item))
                  // We want to hide some items as those are used only by the system and user should have access to them
                  .filter(item => !item.system.hideFromCompendiumBrowser) 
  }

  _checkItemTypeSpecificFilters(item) {
    const specificFilters = this.filters[item.type];
    if (!specificFilters) return true; // Nothing to filter out

    let filtersFulfilled = true;
    const itemData = item.system;
    for (const [key, filter] of Object.entries(specificFilters)) {
      // If any filter is not fulfilled we just skip checking next
      if (filtersFulfilled === false) return filtersFulfilled; 

      if (filter.value === "") continue; // This is always true

      const itemValue = itemData[key];
      switch (filter.filterType) {
        case "text": 
          filtersFulfilled = itemValue.toLowerCase().includes(filter.value.toLowerCase());
          break;

        case "select": 
          filtersFulfilled = itemValue === filter.value;
          break;

        case "multi-select": 
          let anyOptionTrue = false;
          for(const [optKey, option] of Object.entries(filter.value)) {
            if (option && itemValue[optKey]?.active) {
              anyOptionTrue = true;
            }
          }
          filtersFulfilled = anyOptionTrue;
          break;
      }
    }
    return filtersFulfilled;
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

export function createCompendiumBrowser(itemType, lockItemType, parentWindow, preSelectedFilters) {
  const dialog = new CompendiumBrowser(itemType, lockItemType, parentWindow, preSelectedFilters, {title: `Compendium Browser`});
  dialog.render(true);
}