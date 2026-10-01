import { prepareActiveEffects, prepareStatusContext } from "../helpers/effects.mjs";
import { activateCharacterLinsters, activateCommonLinsters, activateCompanionListeners, activateNpcLinsters, activateStorageListeners } from "./actor-sheet/listeners.mjs";
import { duplicateData, prepareCharacterData, prepareCommonData, prepareCompanionData, prepareNpcData, prepareStorageData } from "./actor-sheet/data.mjs";
import { onSortItem, prepareCompanionTraits, prepareItemsForCharacter, prepareItemsForNpc, prepareItemsForStorage, sortMapOfItems } from "./actor-sheet/items.mjs";
import { createTrait, handleStackableItem } from "../helpers/actors/itemsOnActor.mjs";
import { fillPdfFrom } from "../helpers/actors/pdfConverter.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { itemTransfer } from "../helpers/actors/storage.mjs";
import { DC20RpgItem } from "../documents/item.mjs";
import { getForActorType } from "./actor-sheet/actor-sheet-helper.mjs";
import { getValueFromPath } from "../helpers/utils.mjs";
import { ActionSelect } from "../dialogs/action-select.mjs";
import { RollSelect } from "../dialogs/roll-select.mjs";
import { createItemBrowser } from "../dialogs/compendium-browser/item-browser.mjs";
import DC20RpgActiveEffect from "../documents/activeEffect.mjs";

export class DC20RpgActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {

