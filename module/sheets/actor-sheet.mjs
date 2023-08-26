import { createVariableRollDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, prepareActiveEffectCategories, toggleEffectOn} from "../helpers/effects.mjs";
import { capitalize, changeActivableProperty, changeNumericValue } from "../helpers/utils.mjs";
import { createItemDialog } from "../dialogs/create-item-dialog.mjs";
import { createConfigureDefenceDialog } from "../dialogs/configure-defence-dialog.mjs";
import { createConfigureResistanceDialog } from "../dialogs/configure-resistance-dialog.mjs";
import { handleRollFromFormula, handleRollFromItem } from "../helpers/actors/rollsFromActor.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { getItemFromActor, changeProficiencyAndRefreshItems, deleteItemFromActor, editItemOnActor, changeLevel, addBonusToTradeSkill, getArmorBonus, sortMapOfItems } from "../helpers/actors/itemsOnActor.mjs";
import { toggleLanguageMastery, toggleSkillMastery } from "../helpers/actors/skills.mjs";
import { changeCurrentCharges, refreshAllActionPoints, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { addNewTableHeader, enchanceItemTab, reorderTableHeader } from "../helpers/actors/itemTables.mjs";
import { showItemAsResource } from "../helpers/resources.mjs";

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
  async getData() {
    const context = super.getData();

    context.config = DC20RPG;
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    // Sorting items
    context.items = sortMapOfItems(this.actor.items);
    context.itemsAsResources = {};

    // Getting data to simpler objects to use it easier on sheet
    context.display = {};

    if (this.actor.type == 'character') {
      await this._prepareItems(context);
      this._prepareTranslatedLabels(context);
      this._prepareResourceBarsPercentages(context);
      this._prepareSimplifiedDisplayData(context);
    }
    if (this.actor.type == 'npc') {
      await this._prepareItems(context);
    }

    context.rollData = context.actor.getRollData();
    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    this._alwaysActiveListeners(html);
    this._editActiveListeners(html)
  }

  /** @override */
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

  //================================
  //           Get Data            =  
  //================================
 async _prepareItems(context) {
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
        if (!inventory[tableName]) addNewTableHeader(this.actor, tableName, "inventory");
        else inventory[tableName].items[item.id] = item;

        if (item.type === 'tool') addBonusToTradeSkill(this.actor, item);
        if (item.type === 'equipment') equippedArmorBonus += getArmorBonus(item);
      }
      // Append to features
      else if (item.type === 'feature') {
        if (!features[tableName]) addNewTableHeader(this.actor, tableName, "features");
        else features[tableName].items[item.id] = item;
      }
      // Append to techniques
      else if (item.type === 'technique') {
        if (!techniques[tableName]) addNewTableHeader(this.actor, tableName, "techniques");
        else  techniques[tableName].items[item.id] = item;
      }
      // Append to spells
      else if (item.type === 'spell') {
        if (!spells[tableName]) addNewTableHeader(this.actor, tableName, "spells");
        else spells[tableName].items[item.id] = item;
      }
      // Append to class
      else if (item.type === 'class') context.class = item;
      // Append to subclass
      else if (item.type === 'subclass') context.subclass = item;

      await this._prepareItemAsResource(item, context);
    }
    // Update actor's armor bonus
    this.actor.update({["system.defences.phisical.armorBonus"] : equippedArmorBonus});

    // Remove empty tableNames (except for core that should stay) and assign
    context.inventory = enchanceItemTab(inventory, ["Weapons", "Equipment", "Consumables", "Tools", "Loot"]);
    context.features = enchanceItemTab(features, ["Features"]);
    context.techniques = enchanceItemTab(techniques, ["Techniques"]);
    context.spells = enchanceItemTab(spells, ["Spells"]);
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

  _prepareResourceBarsPercentages(context) {
    const hpCurrent = context.system.resources.health.current;
    const hpMax = context.system.resources.health.max;
    const hpPercent = Math.ceil(100 * hpCurrent/hpMax);
    if (isNaN(hpPercent)) context.system.resources.health.percent = 0;
    else context.system.resources.health.percent = hpPercent <= 100 ? hpPercent : 100;

    const manaCurrent = context.system.resources.mana.current;
    const manaMax = context.system.resources.mana.max;
    const manaPercent = Math.ceil(100 * manaCurrent/manaMax);
    if (isNaN(manaPercent)) context.system.resources.mana.percent = 0;
    else context.system.resources.mana.percent = manaPercent <= 100 ? manaPercent : 100;

    const staminaCurrent = context.system.resources.stamina.current;
    const staminaMax = context.system.resources.stamina.max;
    const staminaPercent = Math.ceil(100 * staminaCurrent/staminaMax);
    if (isNaN(staminaPercent)) context.system.resources.stamina.percent = 0;
    else context.system.resources.stamina.percent = staminaPercent <= 100 ? staminaPercent : 100;
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

  _prepareSimplifiedDisplayData(context) {
    this._prepareResistancesDisplay(context);
  }

  _prepareResistancesDisplay(context) {
    const actorResistance = context.system.resistances;
    let resistances = {
      phisical: {},
      magic: {}
    }

    Object.entries(actorResistance).forEach(([key, value]) => {
      let resitance = value;
      resitance.label = game.i18n.localize(CONFIG.DC20RPG.trnResistances[key]) ?? key;

      if (["bludgeoning", "slashing", "piercing"].includes(key)) {
        resistances.phisical[key] = resitance;
      } else {
        resistances.magic[key] = resitance;
      }
    })

    context.display.resistances = resistances;
  }

  async _prepareItemAsResource(item, context) {
    if (!item.system.costs) return;
    if (!item.system.costs.charges.showAsResource) return;

    const collectedItem = await item;
    context.itemsAsResources[item.id] = showItemAsResource(collectedItem);
  }

  //===========================================
  //           Activate Listerners            =  
  //===========================================
  _alwaysActiveListeners(html) {
    // Rolls
    html.find('.rollable').click(ev => handleRollFromFormula(this.actor, datasetOf(ev), true));
    html.find('.roll-item').click(ev => handleRollFromItem(this.actor, datasetOf(ev), true));
    html.find('.variable-roll').click(ev => createVariableRollDialog(datasetOf(ev), this.actor));

    // Togglers
    html.find(".skill-mastery-toggle").mousedown(ev => toggleSkillMastery(datasetOf(ev).path, ev.which, this.actor));
    html.find(".language-mastery-toggle").mousedown(ev => toggleLanguageMastery(datasetOf(ev).key, ev.which, this.actor));
    html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, this.actor));
    html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, this.actor)));

    // Configuration Dialogs
    html.find(".config-md").click(() => createConfigureDefenceDialog(this.actor, "mental"));  
    html.find(".config-pd").click(() => createConfigureDefenceDialog(this.actor, "phisical"));
    html.find(".config-resistances").click(() => createConfigureResistanceDialog(this.actor));
    html.find(".activable-proficiency").click(ev => changeProficiencyAndRefreshItems(datasetOf(ev).key, this.actor));

    // Manipulatig of Action Points
    html.find(".use-ap").click(() => subtractAP(this.actor, 1));
    html.find(".regain-ap").click(() => refreshAllActionPoints(this.actor));

    // Item manipulation
    html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, this.actor));
    html.find('.item-row').mousedown(ev => ev.which === 2 ? editItemOnActor(datasetOf(ev).itemId, this.actor) : ()=>{});
    html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, this.actor));

    // Change item charges
    html.find('.update-charges').change(ev => changeCurrentCharges(valueOf(ev), getItemFromActor(datasetOf(ev).itemId, this.actor)));

    // Update adv/dis level
    html.find('.change-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, this.actor)));

    // Active Effect Managment
    html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, this.actor));
    html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, this.actor));
    html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, this.actor));
    html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, this.actor));
  }

  _editActiveListeners(html) {
    if (!this.isEditable) return;

    // Item manipulation
    html.find('.item-create').click(ev => createItemDialog(datasetOf(ev).tab, this.actor));
    html.find('.item-delete').click(ev => deleteItemFromActor(datasetOf(ev).itemId, this.actor));

    // Table headers names ordering
    html.find(".reorder").click(ev => reorderTableHeader(ev, this.actor));
  }
}
