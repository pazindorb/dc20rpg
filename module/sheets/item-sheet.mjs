import { createEffectOn, prepareActiveEffects } from "../helpers/effects.mjs";
import { activateCommonLinsters } from "./item-sheet/is-listeners.mjs";
import { duplicateItemData, prepareContainer, prepareItemData, preprareSheetData } from "./item-sheet/is-data.mjs";
import { generateKey } from "../helpers/utils.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20RpgItemSheet extends foundry.appv1.sheets.ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".item-sheet-body", initial: "description" }, 
        { navSelector: ".roll-tabs", contentSelector: ".roll-content", initial: "details" },
        { navSelector: ".advanced-tabs", contentSelector: ".advanced-content", initial: "adv-core"}
      ],
      dragDrop: [
        {dragSelector: ".effects-row[data-effect-id]", dropSelector: null},
        {dragSelector: ".item-list .item", dropSelector: null},
      ]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/item_v2/${this.item.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = await super.getData();
    duplicateItemData(context, this.item);
    prepareItemData(context, this.item);
    preprareSheetData(context, this.item);
    prepareActiveEffects(this.item, context);
    if (this.item.type === "container") prepareContainer(this.item, context);

    // Enrich text editors
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    context.enriched = {};
    context.enriched.description = await TextEditor.enrichHTML(context.system.description, {secrets:true, autoLink:true});

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateCommonLinsters(html, this.item);
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
    createEffectOn(effect, this.item);
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