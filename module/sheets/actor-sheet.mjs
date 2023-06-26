import { createVariableRollDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import * as items from "../helpers/items.mjs";
import * as rolls from "../helpers/rolls.mjs";;
import * as tooglers from "../helpers/togglers.mjs";
import { changeActivableProperty } from "../helpers/utils.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DC20RpgActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "actor"], //css classes
      width: 730,
      height: 850,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. 
    // You can inspect or log the context variable to see the structure, but some key properties for sheets are:
    // - the actor object, 
    // - the data object, 
    // - whether or not it's editable, 
    // - the items array,
    // - the effects array.
    const context = super.getData();

    context.config = DC20RPG;
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    
    // Prepare character data and items.
    if (this.actor.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
      this._calculatePercentages(context);
    }

    // Prepare NPC data and items.
    if (this.actor.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Calls method that changes boolean value to o
    html.find(".activable").click(ev => changeActivableProperty(ev, this.actor));

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => items.editItemOnActor(ev, this.actor));

    // Mastery switches
    html.find(".skill-mastery-toggle").mousedown(ev => tooglers.toggleSkillMastery(ev, this.actor));
    html.find(".language-mastery-toggle").mousedown(ev => tooglers.toggleLanguageMastery(ev, this.actor));

    // Variable attribute roll
    html.find('.variable-roll').click(ev => createVariableRollDialog(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(ev => this._onRoll(ev));

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Item manipulation
    html.find('.item-create').click(ev => items.createItemOnActor(ev, this.actor));
    html.find('.item-delete').click(ev => items.deleteItemFromActor(ev, this.actor));

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }
    
    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `${dataset.label}` : '';
      return rolls.rollFromFormula(dataset.roll, this.actor, true, label);
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   */
  _prepareItems(context) {
    // Initialize containers.
    const equipment = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };

    // Iterate through items, allocating to containers
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;
      // Append to equipment.
      if (item.type === 'weapon') {
        equipment.push(item);
      }
      // Append to features.
      else if (item.type === 'feature') {
        features.push(item);
      }
      // Append to spells.
      else if (item.type === 'spell') {
        if (item.system.spellLevel != undefined) {
          spells[item.system.spellLevel].push(item);
        }
      }
    }

    // Assign and return
    context.equipment = equipment;
    context.features = features;
    context.spells = spells;
  }

  _calculatePercentages(context) {
    let hpValue = context.system.resources.health.value;
    let hpMax = context.system.resources.health.max;
    context.system.resources.health.percent = Math.ceil(100 * hpValue/hpMax);

    let manaValue = context.system.resources.mana.value;
    let manaMax = context.system.resources.mana.max;
    context.system.resources.mana.percent = Math.ceil(100 * manaValue/manaMax);

    let staminaValue = context.system.resources.stamina.value;
    let staminaMax = context.system.resources.stamina.max;
    context.system.resources.stamina.percent = Math.ceil(100 * staminaValue/staminaMax);
  }

  _prepareCharacterData(context) {
    this._prepareTranslatedLabels(context);
    this._prepareFlags(context);
  }

  _prepareTranslatedLabels(context) {
    // Prepare attributes labels.
    for (let [key, attribute] of Object.entries(context.system.attributes)) {
      attribute.label = game.i18n.localize(CONFIG.DC20RPG.trnAttributes[key]) ?? key;
    }

    // Prepare skills labels.
    for (let [key, skill] of Object.entries(context.system.skills)) {
      skill.label = game.i18n.localize(CONFIG.DC20RPG.trnSkills[key]) ?? key;
    }

    // Prepare trade skills labels.
    for (let [key, skill] of Object.entries(context.system.tradeSkills)) {
      skill.label = game.i18n.localize(CONFIG.DC20RPG.trnSkills[key]) ?? key;
    }

    // Prepare languages labels.
    for (let [key, language] of Object.entries(context.system.languages)) {
      language.label = game.i18n.localize(CONFIG.DC20RPG.trnLanguages[key]) ?? key;
    }
  }

  _prepareFlags(context) {
    // Flags describing visiblity of unknown skills and languages
    if (context.flags.showUnknownTradeSkills === undefined) context.flags.showUnknownTradeSkills = true;
    if (context.flags.showUnknownLanguages === undefined) context.flags.showUnknownLanguages = true;
  }
    
}
