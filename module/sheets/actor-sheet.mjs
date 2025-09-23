import { getEffectFrom, prepareActiveEffectsAndStatuses } from "../helpers/effects.mjs";
import { activateCharacterLinsters, activateCommonLinsters, activateCompanionListeners, activateNpcLinsters, activateStorageListeners } from "./actor-sheet/listeners.mjs";
import { duplicateData, prepareCharacterData, prepareCommonData, prepareCompanionData, prepareNpcData, prepareStorageData } from "./actor-sheet/data.mjs";
import { onSortItem, prepareCompanionTraits, prepareItemsForCharacter, prepareItemsForNpc, prepareItemsForStorage, sortMapOfItems } from "./actor-sheet/items.mjs";
import { createTrait, handleStackableItem } from "../helpers/actors/itemsOnActor.mjs";
import { fillPdfFrom } from "../helpers/actors/pdfConverter.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { itemTransfer } from "../helpers/actors/storage.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export class DC20RpgActorSheet extends foundry.appv1.sheets.ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "actor"], //css classes
      width: 790,
      height: 863,
      tabs: [{ navSelector: ".char-sheet-navigation", contentSelector: ".char-sheet-body", initial: "core" }],
      dragDrop: [
        {dragSelector: ".custom-resource[data-key]", dropSelector: null},
        {dragSelector: ".effects-row[data-effect-id]", dropSelector: null},
        {dragSelector: ".item-list .item", dropSelector: null},
        {dragSelector: ".help-dice", dropSelector: null}
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/actor_v2/${this.actor.type}.hbs`;
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if (this.actor.type === "character") {
      buttons.unshift({
        label: "PDF",
        class: "export-to-pdf",
        icon: "fas fa-file-pdf",
        tooltip: "Export to PDF",
        onclick: () => fillPdfFrom(this.actor)
      });
    }
    return buttons;
  }

  /** @override */
  async getData() {
    const context = await super.getData();
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
        this.position.width = 672;
        this.position.height = 700;
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
    prepareActiveEffectsAndStatuses(this.actor, context);

    // Enrich text editors
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    context.enriched = {};
    context.enriched.journal = await TextEditor.enrichHTML(context.system.journal, {secrets:true, autoLink:true});
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateCommonLinsters(html, this.actor);
    switch (this.actor.type) {
      case "character": 
        activateCharacterLinsters(html, this.actor);
        break;
      case "npc": 
        activateNpcLinsters(html, this.actor);
        break;
      case "companion": 
        activateNpcLinsters(html, this.actor);
        activateCompanionListeners(html, this.actor);
        break;
      case "storage": 
        activateStorageListeners(html, this.actor);
        break;
    }
  }

  /** @override */
  _onSortItem(event, itemData) {
    onSortItem(event, itemData, this.actor);
  }

  _getChildWithClass(parent, clazz) {
    if (!parent) return;
    return Object.values(parent.children).filter(child => child.classList.contains(clazz))[0];
  }

  setPosition(position) {
   super.setPosition(position);

   if (position?.height) {
    const windowContent = this._getChildWithClass(this._element[0], 'window-content');
    const actor_v2 = this._getChildWithClass(windowContent, "actor_v2");
    const charSheetDetails = this._getChildWithClass(actor_v2, 'char-sheet-details');
    const sidetabContent = this._getChildWithClass(charSheetDetails, 'sidetab-content');
    
    if (sidetabContent) {
      const newY = position.height - 30;
      sidetabContent.style = `height: ${newY}px`;
    }
   }
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
      const effect = getEffectFrom(dataset.effectId, this.actor);
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
      await Item.create(droppedObject, {parent: this.actor});
      if (container) await container.update({[`system.contents.-=${droppedObject.itemKey}`]: null});
    }
    else await super._onDrop(event);
  }

  /** @override */
  async _onDropItem(event, data) {
    if ((this.actor.type === "storage" && data.actorType !== undefined) || data.actorType === "storage") {
      await itemTransfer(event, data, this.actor);
      return;
    }

    const onSelf = data.uuid.includes(this.actor.uuid);
    const item = await Item.implementation.fromDropData(data);
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

  /** @override */
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

  _canDragDrop(selector) {
    if (this.actor.type === "storage") return true;
    else return super._canDragDrop(selector);
  }

  _canDragStart(selector) {
    if (this.actor.type === "storage") return true;
    else return super._canDragStart(selector);
  }
}
