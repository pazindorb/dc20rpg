import { createVariableRollDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { onManageActiveEffect, prepareActiveEffectCategories } from "../helpers/effects.mjs";
import * as items from "../helpers/items.mjs";
import * as rolls from "../helpers/rolls.mjs";;
import * as tooglers from "../helpers/togglers.mjs";
import * as costs from "../helpers/cost-manipulator.mjs";
import * as itemTabs from "../helpers/itemTables.mjs";
import { arrayOfTruth, capitalize, changeActivableProperty, changeNumericValue, sortMapOfItems } from "../helpers/utils.mjs";
import { createItemDialog } from "../dialogs/create-item-dialog.mjs";
import { createConfigureDefenceDialog } from "../dialogs/configure-defence-dialog.mjs";
import { createConfigureResistanceDialog } from "../dialogs/configure-resistance-dialog.mjs";

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
    // Sorting items
    context.items = sortMapOfItems(this.actor.items);
    
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
    html.find(".activable-proficiency").click(ev => items.changeProficiencyAndRefreshItems(ev, this.actor))

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

    // Configure Defences
    html.find(".config-md").click(() => createConfigureDefenceDialog(this.actor, "mental"));
    html.find(".config-pd").click(() => createConfigureDefenceDialog(this.actor, "phisical"));
    // Configure Resistances
    html.find(".config-resistances").click(() => createConfigureResistanceDialog(this.actor));

    // Level up/down
    html.find(".level").click(ev => items.changeLevel(ev, items.getItemFromActor(ev, this.actor)))

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Item manipulation
    html.find('.item-create').click(ev => createItemDialog(ev, this.actor));
    html.find('.item-delete').click(ev => items.deleteItemFromActor(ev, this.actor));

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Manage table headers names ordering
    html.find(".reorder").click(ev => itemTabs.reorderTableHeader(ev, this.actor));
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
      let costsSubracted = rollMenu.freeRoll ? true : this._subtractCosts(item);
      
      // Calculate if should be done with advantage or disadvantage
      let disLevel = rollMenu.dis ? rollMenu.disLevel : 0
      let advLevel = rollMenu.adv ? rollMenu.advLevel : 0
      let rollLevel = advLevel - disLevel;

      return costsSubracted ? item.roll(rollLevel, rollMenu.versatileRoll) : null;
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
    const headersOrdering = context.flags.dc20rpg.headersOrdering;

    // Initialize containers with ordered table names.
    const inventory = this._prepareTableHeadersInOrder(headersOrdering.inventory)
    const features = this._prepareTableHeadersInOrder(headersOrdering.features)
    const techniques = this._prepareTableHeadersInOrder(headersOrdering.techniques)
    const spells = this._prepareTableHeadersInOrder(headersOrdering.spells)

    let equippedArmorBonus = 0;
    // Iterate through items, allocating to containers
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;
      let tableName = capitalize(item.system.tableName);

      // Append to inventory
      if (['weapon', 'equipment', 'consumable', 'loot', 'tool'].includes(item.type)) {
        if (!inventory[tableName]) itemTabs.addNewTableHeader(this.actor, tableName, "inventory");
        else inventory[tableName].items[item.id] = item;

        if (item.type === 'tool') items.addBonusToTradeSkill(this.actor, item);
        if (item.type === 'equipment') equippedArmorBonus += items.getArmorBonus(item);
      }
      // Append to features
      else if (item.type === 'feature') {
        if (!features[tableName]) itemTabs.addNewTableHeader(this.actor, tableName, "features");
        else features[tableName].items[item.id] = item;
      }
      // Append to techniques
      else if (item.type === 'technique') {
        if (!techniques[tableName]) itemTabs.addNewTableHeader(this.actor, tableName, "techniques");
        else  techniques[tableName].items[item.id] = item;
      }
      // Append to spells
      else if (item.type === 'spell') {
        if (!spells[tableName]) itemTabs.addNewTableHeader(this.actor, tableName, "spells");
        else spells[tableName].items[item.id] = item;
      }
      // Append to class
      else if (item.type === 'class') context.class = item;
      // Append to subclass
      else if (item.type === 'subclass') context.subclass = item;
    }
    // Update actor's armor bonus
    this.actor.update({["system.defences.phisical.armorBonus"] : equippedArmorBonus});

    // Remove empty tableNames (except for core that should stay) and assign
    context.inventory = itemTabs.enchanceItemTab(inventory, ["Weapons", "Equipment", "Consumables", "Tools", "Loot"]);
    context.features = itemTabs.enchanceItemTab(features, ["Features"]);
    context.techniques = itemTabs.enchanceItemTab(techniques, ["Techniques"]);
    context.spells = itemTabs.enchanceItemTab(spells, ["Spells"]);
  }

  _prepareTableHeadersInOrder(order) {
    // Sort
    let sortedTableHeaders = Object.entries(order).sort((a, b) => a[1] - b[1]);

    let tableHeadersInOrder = {};
    sortedTableHeaders.forEach(tableName => {
      tableHeadersInOrder[tableName[0]] = {
        items: {},
        siblings: {}
      };
    })

    return tableHeadersInOrder;
  }

  _calculatePercentages(context) {
    let hpCurrent = context.system.resources.health.current;
    let hpMax = context.system.resources.health.max;
    context.system.resources.health.percent = Math.ceil(100 * hpCurrent/hpMax);

    let manaCurrent = context.system.resources.mana.current;
    let manaMax = context.system.resources.mana.max;
    context.system.resources.mana.percent = Math.ceil(100 * manaCurrent/manaMax);

    let staminaCurrent = context.system.resources.stamina.current;
    let staminaMax = context.system.resources.stamina.max;
    context.system.resources.stamina.percent = Math.ceil(100 * staminaCurrent/staminaMax);
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

  _onSortItem(event, itemData) {

    // Get the drag source and drop target
    const items = this.actor.items;
    const source = items.get(itemData._id);
  
    let dropTarget = event.target.closest("[data-item-id]");
  
    // if itemId not found we want to check if user doesn't dropped item on table header
    if (!dropTarget) {
      dropTarget = event.target.closest("[data-table-name]"); 
      if (!dropTarget) return;
      source.update({["system.tableName"]: dropTarget.dataset.tableName});
      return;
    }
  
    const target = items.get(dropTarget.dataset.itemId);
  
    // Don't sort on yourself
    if ( source.id === target.id ) return;
  
    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for ( let el of dropTarget.parentElement.children ) {
      const siblingId = el.dataset.itemId;
      if ( siblingId && (siblingId !== source.id) ) {
        siblings.push(items.get(el.dataset.itemId));
      } 
    }
  
    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });
  
    // Change items tableName to targets one
    source.update({["system.tableName"]: target.system.tableName});
    
  
    // Perform the update
    return this.actor.updateEmbeddedDocuments("Item", updateData);
  }
}