  /** @override */
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
    classes: ["dc20rpg themed actor-v13"],
  }

  /** @override */
  static PARTS = {
    header: {template: "systems/dc20rpg/templates/sheets/actor/header.hbs"},
    core: {template: "systems/dc20rpg/templates/sheets/actor/core.hbs", scrollable: [".scrollable"]},
    effects: {template: "systems/dc20rpg/templates/sheets/actor/effects.hbs", scrollable: [".scrollable"]},
    loot: {template: "systems/dc20rpg/templates/sheets/actor/loot.hbs", scrollable: [".scrollable"]},
    traits: {template: "systems/dc20rpg/templates/sheets/actor/traits.hbs", scrollable: [".scrollable"]},
    config: {template: "systems/dc20rpg/templates/sheets/actor/config.hbs", scrollable: [".scrollable"]},
    description: {template: "systems/dc20rpg/templates/sheets/actor/description.hbs", scrollable: [".scrollable"]},
  }

  /** @override */
  static TABS = {
    sheet: {
      tabs: [
        {id: "core", icon: "fa-solid fa-list-ul"},
        {id: "effects", icon: "fa-solid fa-person-rays"},
        {id: "loot", icon: "fa-solid fa-sack"},
        {id: "description", icon: "fa-solid fa-feather"},
        {id: "config", icon: "fa-solid fa-gear"},
      ],
      initial: "core",
      labelPrefix: "ACTOR.TABS",
    }
  };

  constructor(options = {}) {
    super(options);
    // if (this.actor.type === "character") this.tabGroups.sheet = "contents";
  }

  /** @override */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    const colorTheme = game.settings.get("core", "uiConfig").colorScheme.applications;
    initialized.classes.push(`theme-${colorTheme}`);
    initialized.window.resizable = true;
    initialized.window.icon = getForActorType(options.document.type, "icon");
    // if (options.document.type === "character") initialized.position.width = 800;

    initialized.actions.heldAction = () => this.actor.heldAction.trigger();
    initialized.actions.basicAction = () => ActionSelect.open(this.actor);
    initialized.actions.basicRoll = () => RollSelect.open(this.actor, {basic: true, save: true, attribute: true, skill: true, trade: this.actor.type === "character"});
    initialized.actions.help = this._onHelpAction;
    initialized.actions.spend = this._onSpendResource;
    initialized.actions.regain = this._onRegainResource;
    initialized.actions.roll = this._onRoll;
    initialized.actions.showImg = this._onShowImg;
    initialized.actions.createTable = this._onCreateTable;
    initialized.actions.deleteTable = this._onDeleteTable;
    initialized.actions.reorder = this._onReorderTable;
    initialized.actions.compendium = this._onCompendiumBrowser;
    initialized.actions.createItem = this._onItemCreate;

    initialized.actions.rollItem = this._onRollItem;
    initialized.actions.equip = this._onEquip;
    initialized.actions.toggle = this._onToggle;
    initialized.actions.macro = this._onMacro;
    initialized.actions.edit = this._onEdit;
    initialized.actions.delete = this._onDelete;
    initialized.actions.copy = this._onCopy;

    initialized.actions.effectToggle = this._onEffectToggle;
    initialized.actions.manualEffect = this._onManualTrigger;
    initialized.actions.createEffect = this._onEffectCreate;
    initialized.actions.toggleStatus = this._onStatusToggle;
    
    return initialized;
  }

  // ================= CONTEXT MENU ===================
  _getContextMenuOptions() { 
    return [
      {
        label: "dc20rpg.sheet.edit",
        icon: '<i class="fa-solid fa-pen-to-square"></i>',
        visible: target => this.#getObjectFrom(target.dataset, true),
        onClick: (event, target) => this._onEdit(event, target)
      },
      {
        label: "dc20rpg.sheet.copy",
        icon: '<i class="fa-solid fa-copy"></i>',
        visible: target => {
          const object = this.#getObjectFrom(target.dataset, true);
          return object instanceof Item;
        },
        onClick: (event, target) => this._onCopy(event, target)
      },
      {
        label: "dc20rpg.sheet.delete",
        icon: '<i class="fa-solid fa-trash"></i>',
        visible: target => this.#getObjectFrom(target.dataset, true),
        onClick: (event, target) => this._onDelete(event, target)
      }
    ];
  }

  // ================= CONTEXT MENU ===================

  // ==================== RENDER =====================
  /** @override */
  async _renderFrame(options) {
    const frame = await  super._renderFrame(options);
    frame.appendChild(PDE.TooltipCreator.getTooltipHtml());
    frame.appendChild(this.#navTabElement());
    return frame;
  }

  #navTabElement() {
    const tabs = this._prepareTabs("sheet")
    const nav = document.createElement("nav");

    nav.id = "actor-sheet-nav";
    nav.classList.add("actor-sheet-tabs");
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
    const allowed = new Set(getForActorType(this.actor.type, "tabs"));
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

    const allowed = new Set(getForActorType(this.actor.type, "tabs"));
    for (const tab of Object.keys(tabs)) {
      if (!allowed.has(tab)) delete tabs[tab];
    }

    return tabs;
  }


  // ==================== CONTEXT =====================
  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    duplicateData(context, this.actor);
    sortMapOfItems(context, this.actor.items);
    prepareCommonData(context);

    const actorType = this.actor.type;
    switch (actorType) {
      case "character": 
        prepareCharacterData(context);
        prepareItemsForCharacter(context, this.actor);
        break;
      case "npc": case "companion": 
        this.options.classes.push(actorType);
        // this.position.width = 672;
        // this.position.height = 700;
        prepareNpcData(context);
        prepareItemsForNpc(context, this.actor);
        if (actorType === "npc") {
          context.isNPC = true;
        }
        if (actorType === "companion") {
          prepareCompanionData(context);
          prepareCompanionTraits(context, this.actor);
          context.companionOwner = this.actor.companionOwner;
        }
        break;
      case "storage": 
        this.options.classes.push(actorType);
        this.position.width = 500;
        this.position.height = 600;
        prepareStorageData(context);
        prepareItemsForStorage(context, this.actor);
        break;
    } 
    prepareActiveEffects(this.actor, context);
    prepareStatusContext(this.actor, context);

    // Enrich text editors
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    context.enriched = {};
    context.enriched.journal = await TextEditor.enrichHTML(context.system.journal, {secrets:true, autoLink:true, lookupObject: this.actor});
    return context;
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._createContextMenu(this._getContextMenuOptions, ".context-menu", {fixed: true});
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector('img[data-edit="img"]')?.addEventListener("click", this._onEditImage.bind(this));

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
    this.window.content.addEventListener("mousedown", this._onMouseDown.bind(this));
    this.window.content.addEventListener("change", this._onChange.bind(this));
  }

  // ================= LISTENER ACTIONS =================
  async _onMouseDown(event) {
    switch (event.which) {
      case 1: return await this._onLeftClick(event);
      case 2: return await this._onMiddleClick(event);
      case 3: return await this._onRightClick(event);
    }
  }

  async _onLeftClick(event) {
    const target = this.#getTarget(event.target, "ctype");
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const object = this.#getObjectFrom(target.dataset);
    if (!object) return;

    switch (cType) {
      case "activable": 
        const value = getValueFromPath(object, path);
        await object.update({[path]: !value});
        break;
    }
  }

  async _onMiddleClick(event) {
    event.preventDefault();
    const target = this.#getTarget(event.target, "middleClick");
    const middleClick = target.dataset.middleClick;
    const object = this.#getObjectFrom(target.dataset);

    switch (middleClick) {
      case "sheet": if (object) object.sheet.render(true);
    }
  }

  async _onRightClick(event) {
    const target = this.#getTarget(event.target, "raction");
    const dataset = target.dataset;

    switch (dataset.raction) {
      case "help": await this._onRemoveHelpDice(dataset); break;
      case "toggleStatus": await this._onStatusToggle(event, target, true); break;
    }
  }

  async _onStatusToggle(event, target, down=false) {
    if (down) await this.actor.toggleStatusEffect(target.dataset.statusId, { active: false, extras: {} })
    else      await this.actor.toggleStatusEffect(target.dataset.statusId, { active: true, extras: {} });
  }

  async _onRemoveHelpDice(dataset) {
    const key = dataset.key;
    const confirmed = await SimplePopup.confirm("Do you want to remove that Help Dice?");
    if (confirmed) this.actor.help.clear(key);
  }

  async _onChange(event) {
    const target = this.#getTarget(event.target, "ctype");
    const dataset = target.dataset;
    const modified = this.#getObjectFrom(dataset);
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "multi-select": await this._onMultiSelectChange(path, value, target, modified); break;
      case "string": await object.update({[path]: value}); break;
    }
  }
  
  async _onMultiSelectChange(path, value, target, modified) {
    if (!value) return;
    const index = target.options.selectedIndex;
    const label = target.options[index].text;
    const object = getValueFromPath(modified, path);
    object[value] = label;
    await modified.update({[path]: object});
    this.render();
  }

  _onEditImage(event) {
    event.preventDefault();
    event.stopPropagation();
    new FilePicker({
      type: "image",
      displayMode: "tiles",
      current: this.actor.img,
      callback: path => {
        if (path) this.actor.update({img: path});
      }
    }).render();
  }

  async _onHover(event) {
    const target = this.#getTarget(event.target, "hover");
    const dataset = target.dataset || {};
    const hover = dataset.hover;

    switch (hover) {
      case "tooltip": this._onTooltip(event, target, dataset); break;
    }
  }

  #getTarget(element, targetKey) {
    if (element.className === "window-content" || !element.parentElement) return element;
    if (element.dataset.hasOwnProperty(targetKey)) return element;
    return this.#getTarget(element.parentElement, targetKey);
  }

  #getObjectFrom(dataset, embedded=false) {
    if (dataset.itemId) {
      return this.actor.items.get(dataset.itemId);
    }
    else if (dataset.effectId) {
      return this.actor.getEffectById(dataset.effectId);
    }
    else if (embedded) return null; // In that case we dont want to return default (actor)
    return this.actor;
  }

  // ================== TOOLTIP ===================
  async _onTooltip(event, target, dataset) {
    const html = $(this.element);

    if (event.type !== "mouseover") {
      PDE.TooltipCreator.hideTooltip(event, html);
      return;
    }

    const object = await this._getTooltipObject(dataset, event);
    if (!object) return;

    const position = this._getTooltipPosition(event);
    const options = {position: position};

    if (dataset.header) options.header = dataset.header;
    if (dataset.img) options.img = dataset.img;
    PDE.TooltipCreator.showTooltipFor(object, event, html, options);
  }

  async _getTooltipObject(dataset, event) {
    if (dataset.statusId) {
      return await fromUuid(dataset.uuid);
    }
    if (dataset.itemId) {
      return this.actor.items.get(dataset.itemId);
    }
    if (dataset.effectId) {
      return this.actor.getEffectById(dataset.effectId);
    }
  }
  
  /** 
   * If not provided it will be calcuated automatically.
   */
  _getTooltipPosition(event) {
    return null;
  }
   // ================== TOOLTIP ===================

   // ================== ACTIONS ===================
  _onShowImg(event, target) {
    new foundry.applications.apps.ImagePopout({ 
      src: this.actor.img,
      window: { title: this.actor.name}, 
      uuid: this.actor.uuid
    }).render(true);
  }

  _onRoll(event, target) {
    const dataset = target.dataset;
    this.actor.roll(dataset.key, dataset.type, {quickRoll: event.shiftKey, customLabel: dataset.label})
  }

  _onSpendResource(event, target) {
    const dataset = target.dataset;
    const amount = parseInt(target.dataset.amount) || 1;
    const resource = this.actor.resources[dataset.resource];
    resource.checkAndSpend(amount);
  }

  _onRegainResource(event, target) {
    const dataset = target.dataset;
    const amount = parseInt(target.dataset.amount) || 1;
    const resource = this.actor.resources[dataset.resource];
    resource.regain(amount);
  }

  _onHelpAction(event, target) {
    if (this.actor.resources.ap.checkAndSpend(1)) {
      this.actor.help.prepare()
    }
  }

  _onCreateTable(event, target) {
    const tab = target.dataset.tab;
    const headers = this.actor.system.sheetData.header.order[tab];
    const order = Object.entries(headers)
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([a, b]) => b.order)
    const last = order[order.length - 1];
    const key = foundry.utils.randomID();
    const newTable = {name: "New Table", custom: true, order: last + 1}
    this.actor.update({[`system.sheetData.header.order.${tab}.${key}`] : newTable});
  }

  _onDeleteTable(event, target) {
    const tab = target.dataset.tab;
    const table = target.dataset.table;
    this.actor.update({[`system.sheetData.header.order.${tab}.${table}`]: new foundry.data.operators.ForcedDeletion()});
  }

  _onReorderTable(event, target) {
    const dataset = target.dataset;
    const headersOrdering = this.actor.system.sheetData.header.order;

    const currentOrder = headersOrdering[dataset.tab][dataset.current].order;
    const swappedOrder = headersOrdering[dataset.tab][dataset.swapped].order;
    headersOrdering[dataset.tab][dataset.current].order = swappedOrder;
    headersOrdering[dataset.tab][dataset.swapped].order = currentOrder;

    this.actor.update({[`system.sheetData.header.order`]: headersOrdering });
  }

  _onCompendiumBrowser(event, target) {
    const dataset = target.dataset;
    createItemBrowser(dataset.itemType, dataset.unlock !== "true", this.actor.sheet);
  }

  async _onItemCreate(event, target) {
    const tab = target.dataset.tab;
    let selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes;
    switch(tab) {
      case "inventory":   selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes; break;
      case "features":    selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.featuresTypes; break;
      case "known":   selectOptions = CONFIG.DC20RPG.DROPDOWN_DATA.knownTypes; break;
    }

    const itemType = await SimplePopup.select(game.i18n.localize("dc20rpg.dialog.create.itemType"), selectOptions);
    if (!itemType) return;

    const itemData = {
      type: itemType,
      name: `New ${CONFIG.DC20RPG.DROPDOWN_DATA.creatableTypes[itemType]}`
    }
    DC20RpgItem.create(itemData, {parent: this.actor});
  }

  _onRollItem(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) item.roll();
  }

  _onEquip(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) item.equip();
  }

  _onToggle(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) item.toggle();
  }

  _onMacro(event, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (item) item.callMacro("onDemand");
  }

  _onEdit(event, target) {
    const object = this.#getObjectFrom(target.dataset, true);
    if (object) object.sheet.render(true);
  }

  _onDelete(event, target) {
    const object = this.#getObjectFrom(target.dataset, true);
    if (object) object.delete();
  }

  _onCopy(event, target) {
    const object = this.#getObjectFrom(target.dataset, true);
    if (object) DC20RpgItem.gmCreate(object.toObject(), {parent: this.actor});
  }

  _onEffectCreate(event, target) {
    const creationData = {
      name: this.actor.name,
      img: this.actor.img,
      origin: this.actor.uuid,
      disabled: false,
      flags: {dc20rpg: {}}
    }
    if (target.dataset.effectType === "temporary") creationData.duration = {rounds: 1};
    DC20RpgActiveEffect.create(creationData, {parent: this.actor});
  }

  _onEffectToggle(event, target) {
    const effect = this.actor.getEffectById(target.dataset.effectId);
    if (effect) effect.toggle();
  }

  _onManualTrigger(event, target) {
    const effect = this.actor.getEffectById(target.dataset.effectId);
    if (effect) effect.runManualEvent();
  }

   // ================== ACTIONS ===================

  // ================== DRAG AND DROP ===================
  _canDragDrop(selector) {
    if (this.actor.type === "storage") return true;
    else return super._canDragDrop(selector);
  }

  _canDragStart(selector) {
    if (this.actor.type === "storage") return true;
    else return super._canDragStart(selector);
  }
  _onDragStart(event) {
    const dataset = event.currentTarget.dataset;
    if (dataset.type === "resource") {
      const resource = this.actor.system.resources.custom[dataset.key];
      resource.type = "Resource";
      resource.key = dataset.key;
      if (!resource) return;
      event.dataTransfer.setData("text/plain", JSON.stringify(resource));
    }
    if (dataset.type === "help") {
      const key = dataset.key;
      const helpDice = this.actor.system.help.active[key];

      if (helpDice) {
        const dto = {
          key: key,
          formula: helpDice.value,
          type: "help",
          actorId: this.actor.id,
          tokenId: this.actor?.token?.id,
        }
        event.dataTransfer.setData("text/plain", JSON.stringify(dto));
      }
      return;
    }
    if (dataset.effectId) {
      const effect = this.actor.getEffectById(dataset.effectId);
      if (effect) {
        event.dataTransfer.setData("text/plain", JSON.stringify(effect.toDragData()));
      }
      return;
    }
    super._onDragStart(event);
  }

  async _onDrop(event) {
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    const droppedObject = JSON.parse(droppedData);

    if (droppedObject?.fromContainer) {
      const container = await fromUuid(droppedObject.containerUuid);
      const itemKey = droppedObject.itemKey;
      await DC20RpgItem.create(droppedObject, {parent: this.actor});
      if (container) await container.update({[`system.contents.${itemKey}`]: new foundry.data.operators.ForcedDeletion()});
    }
    else await super._onDrop(event);
  }

  async _onDropItem(event, data) {
    if ((this.actor.type === "storage" && data.actorType !== undefined) || data.actorType === "storage") {
      await itemTransfer(event, data, this.actor);
      return;
    }
    const item = await Item.implementation.fromDropData(data);
    if (this.actor.type === "storage" && data.actorType === undefined) {
      if (!CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes[item.type]) {
        ui.notifications.error("Storage actor can only store: 'weapons', 'equipment', 'consumables' and 'loot'");
        return;
      }
    }

    const onSelf = data.uuid.includes(this.actor.uuid);
    if (data.actorType !== undefined && CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes[item.type] && !onSelf) {
      const selected = await SimplePopup.open("confirm", {confirmLabel: "Transfer", denyLabel: "Duplicate", message: "Do you want to transfer or duplicate this item?"});
      if (selected) {
        await itemTransfer(event, data, this.actor);
        return;
      }
    }

    // Create companion trait instead of an item
    if (this.actor.type === "companion") {
      const selected = await SimplePopup.open("confirm", {confirmLabel: "Companion Trait", denyLabel: "Standard Item", message: "Do you want to add this item as Companion Trait or Standard Item?"});
      if (selected) {
        const itemData = item.toObject();
        createTrait(itemData, this.actor);
        return;
      }
    }

    // Equipment Slots
    if (this.actor.type === "character") {
      let target = null;
      if (event?.target?.classList.contains("slot")) target = event.target;
      if (event?.target?.parentElement?.classList.contains("slot")) target = event.target.parentElement;
      if (target) {
        const dataset = target.dataset;
        this.actor.equipmentSlots[dataset.category].slots[dataset.key].equip(item);
      }
    }

    const stackable = item.system.stackable;
    if (stackable && onSelf) await handleStackableItem(item, this.actor, event, false);
    else await super._onDropItem(event, data);
  }

  async _onDropActor(event, data) {
    if (this.actor.type === "companion")this._onDropCompanionOwner(data);
    else return await super._onDropActor(event, data);
  }

  async _onDropCompanionOwner(data) {
    if (this.actor.system.companionOwnerId) {
      ui.notifications.warn("Owner of this companion already exist");
      return;
    }
    else {
      if (!data.uuid.startsWith("Actor")) {
        ui.notifications.warn("Owning actor must be stored insde of 'Actors' directory");
        return;
      }
      const companionOwner = await fromUuid(data.uuid);
      if (companionOwner?.type !== "character") {
        ui.notifications.warn("Only Player Character can be selected as an owner");
        return;
      }
      this.actor.update({["system.companionOwnerId"]: companionOwner.id});
    }
  }

  /** @override */
  _onSortItem(event, itemData) {
    onSortItem(event, itemData, this.actor);
  }
}