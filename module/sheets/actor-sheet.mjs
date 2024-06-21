import { prepareActiveEffectsAndStatuses } from "../helpers/effects.mjs";
import { activateCharacterLinsters, activateCommonLinsters, activateNpcLinsters } from "./actor-sheet/listeners.mjs";
import { duplicateData, prepareCharacterData, prepareCommonData, prepareNpcData } from "./actor-sheet/data.mjs";
import { onSortItem, prepareItemsForCharacter, prepareItemsForNpc, sortMapOfItems } from "./actor-sheet/items.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DC20RpgActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "actor"], //css classes
      width: 755,
      height: 863,
      tabs: [{ navSelector: ".char-sheet-navigation", contentSelector: ".char-sheet-body", initial: "core" }],
      dragDrop: [
        {dragSelector: ".resource[data-key]", dropSelector: null},
        {dragSelector: ".item-list .item", dropSelector: null}
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/actor_v2/${this.actor.type}.hbs`;
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    duplicateData(context, this.actor);
    sortMapOfItems(context, this.actor.items);
    prepareCommonData(context);

    switch (this.actor.type) {
      case "character": 
        prepareCharacterData(context);
        prepareItemsForCharacter(context, this.actor);
        break;
      case "npc": 
        prepareNpcData(context)
        prepareItemsForNpc(context, this.actor);
        context.isNPC = true;
        break;
    } 
    prepareActiveEffectsAndStatuses(this.actor, context);

    // Enrich text editors
    context.enriched = {};
    context.enriched.journal = await TextEditor.enrichHTML(context.system.journal);
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
      resource.type = "resource";
      resource.key = dataset.key;
      if (!resource) return;
      event.dataTransfer.setData("text/plain", JSON.stringify(resource));
    }
    super._onDragStart(event);
  }
}
