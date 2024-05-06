import { prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { generateDescriptionForItem, generateDetailsForItem, generateItemName } from "../helpers/actors/tooltip.mjs";
import { configureDefence, configureJump } from "../dialogs/actor-configuration-dialog.mjs";
import { activateCharacterLinsters, activateCommonLinsters, activateNpcLinsters } from "./actor-sheet/listeners.mjs";
import { duplicateData, prepareCharacterData, prepareCommonData } from "./actor-sheet/data.mjs";
import { onSortItem, prepareItemsForCharacter, sortMapOfItems } from "./actor-sheet/items.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DC20RpgActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "actor"], //css classes
      width: 755,
      height: 863,
      tabs: [{ navSelector: ".char-sheet-navigation", contentSelector: ".char-sheet-body", initial: "core" }]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/actor_v2/character.hbs`;
    // return `systems/dc20rpg/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    const context = super.getData();
    duplicateData(context, this.actor);
    sortMapOfItems(context, this.actor.items);
    prepareCommonData(context);

    switch (this.actor.type) {
      case "character": 
        prepareCharacterData(context);
        prepareItemsForCharacter(context, this.actor);
        break;
      case "npc": 
        this._prepareItemsForNpc(context);
        context.isNPC = true;
        break;
    } 

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    // Enrich text editors
    context.enriched = {};
    context.enriched.journal = TextEditor.enrichHTML(context.system.journal, {async: false});
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
    
    // Configuration Dialogs TODO: Merge all to single cofiguration dialog
    html.find(".config-md").click(() => configureDefence(this.actor, "mental"));
    html.find(".config-pd").click(() => configureDefence(this.actor, "physical"));
    html.find(".config-jump").click(() => configureJump(this.actor));

    // Item details on hover TODO: Rework tooltip 
    html.find('.item-row').hover(ev => this._showItemTooltip(datasetOf(ev).itemId, html), () => this._hideItemTooltip(html));
  }

  /** @override */
  _onSortItem(event, itemData) {
    onSortItem(event, itemData, this.actor);
  }

  _showItemTooltip(itemId, html) {
    const tooltip = html.find(".item-tooltip");
    const itemName = tooltip.find(".item-name");
    const itemDescription = tooltip.find(".item-description");
    const itemDetails = tooltip.find(".item-details");
    const item = this.actor.items.get(itemId);

    const name = generateItemName(item);
    const description = generateDescriptionForItem(item);
    const details = generateDetailsForItem(item);

    itemName.html(name);
    itemDescription.html(description);
    itemDetails.html(details);
    tooltip.removeAttr("hidden");
  }

  _hideItemTooltip(html) {
    const tooltip = html.find(".item-tooltip");
    tooltip.attr("hidden", "true");
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
}
