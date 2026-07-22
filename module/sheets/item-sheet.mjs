import { prepareActiveEffectsForItem } from "../helpers/effects.mjs";
import { duplicateItemData, prepareContainer, prepareItemData, preprareSheetData } from "./item-sheet/item-sheet-data.mjs";
import { generateKey, getValueFromPath } from "../helpers/utils.mjs";
import DC20RpgActiveEffect from "../documents/activeEffect.mjs";
import { tooltipElement, tooltipListeners } from "../helpers/tooltip.mjs";
import { createCustomProperty, getForItemType, removeItemFromContainer, removeResourceFromItem, rollTemplateSelect } from "./item-sheet/item-sheet-helper.mjs";
import { createTemporaryMacro } from "../helpers/macros.mjs";
import { createEditorDialog } from "../dialogs/editor.mjs";
import { blueprintAdvancements, configureAdvancementDialog } from "../subsystems/character-progress/advancement/advancement-configuration.mjs";
import { createItemBrowser } from "../dialogs/compendium-browser/item-browser.mjs";
import { openItemCreator } from "../dialogs/item-creator.mjs";
import { SpellStore } from "../dialogs/spell-store.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20ItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  sheetFlags = {};

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    position: {
      width: 550,
      height: 600
    },
    classes: ["dc20rpg themed item-v13"],
  }

  /** @override */
  static PARTS = {
    header: {template: "systems/dc20rpg/templates/sheets/item/header.hbs"},
    core: {template: "systems/dc20rpg/templates/sheets/item/core.hbs"},
    config: {template: "systems/dc20rpg/templates/sheets/item/config.hbs", scrollable: [".scrollable"]},
    action: {template: "systems/dc20rpg/templates/sheets/item/action.hbs", scrollable: [".scrollable"]},
    usage: {template: "systems/dc20rpg/templates/sheets/item/usage.hbs", scrollable: [".scrollable"]},
    magic: {template: "systems/dc20rpg/templates/sheets/item/magic.hbs", scrollable: [".scrollable"]},
    area: {template: "systems/dc20rpg/templates/sheets/item/area.hbs", scrollable: [".scrollable"]},
    enhancements: {template: "systems/dc20rpg/templates/sheets/item/enhancements.hbs", scrollable: [".scrollable"]},
    targetModifiers: {template: "systems/dc20rpg/templates/sheets/item/targetModifiers.hbs", scrollable: [".scrollable"]},
    effects: {template: "systems/dc20rpg/templates/sheets/item/effects.hbs", scrollable: [".scrollable"]},
    csabConfig: {template: "systems/dc20rpg/templates/sheets/item/csabConfig.hbs", scrollable: [".scrollable"]},
    advanced: {template: "systems/dc20rpg/templates/sheets/item/advanced.hbs", scrollable: [".scrollable"]},
    classTable: {template: "systems/dc20rpg/templates/sheets/item/classTable.hbs", scrollable: [".scrollable"]},
    advancement: {template: "systems/dc20rpg/templates/sheets/item/advancement.hbs", scrollable: [".scrollable"]},
    contents: {template: "systems/dc20rpg/templates/sheets/item/contents.hbs", scrollable: [".scrollable"]},
    infusion: {template: "systems/dc20rpg/templates/sheets/item/infusion.hbs", scrollable: [".scrollable"]}
  };

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        {id: "contents", icon: "fa-solid fa-sack"},
        {id: "core", icon: "fa-solid fa-list-ul"},
        {id: "config", icon: "fa-solid fa-gear"},
        {id: "infusion", icon: "fa-solid fa-crystal-ball"},
        {id: "usage", icon: "fa-solid fa-coins"},
        {id: "action", icon: "fa-solid fa-dice-d6"},
        {id: "area", icon: "fa-solid fa-bullseye"},
        {id: "enhancements", icon: "fa-solid fa-layer-plus"},
        {id: "targetModifiers", icon: "fa-regular fa-crosshairs-simple"},
        {id: "effects", icon: "fa-solid fa-person-rays"},
        {id: "magic", icon: "fa-solid fa-wand-magic-sparkles"},
        {id: "advanced", icon: "fa-solid fa-gears"},
        {id: "csabConfig", icon: "fa-solid fa-gear"},
        {id: "classTable", icon: "fa-regular fa-table"},
        {id: "advancement", icon: "fa-solid fa-star"}
      ],
      initial: "core",
      labelPrefix: "ITEM.TABS",
    }
  };

  constructor(options = {}) {
    super(options);
    if (this.item.type === "container") this.tabGroups.sheet = "contents";
  }

  /** @override */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    const colorTheme = game.settings.get("core", "uiConfig").colorScheme.applications;
    initialized.classes.push(`theme-${colorTheme}`);
    initialized.window.resizable = true;
    initialized.window.icon = getForItemType(options.document.type, "icon");
    if (options.document.type === "class") initialized.position.width = 800;

    initialized.actions.sheetEdit = this._onEditSheetFlag;
    initialized.actions.multiSelectRemove = this._onMultiSelectRemove;
    initialized.actions.createSubdoc = this._onCreateSubdoc;
    initialized.actions.removeSubdoc = this._onRemoveSubdoc;
    initialized.actions.reorder = this._onReorder;
    initialized.actions.addRootedEffect = this._onAddRootedEffect;
    initialized.actions.editRootedEffect = this._onEditRootedEffect;
    initialized.actions.removeRootedEffect = this._onRemoveRootedEffect;
    initialized.actions.editRootedMacro = this._onRootedMacroEdit;
    initialized.actions.enhancementDescrption = this._onEditEnhancementDescription;
    initialized.actions.editEffect = this._onEditEffect;
    initialized.actions.updateEffect = this._onUpdateEffect;
    initialized.actions.editMacro = this._onEditMacro;
    initialized.actions.editAdvancement = this._onEditAdvancement;
    initialized.actions.addMagicProperty = this._onAddMagicProperty;
    initialized.actions.removeMagicProperty = this._onRemoveMagicProperty;
    initialized.actions.blueprintAdvancement = () => blueprintAdvancements(this.item);
    initialized.actions.openItemCreator = this._onOpenItemCreator;
    initialized.actions.openSpellStore = () => SpellStore.open(this.item, {allowAddingSpells: true});
    initialized.actions.addStandardProperty = this._onAddStandardProperty;
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

    context.sheetFlags = this.sheetFlags;
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
    this.element.querySelector('img[data-edit="img"]')?.addEventListener("click", this._onEditImage.bind(this));

    // Description
    this.element.querySelector(".description-box prose-mirror")?.addEventListener("save", () => {
      this.sheetFlags.editDescription = false;
      this.render();
    });

    // Drag and Drop
    new CONFIG.ux.DragDrop({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  // ==================== LISTENERS =====================
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.window.content.addEventListener("mouseover", this._onHover.bind(this));
    this.window.content.addEventListener("mouseout", this._onHover.bind(this));
    this.window.content.addEventListener("click", this._onClick.bind(this));
    this.window.content.addEventListener("mousedown", this._onMouseDown.bind(this));
    this.window.content.addEventListener("change", this._onChange.bind(this));
  }

  // ================== DRAG AND DROP ===================
  _onDragStart(event) {
    // Create drag data
    let dragData;

    const dataset = event.currentTarget.dataset;
    if (dataset.enhancementKey) {
      // Clear enhancement data
      const enhancement = foundry.utils.deepClone(this.item.system.enhancements[dataset.enhancementKey]);
      if (!enhancement) return;
      delete enhancement.key;
      delete enhancement.sourceActorId;
      delete enhancement.sourceItemId;
      delete enhancement.sourceName;
      delete enhancement.sourceImg;
      delete enhancement.active;
      delete enhancement.drmCheck;
      delete enhancement.toggleUp;
      delete enhancement.toggleDown;
      delete enhancement.clear;
      delete enhancement.delete;
      delete enhancement.order;
      dragData = {type: "Enhancement", enhancement: enhancement};
    }
    if (dataset.targetModifierKey) {
      const targetModifier = foundry.utils.deepClone(this.item.system.targetModifiers[dataset.targetModifierKey]);
      if (!targetModifier) return;
      dragData = {type: "TargetModifier", targetModifier: targetModifier};
    }
    if (dataset.areaKey) {
      const area = foundry.utils.deepClone(this.item.system.areas[dataset.areaKey]);
      if (!area) return;
      dragData = {type: "Area", area: area};
    }
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
    return true;
  }

  _canDragStart(selector) {
    return true;
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

      case "Enhancement":
        await this._onDropEnhancement(droppedObject);
        break;

      case "TargetModifier":
        await this._onDropTargetModifier(droppedObject);
        break;

      case "Area":
        await this._onDropArea(droppedObject);
        break;
    }
  }

  async _onDropEnhancement(droppedObject) {
    if (!this.item.system.enhancements) return;
    if (!droppedObject.enhancement) return;
    await this.item.createNewEnhancement(droppedObject.enhancement);
  }

  async _onDropTargetModifier(droppedObject) {
    if (!this.item.system.targetModifiers) return;
    if (!droppedObject.targetModifier) return;
    await this.item.createNewTargetModifier(droppedObject.targetModifier);
  }

  async _onDropArea(droppedObject) {
    if (!this.item.system.areas) return;
    if (!droppedObject.area) return;
    await this.item.createArea(droppedObject.area);
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
    this.#addCustomResource(droppedObject, droppedObject.key);
  }

  #addCustomResource(customResource, key) {
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

  async _onDropEffect(droppedObject) {
    const effect = await ActiveEffect.fromDropData(droppedObject);
    DC20RpgActiveEffect.gmCreate(effect, {parent: this.item, ignoreResponse: true});
  }

  // ================= LISTENER ACTIONS =================
  async _onMouseDown(event) {
    if (event.which !== 2) return;

    const target = this.#getTarget(event.target, "middleClick");
    const middleClick = target.dataset.middleClick;

    switch (middleClick) {
      case "editEffect": this._onEditEffect(event, target); break;
    }
  }

  async _onClick(event) {
    const target = this.#getTarget(event.target, "ctype");
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const value = dataset.value;
    const path = dataset.path;

    switch (cType) {
      case "activable": await this._onActivable(path); break;
    }
  }

  async _onActivable(path) {
    const value = getValueFromPath(this.item, path);
    await this.item.update({[path]: !value});
  }

  _onEditImage(event) {
    event.preventDefault();
    event.stopPropagation();
    new FilePicker({
      type: "image",
      displayMode: "tiles",
      current: this.item.img,
      callback: path => {
        if (path) this.item.update({img: path});
      }
    }).render();
  }

  async _onChange(event) {
    const target = this.#getTarget(event.target, "ctype");
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "multi-select": await this._onMultiSelectChange(path, value, target); break;
      case "roll-template": await rollTemplateSelect(value, this.item); break;
      case "select-class-id": 
        const className = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class[value];
        this.item.update({ ["system.forClass"]: { classSpecialId: value, name: className } });
        break;
      case "range-type": 
        this.item.update({["system.attack.rangeType"]: value, ["system.attack.closeQuarters"]: value === "ranged"});
        break;
    }
  }
  
  async _onMultiSelectChange(path, value, target) {
    if (!value) return;
    const index = target.options.selectedIndex;
    const label = target.options[index].text;
    const object = getValueFromPath(this.item, path);
    object[value] = label;
    await this.item.update({[path]: object});
    this.render();
  }

  async _onHover(event) {
    const target = this.#getTarget(event.target, "hover");
    const dataset = target.dataset || {};
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

    if (dataset.itemUuid && !data.item) {
      data.item = await fromUuid(dataset.itemUuid);
      if (!data.item) return;
    }

    if (dataset.effectId) {
      data.effect = this.item.effects.get(dataset.effectId);
    }

    // Handle tooltips for items stored in container
    if (this.item.type === "container" && dataset.tooltipType === "item") {
      const itemKey = dataset.itemKey;
      data.item = this.item.system.contents[itemKey];
    }

    switch (hover) {
      case "tooltip": tooltipListeners(event, dataset.tooltipType, isEntering, data, $(this.element)); break;
    }
  }

  #getTarget(element, targetKey) {
    if (element.className === "window-content" || !element.parentElement) return element;
    if (element.dataset.hasOwnProperty(targetKey)) return element;
    return this.#getTarget(element.parentElement, targetKey);
  }

  // ==================== ACTIONS ====================
  _onEditSheetFlag(event, target) {
    const key = target.dataset.key;
    const value = !!this.sheetFlags[key];
    this.sheetFlags[key] = !value;
    this.render();
  }

  async _onMultiSelectRemove(event, target) {
    await this.item.update({[`${target.dataset.path}.-=${target.dataset.key}`]: null});
    this.render();
  }

  async _onReorder(event, target) {
    event.preventDefault();
    const enhancements = this.item.system.enhancements;
    const current = enhancements[target.dataset.key];
    if (!current) return;

    const groupBy = target.dataset.groupBy;
    const currentGroup = groupBy ? current[groupBy] : undefined;
    const entries = Object.entries(enhancements)
      .filter(([, enhancement]) => !groupBy || enhancement?.[groupBy] === currentGroup)
      .sort(([, a], [, b]) => (a?.order ?? 99) - (b?.order ?? 99));
    const currentIndex = entries.findIndex(([key]) => key === target.dataset.key);
    const swapIndex = currentIndex + Number(target.dataset.direction);
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= entries.length) return;

    [entries[currentIndex], entries[swapIndex]] = [entries[swapIndex], entries[currentIndex]];
    const updateData = {};
    for (let index = 0; index < entries.length; index++) {
      updateData[`system.enhancements.${entries[index][0]}.order`] = index;
    }
    await this.item.update(updateData);
  }

  _onCreateSubdoc(event, target) {
    event.preventDefault();
    const type = target.dataset.type;

    switch(type) {
      case "area": this.item.createArea(); break;
      case "rollRequest": this.item.createRollRequest(); break;
      case "againstStatus": this.item.createAgainstStatus(); break;
      case "formula": this.item.createFormula(); break;
      case "enhancement": this.item.createNewEnhancement(); break;
      case "targetModifier": this.item.createNewTargetModifier(); break;
      case "itemMacro": this.item.createNewItemMacro(); break;
      case "startingEquipment": this._createStartingEquipment(); break;
      case "advancement": configureAdvancementDialog(this.item); break;
      case "property": createCustomProperty(this.item); break;
      case "effect": 
        const temporary = target.dataset.effectType === "temporary"
        DC20RpgActiveEffect.create(this.#effectCreationData(temporary), {parent: this.item}); break;
    }
  }

  _createStartingEquipment() {
    this.item.update({[`system.startingEquipment.${generateKey()}`]: {
      label: "Starting Equipment",
      weapon: false,
      ranged: false,
      spellFocus: false,
      armor: false,
      shield: false,
      itemData: {},
    }});
  }

  #effectCreationData(temporary=false, rooted=false) {
    const creationData = {
      name: this.item.name,
      img: this.item.img,
      origin: this.item.uuid,
      disabled: false,
      system: {
        addToChat: rooted,
        applyToTemplate: rooted,
      },
      transfer: false,
      flags: {dc20rpg: {}}
    } 

    if (temporary) creationData.duration = {rounds: 1};
    return creationData;
  }

  _onRemoveSubdoc(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    const key = target.dataset.key;

    switch(type) {
      case "area": this.item.removeArea(key); break;
      case "rollRequest": this.item.removeRollRequest(key); break;
      case "againstStatus": this.item.removeAgainstStatus(key); break;
      case "formula": this.item.removeFormula(key); break;
      case "enhancement": this.item.removeEnhancement(key); break;
      case "targetModifier": this.item.removeTargetModifier(key); break;
      case "itemMacro": this.item.removeItemMacro(key); break;
      case "itemContent": removeItemFromContainer(this.item, key); break;
      case "resource": removeResourceFromItem(this.item, key); break;
      case "property": this._onRemoveCustomProperty(key); break;
      case "advancement": this.item.update({[`system.advancements.-=${key}`]: null}); break;
      case "startingEquipment": 
        this.item.update({[`system.startingEquipment.-=${target.dataset.key}`]: null})
        break;
      case "effect": 
        const effect = this.item.effects.get(target.dataset.effectId);
        if (effect) effect.delete();
        break;
    }
  }

  async _onAddRootedEffect(event, target) {
    const key = target.dataset.key;
    const creationData = this.#effectCreationData(true, true);
    
    switch (target.dataset.type) {
      case "enhancement":
        const enhancements = this.item.system.enhancements;
        const enhancement = enhancements[key];
        if (!enhancement) return;
        creationData.name = enhancement.name || this.item.name;
        creationData.flags.dc20rpg.itemSavePath = `system.enhancements.${key}.modifications.addsEffect`;
        break;

      case "targetModifier":
        const targetModifiers = this.item.system.targetModifiers;
        const modifier = targetModifiers[key];
        if (!modifier) return;
        creationData.name = modifier.name || this.item.name;
        creationData.flags.dc20rpg.itemSavePath = `system.targetModifiers.${key}.effect`;
        break;

      case "area":
        const areas = this.item.system.areas;
        const area = areas[key];
        if (!area) return;
        creationData.name = this.item.name;
        creationData.flags.dc20rpg.itemSavePath = `system.areas.${key}.effect`;
        break;
    }

    const created = await DC20RpgActiveEffect.create(creationData, {parent: this.item});
    created.sheet.render(true);
  }

  async _onEditRootedEffect(event, target) {
    const key = target.dataset.key;

    let effectData = null;
    switch (target.dataset.type) {
      case "enhancement":
        const enhancements = this.item.system.enhancements;
        const enhancement = enhancements[key];
        if (!enhancement) return;
        effectData = enhancement.modifications.addsEffect;
        effectData.flags.dc20rpg.itemSavePath = `system.enhancements.${key}.modifications.addsEffect`;
        break;

      case "targetModifier":
        const targetModifiers = this.item.system.targetModifiers;
        const modifier = targetModifiers[key];
        if (!modifier) return;
        effectData = modifier.effect;
        effectData.flags.dc20rpg.itemSavePath = `system.targetModifiers.${key}.effect`;
        break;

      case "area":
        const areas = this.item.system.areas;
        const area = areas[key];
        if (!area) return;
        effectData = area.effect;
        effectData.flags.dc20rpg.itemSavePath = `system.areas.${key}.effect`;
        break;
    }

    if (!effectData) return;
    const created = await DC20RpgActiveEffect.create(effectData, {parent: this.item});
    created.sheet.render(true);
  }

  _onRemoveRootedEffect(event, target) {
    const key = target.dataset.key;
    switch (target.dataset.type) {
      case "enhancement":
        this.item.update({[`system.enhancements.${key}.modifications.addsEffect`]: null});
        break;

      case "targetModifier":
        this.item.update({[`system.targetModifiers.${key}.effect`]: null});
        break;

      case "area":
        this.item.update({[`system.areas.${key}.effect`]: null});
        break;
    }
  }

  async _onRootedMacroEdit(event, target) {
    const flags = {itemUuid: this.item.uuid}
    const key = target.dataset.key;
    const macroKey = target.dataset.macroKey;

    let command = null;
    switch (target.dataset.type) {
      case "enhancement":
        const enhancements = this.item.system.enhancements;
        const enhancement = enhancements[key];
        if (!enhancement) return;
        
        const macros = enhancement.modifications.macros || {};
        command = macros[macroKey] || "";
        flags.updatePath = `system.enhancements.${key}.modifications.macros.${macroKey}`;
        break;

      case "targetModifier":
        const targetModifiers = this.item.system.targetModifiers;
        const modifier = targetModifiers[key];
        if (!modifier) return;

        command = modifier.condition || "";
        flags.updatePath = `system.targetModifiers.${key}.condition`;
        break;

      case "area":
        const areas = this.item.system.areas;
        const area = areas[key];
        if (!area) return;

        command = area[macroKey] || "";
        flags.updatePath = `system.areas.${key}.${macroKey}`;
        break;
    }

    if (command === null) return;

    const macro = await createTemporaryMacro(command, this.item, flags);
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
  }

  _onEditEnhancementDescription(event, target) {
    createEditorDialog(this.item, target.dataset.path)
  }

  _onEditEffect(event, target) {
    const effect = this.item.effects.get(target.dataset.effectId);
    if (effect) effect.sheet.render(true);
  }

  _onUpdateEffect(event, target) {
    const effect = this.item.effects.get(target.dataset.effectId);
    if (!effect) return;

    const path = target.dataset.path;
    const value = getValueFromPath(effect, path);
    effect.update({[path]: !value});
  }

  _onEditMacro(event, target) {
    this.item.editItemMacro(target.dataset.key);
  }

  _onEditAdvancement(event, target) {
    configureAdvancementDialog(this.item, target.dataset.key);
  }

  _onAddMagicProperty(event, target) {
    createItemBrowser("infusion", true, this)
  }

  _onRemoveMagicProperty(event, target) {
    this.item.infusions.active[target.dataset.key].remove();
  }

  async _onOpenItemCreator(event, target) {
    const itemData = await openItemCreator(this.item.type, {blueprint: this.item.toObject()});
    if (itemData) await this.item.update(itemData);
  }

  async _onAddStandardProperty() {
    const selectOptions = {};
    Object.entries(CONFIG.DC20RPG.PROPERTIES).forEach(([key, value]) => selectOptions[key] = game.i18n.localize(value.label))
    const selected = await SimplePopup.select("Select Property you want to activate", selectOptions);
    if (selected) {
      await this.item.update({
        [`system.properties.${selected}.active`]: selected,
        [`system.properties.${selected}.forceDisplay`]: selected,
      });
    }
  }

  _onRemoveCustomProperty(key) {
    if (!this.item.properties) return;
    this.item.properties[key].remove();
  }

  close(options) {
    const actorSavePath = this.item.flags?.dc20rpg?.actorSavePath;
    if (actorSavePath && this.item.actor) {
      const itemData = this.item.toObject();
      delete itemData.flags.dc20rpg.actorSavePath;
      this.item.actor.update({[actorSavePath]: itemData});
      if (!this.item.deleting) this.item.delete({strict: false});
      this.item.deleting = true;
    }
    super.close(options);
  }
}
