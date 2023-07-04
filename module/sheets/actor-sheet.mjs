import { createVariableRollDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import * as items from "../helpers/items.mjs";
import * as rolls from "../helpers/rolls.mjs";;
import * as tooglers from "../helpers/togglers.mjs";
import * as costs from "../helpers/cost-manipulator.mjs";
import { arrayOfTruth, capitalize, changeActivableProperty, changeNumericValue } from "../helpers/utils.mjs";
import { createItemDialog } from "../dialogs/create-item-dialog.mjs";

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
    context.items = this.actor.items;
    
    // Prepare character data and items.
    if (this.actor.type == 'character') {
      this._prepareItems(context);
      this._prepareTranslatedLabels(context);
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

    // Manipulatig of Action Points
    html.find(".use-ap").click(() => costs.subtractAP(this.actor, 1));
    html.find(".regain-ap").click(() => costs.refreshAllActionPoints(this.actor));

    // Variable attribute roll
    html.find('.variable-roll').click(ev => createVariableRollDialog(ev.currentTarget.dataset, this.actor));

    // Rollable abilities
    html.find('.rollable').click(ev => this._onRoll(ev, "formula"));
    // Roll Item
    html.find('.roll-item').click(ev => this._onRoll(ev, "item"));

    // Change item charges
    html.find('.update-charges').change(ev => {
      costs.changeCurrentCharges(ev, items.getItemFromActor(ev, this.actor))
      this.render();
    });
    // Update adv/dis level
    html.find('.change-numeric-value').change(ev => {
      changeNumericValue(ev, items.getItemFromActor(ev, this.actor))
      this.render();
    });

    // Activable for item
    html.find(".item-activable").click(ev => changeActivableProperty(ev, items.getItemFromActor(ev, this.actor)));

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Item manipulation
    html.find('.item-create').click(ev => createItemDialog(ev, this.actor));
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
  _onRoll(event, rollType) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle rolls that supply the formula directly.
    if (rollType === "formula") {
      let label = dataset.label ? `${dataset.label}` : '';
      return rolls.rollFromFormula(dataset.roll, this.actor, true, label);
    }

    // Handle item rolls.
    if (rollType === "item") return this._itemRoll(dataset);
  }

  _itemRoll(dataset) {
    const item = this.actor.items.get(dataset.itemId);
    if (!item) return;

    // Handle Standard Roll
    if (!dataset.configuredRoll) {
      return this._subtractCosts(item) ? item.roll(0, false) : null;
    } 
    // Handle Configured Roll
    else {
      const rollMenu = item.flags.rollMenu;
      // Handle cost usage if roll is not free
      if (!rollMenu.freeRoll) this._subtractCosts(item);
  
      // Calculate if should be done with advantage or disadvantage
      let disLevel = rollMenu.dis ? rollMenu.disLevel : 0
      let advLevel = rollMenu.adv ? rollMenu.advLevel : 0
      let rollLevel = advLevel - disLevel;
  
      return item.roll(rollLevel, rollMenu.versatileRoll);
    }

  }

  _subtractCosts(item) {
    const itemCosts = item.system.usageCost;
    let substractionResults = [
      costs.canSubtractAP(this.actor, itemCosts.actionPointCost),
      costs.canSubtractStamina(this.actor, itemCosts.staminaCost),
      costs.canSubtractMana(this.actor, itemCosts.manaCost),
      costs.canSubtractHP(this.actor, itemCosts.healthCost),
      costs.canSubtractCharge(item),
      costs.canSubtractQuantity(item)
    ];
    if (!arrayOfTruth(substractionResults)) return false;

    costs.subtractAP(this.actor, itemCosts.actionPointCost);
    costs.subtractStamina(this.actor, itemCosts.staminaCost);
    costs.subtractMana(this.actor, itemCosts.manaCost);
    costs.subtractHP(this.actor, itemCosts.healthCost);
    costs.subtractCharge(item);
    costs.subtractQuantity(item);
    return true;
  }

  /**
   * Organize and classify Items for Character sheets.
   */
  _prepareItems(context) {
    // Initialize containers with base table names.
    const inventory = {
      "Weapons": [],
      "Equipment": [],
      "Consumables": [],
      "Tools": [],
      "Loot": []
    };
    const features = {
      "Features": [],
    };
    const techniques = {
      "Techniques": [],
    };
    const spells = {
      "Spells": [],
    };
    const clazz = null;
    const subclass = null;

    // Iterate through items, allocating to containers
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;
      let tableName = capitalize(item.system.tableName);

      // Append to inventory
      if (['weapon', 'equipment', 'consumable', 'loot', 'tool'].includes(item.type)) {
        if (!inventory[tableName]) inventory[tableName] = [item];
        else inventory[tableName].push(item);

        if (item.type === 'tool') this._addBonusToTradeSkill(item);
      }
      // Append class
      else if (item.type === 'class') {
        if (!clazz) clazz = item
        else ui.notifications.error(`Character ${this.actor.name} already has a class.`);
      }
      // Append subclass
      else if (item.type === 'subclass') {
        if (!subclass) subclass = item
        else ui.notifications.error(`Character ${this.actor.name} already has a subclass.`);
      }
      // Append to features
      else if (item.type === 'feature') {
        if (!features[tableName]) features[tableName] = [item];
        else features[tableName].push(item);
      }
      // Append to techniques
      else if (item.type === 'technique') {
        if (!techniques[tableName]) techniques[tableName] = [item];
        else techniques[tableName].push(item);
      }
      // Append to spells
      else if (item.type === 'spell') {
        if (!spells[tableName]) spells[tableName] = [item];
        else spells[tableName].push(item);
      }
    }

    // Assign and return
    context.inventory = inventory;
    context.features = features;
    context.techniques = techniques;
    context.spells = spells;
    context.class = clazz;
    context.subclass = subclass;
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

  _addBonusToTradeSkill(item) {
    const tradeSkillKey = item.system.tradeSkillKey;
    const rollBonus = item.system.rollBonus;
    if (tradeSkillKey) {
      let bonus = rollBonus ? rollBonus : 0;
      this.actor.update({[`system.tradeSkills.${tradeSkillKey}.bonus`] : bonus});
    }
  }
}
