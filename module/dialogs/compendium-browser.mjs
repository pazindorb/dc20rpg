import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class CompendiumBrowser extends Dialog {

  constructor(itemType, lockItemType, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedItems = [];
    this.collectedItemCache = {};
    this.selectedIndex = -1;
    this.lockItemType = lockItemType;
    this.filters = this._prepareFilters();
    
    if (itemType === "inventory") {
      this.allItemTypes = DC20RPG.inventoryTypes;
      itemType = "weapon";
    }
    else {
      this.allItemTypes = DC20RPG.allItemTypes;
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
      width: 850,
      height: 640
    });
  }

  _prepareFilters() {
    return {
      name: this._filter("text"),
      compendium: this._filter("multi-select", {
        system: true,
        world: true,
        module: true
      }),
      feature: {
        featureOrigin: this._filter("text"),
        featureType: this._filter("select", "", DC20RPG.featureSourceTypes)
      },
      technique: {
        techniqueOrigin: this._filter("text"),
        techniqueType: this._filter("select", "", DC20RPG.techniqueTypes)
      },
      spell: {
        spellOrigin: this._filter("text"),
        spellType: this._filter("select", "", DC20RPG.spellTypes),
        magicSchool: this._filter("select", "", DC20RPG.magicSchools),
        spellLists: this._filter("multi-select", {
          arcane: true,
          divine: true,
          primal: true
        }, "spellLists") 
      },
      weapon: {
        weaponType: this._filter("select", "", DC20RPG.weaponTypes),
        weaponStyle: this._filter("select", "", DC20RPG.weaponStyleOnly)
      },
      equipment: {
        equipmentType: this._filter("select", "", DC20RPG.equipmentTypes)
      },
      consumables: {
        consumableType: this._filter("select", "", DC20RPG.techniqueTypes)
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
    
    const userRole = CONST.USER_ROLE_NAMES[game.user.role];
    // Finally we need to collect all items of given type from packs
    const collectedItems = [];
    for (const pack of game.packs) {
      const packOwnership = pack.ownership[userRole];
      if (packOwnership === "NONE") continue;

      if (pack.documentName === "Item") {
        if (pack.isOwner) continue;
        const items = await pack.getDocuments();
        for(const item of items) {
          if (item.type === itemType) {
            item.fromPack = pack.metadata.packageType;
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

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
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
}

export function createCompendiumBrowser(itemType, lockItemType) {
  const dialog = new CompendiumBrowser(itemType, lockItemType, {title: `Compendium Browser`});
  dialog.render(true);
}