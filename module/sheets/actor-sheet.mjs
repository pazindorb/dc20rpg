import { VariableAttributePickerDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import { createItemOnActor, deleteItemFromActor, editItemOnActor } from "../helpers/items.mjs";
import { rollFlavor } from "../helpers/roll.mjs";
import { skillMasteryLevelToValue } from "../helpers/skills.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class DC20RpgActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "actor"], //css classes
      template: "systems/dc20rpg/templates/actor/actor-sheet.hbs", //html template
      width: 700,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();
    context.config = DC20RPG;

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
      this._calculatePercentages(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
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

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle attributes labels.
    
    for (let [key, attribute] of Object.entries(context.system.attributes)) {
      attribute.label = game.i18n.localize(CONFIG.DC20RPG.trnAttributes[key]) ?? key;
    }

    // Handle core skills labels.
    for (let [key, skill] of Object.entries(context.system.skills)) {
      skill.label = game.i18n.localize(CONFIG.DC20RPG.trnSkills[key]) ?? key;
    }

    // Handle knowledge skills labels.
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
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
      if (item.type === 'item') {
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

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => editItemOnActor(ev, this.actor));

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(ev => createItemOnActor(ev, this.actor));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => deleteItemFromActor(ev, this.actor));

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Save mastery toggle
    html.find(".save-mastery-toggle").click(ev => this._onToogleMastery(ev));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Variable roll
    html.find('.variable-roll').click(this._onVariableRoll.bind(this))

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
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: rollFlavor(this.actor.img, label),
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  _onVariableRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    
    let dialog = new VariableAttributePickerDialog(this.actor, dataset);
    dialog.render(true);
  }

  /**
   * Handle toogle mastery.
   * @param {Event} event   The originating click event
   * @private
   */
  _onToogleMastery(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    let currentValue = this.actor.system.attributes[dataset.key].saveMastery;
    let pathToValue = `system.attributes.${dataset.key}.saveMastery`;
    this.actor.update({[pathToValue] : !currentValue});
  }

}
