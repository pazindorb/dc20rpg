import { createVariableRollDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, prepareActiveEffectCategories, toggleEffectOn} from "../helpers/effects.mjs";
import { capitalize, changeActivableProperty, changeNumericValue, getLabelFromKey, toggleUpOrDown } from "../helpers/utils.mjs";
import { createItemDialog } from "../dialogs/create-item-dialog.mjs";
import { rollFromItem, rollFromSheet, rollForInitiative } from "../helpers/actors/rollsFromActor.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { getItemFromActor, changeProficiencyAndRefreshItems, deleteItemFromActor, editItemOnActor, changeLevel, sortMapOfItems } from "../helpers/actors/itemsOnActor.mjs";
import { addCustomLanguage, addCustomSkill, convertSkillPoints, removeCustomLanguage, removeCustomSkill, toggleLanguageMastery, toggleSkillMastery } from "../helpers/actors/skills.mjs";
import { changeCurrentCharges, getItemUsageCosts, refreshAllActionPoints, regainBasicResource, subtractAP, subtractBasicResource } from "../helpers/actors/costManipulator.mjs";
import { addNewTableHeader, enhanceItemTab, reorderTableHeader } from "../helpers/actors/itemTables.mjs";
import { changeResourceIcon, createNewCustomResource } from "../helpers/actors/resources.mjs";
import { generateDescriptionForItem, generateDetailsForItem, generateItemName } from "../helpers/actors/tooltip.mjs";
import { createRestDialog } from "../dialogs/rest-dialog.mjs";
import { createActionsDialog } from "../dialogs/actions-dialog.mjs";
import { configureCustomResource, configureDefence, configureJump } from "../dialogs/actor-configuration-dialog.mjs";

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
    context.type = this.actor.type;
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    // Sorting items
    context.items = sortMapOfItems(this.actor.items);
    context.itemChargesAsResources = {};
    context.itemQuantityAsResources = {};

    // Getting data to simpler objects to use it easier on sheet
    context.display = {};

    if (this.actor.type == 'character') {
      await this._prepareItemsForCharacter(context);
    }
    if (this.actor.type == 'npc') {
      await this._prepareItemsForNpc(context);
      context.isNPC = true;
    }
    this._prepareTranslatedLabels(context);
    this._prepareResourceBarsPercentages(context);
    this._determineIfDmgReductionIsEmpty(context);

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    // Enrich text editors
    context.enriched = {};
    context.enriched.journal = await TextEditor.enrichHTML(context.system.journal, {async: true});

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

    // We dont want to change tableName if item is sorted on Attacks table
    const itemRow = event.target.closest("[data-item-attack]");
    const isAttack = itemRow ? true : false;
  
    // if itemId not found we want to check if user doesn't dropped item on table header
    if (!dropTarget) {
      dropTarget = event.target.closest("[data-table-name]"); 
      if (!dropTarget || isAttack) return;
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
  
    // Change items tableName to targets one, skip this if item was sorted on attack row
    if (!isAttack) {
      source.update({["system.tableName"]: target.system.tableName});
    }
  
    // Perform the update
    return this.actor.updateEmbeddedDocuments("Item", updateData);
  }

  //================================
  //           Get Data            =  
  //================================
  async _prepareItemsForCharacter(context) {
    const headersOrdering = context.flags.dc20rpg.headersOrdering;

    // Initialize containers with ordered table names.
    const inventory = this._prepareTableHeadersInOrder(headersOrdering.inventory);
    const features = this._prepareTableHeadersInOrder(headersOrdering.features);
    const techniques = this._prepareTableHeadersInOrder(headersOrdering.techniques);
    const spells = this._prepareTableHeadersInOrder(headersOrdering.spells);

    const attacks = {}; // Special container for items recognized as attacks, for easy access in 'techniques' tab

    // Iterate through items, allocating to containers  
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;
      let tableName = capitalize(item.system.tableName);

      // Append to inventory
      if (['weapon', 'equipment', 'consumable', 'loot', 'tool'].includes(item.type)) {
        if (!inventory[tableName]) addNewTableHeader(this.actor, tableName, "inventory");
        else inventory[tableName].items[item.id] = item;
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
      // Append to ancestry
      else if (item.type === 'ancestry') context.ancestry = item;
      // Append to background
      else if (item.type === 'background') context.background = item;

      await this._prepareItemAsResource(item, context);
      this._prepareItemUsageCosts(item);
      this._prepareItemEnhancements(item);
    }

    // Remove empty tableNames (except for core that should stay) and assign
    context.inventory = enhanceItemTab(inventory, ["Weapons", "Equipment", "Consumables", "Tools", "Loot"]);
    context.features = enhanceItemTab(features, ["Features"]);
    context.techniques = enhanceItemTab(techniques, ["Techniques"]);
    context.spells = enhanceItemTab(spells, ["Spells"]);
    context.attacks = attacks;
  }

  async _prepareItemsForNpc(context) {
    const headersOrdering = context.flags.dc20rpg.headersOrdering;

    // Initialize containers with ordered table names.
    const items = this._prepareTableHeadersInOrder(headersOrdering.items);

    // Iterate through items, allocating to containers  
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;
      let tableName = capitalize(item.system.tableName);

      // Append to items
      if (["Weapons", "Equipment", "Consumables", "Tools", "Loot"].includes(tableName)) {
        const itemCosts = item.system.costs;
        if (itemCosts && itemCosts.resources.actionPoint !== null) items["Actions"].items[item.id] = item;
        else items["Inventory"].items[item.id] = item;
      }
      else {
        if (!items[tableName]) addNewTableHeader(this.actor, tableName, "items");
        else items[tableName].items[item.id] = item;
      }

      await this._prepareItemAsResource(item, context);
      this._prepareItemUsageCosts(item);
      this._prepareItemEnhancements(item);
    }
    // Remove empty tableNames (except for core that should stay) and assign
    context.items = enhanceItemTab(items, ["Actions", "Features", "Techniques", "Inventory", "Spells"]);
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

    const hpValue = context.system.resources.health.value;
    const hpPercentTemp = Math.ceil(100 * hpValue/hpMax);
    if (isNaN(hpPercent)) context.system.resources.health.percentTemp = 0;
    else context.system.resources.health.percentTemp = hpPercentTemp <= 100 ? hpPercentTemp : 100;

    const manaCurrent = context.system.resources.mana.value;
    const manaMax = context.system.resources.mana.max;
    const manaPercent = Math.ceil(100 * manaCurrent/manaMax);
    if (isNaN(manaPercent)) context.system.resources.mana.percent = 0;
    else context.system.resources.mana.percent = manaPercent <= 100 ? manaPercent : 100;

    const staminaCurrent = context.system.resources.stamina.value;
    const staminaMax = context.system.resources.stamina.max;
    const staminaPercent = Math.ceil(100 * staminaCurrent/staminaMax);
    if (isNaN(staminaPercent)) context.system.resources.stamina.percent = 0;
    else context.system.resources.stamina.percent = staminaPercent <= 100 ? staminaPercent : 100;
  }

  _determineIfDmgReductionIsEmpty(context) {
    const dmgTypes = context.system.damageReduction.damageTypes;
    for (const [key, dmgType] of Object.entries(dmgTypes)) {
      dmgType.notEmpty = false;
      if (dmgType.immune) dmgType.notEmpty = true;
      if (dmgType.resistance) dmgType.notEmpty = true;
      if (dmgType.vulnerability) dmgType.notEmpty = true;
      if (dmgType.vulnerable) dmgType.notEmpty = true;
      if (dmgType.resist) dmgType.notEmpty = true;
    }
  }

  _prepareTranslatedLabels(context) {
    // Prepare attributes labels.
    for (let [key, attribute] of Object.entries(context.system.attributes)) {
      attribute.label = game.i18n.localize(CONFIG.DC20RPG.trnAttributes[key]) ?? key;
    }

    // Prepare skills labels.
    for (let [key, skill] of Object.entries(context.system.skills)) {
      if (!skill.custom) skill.label = game.i18n.localize(CONFIG.DC20RPG.trnSkills[key]) ?? key;
    }

    if (this.actor.type == 'character') {
      // Prepare trade skills labels.
      for (let [key, skill] of Object.entries(context.system.tradeSkills)) {
        skill.label = game.i18n.localize(CONFIG.DC20RPG.trnSkills[key]) ?? key;
      }
    }

    // Prepare languages labels.
    for (let [key, language] of Object.entries(context.system.languages)) {
      if (!language.custom) language.label = game.i18n.localize(CONFIG.DC20RPG.trnLanguages[key]) ?? key;
    }

    // Prepare damage reduction labels.
    for (let [key, resistance] of Object.entries(context.system.damageReduction.damageTypes)) {
      resistance.label = game.i18n.localize(CONFIG.DC20RPG.trnReductions[key]) ?? key;
    }

    // Prepare condition immunities
    for (let [key, condition] of Object.entries(context.system.immunities.conditions)) {
      // condition.label = game.i18n.localize(CONFIG.DC20RPG.conditions[key]) ?? key;
      condition.label = getLabelFromKey(key, CONFIG.DC20RPG.conditions);
    }
  }

  async _prepareItemAsResource(item, context) {
    await this._prepareItemChargesAsResource(item, context);
    await this._prepareItemQuantityAsResource(item, context);
  }

  async _prepareItemChargesAsResource(item, context) {
    if (!item.system.costs) return;
    if (!item.system.costs.charges.showAsResource) return;

    const collectedItem = await item;
    const itemCharges = collectedItem.system.costs.charges;
    context.itemChargesAsResources[collectedItem.id] = {
      img: collectedItem.img,
      name: collectedItem.name,
      value: itemCharges.current,
      max: itemCharges.max
    }
  }

  async _prepareItemQuantityAsResource(item, context) {
    if (item.type !== "consumable") return;
    if (item.system.quantity === undefined) return;
    if (!item.system.showAsResource) return;

    const collectedItem = await item;
    context.itemQuantityAsResources[collectedItem.id] = {
      img: collectedItem.img,
      name: collectedItem.name,
      quantity: item.system.quantity
    }
  }

  _prepareItemUsageCosts(item) {
    item.usageCosts = getItemUsageCosts(item, this.actor);
  }

  _prepareItemEnhancements(item) {
    // Collect item Enhancements
    let enhancements = item.system.enhancements;
    if (enhancements) Object.values(enhancements).forEach(enh => enh.itemId = item._id);

    // If selected collect Used Weapon Enhancements 
    const usesWeapon = item.system.usesWeapon;
    if (usesWeapon) {
      const weapon = this.actor.items.get(usesWeapon);
      if (weapon) {
        let weaponEnh = weapon.system.enhancements;
        if (weaponEnh) Object.values(weaponEnh).forEach(enh => {
          enh.itemId = usesWeapon
          enh.fromWeapon = true;
        });
        enhancements = {
          ...enhancements,
          ...weaponEnh
        }
      }
    }

    if (!enhancements) item.enhancements = {};
    else item.enhancements = enhancements;
  }

  //===========================================
  //           Activate Listerners            =  
  //===========================================
  _alwaysActiveListeners(html) {
    // Rolls
    html.find('.rollable').click(ev => {
      if (this.actor.system.rollMenu.initiative) {
        rollForInitiative(this.actor, datasetOf(ev));
        this.actor.update({["system.rollMenu.initiative"]: false});
      }
      else rollFromSheet(this.actor, datasetOf(ev));
    });
    html.find('.roll-item').click(ev => rollFromItem(datasetOf(ev).itemId, this.actor, true, ev.altKey));
    html.find('.variable-roll').click(ev => createVariableRollDialog(datasetOf(ev), this.actor));

    // Togglers
    html.find(".skill-mastery-toggle").mousedown(ev => toggleSkillMastery(datasetOf(ev).path, ev.which, this.actor));
    html.find(".language-mastery-toggle").mousedown(ev => toggleLanguageMastery(datasetOf(ev).key, ev.which, this.actor));
    html.find(".activable").click(ev => changeActivableProperty(datasetOf(ev).path, this.actor));
    html.find(".item-activable").click(ev => changeActivableProperty(datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, this.actor)));
    html.find(".exhaustion-toggle").mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, this.actor, 6, 0));
    html.find('.toogle-item-numeric').mousedown(ev => toggleUpOrDown(datasetOf(ev).path, ev.which, getItemFromActor(datasetOf(ev).itemId, this.actor), 9, 0));
    html.find('.toogle-actor-numeric').mousedown(ev => {
      const max = datasetOf(ev).max || 9;
      toggleUpOrDown(datasetOf(ev).path, ev.which, this.actor, max, 0);
    });

    html.find(".skill-point-converter").click(ev => convertSkillPoints(this.actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate));

    // Rest Button
    html.find(".rest").click(() => createRestDialog(this.actor));

    // Configuration Dialogs
    html.find(".config-md").click(() => configureDefence(this.actor, "mental"));
    html.find(".config-pd").click(() => configureDefence(this.actor, "physical"));
    html.find(".config-jump").click(() => configureJump(this.actor));
    html.find(".activable-proficiency").click(ev => changeProficiencyAndRefreshItems(datasetOf(ev).key, this.actor));

    html.find(".show-actions").click(() => createActionsDialog(this.actor));
    // Manipulating resources
    html.find(".use-ap").click(() => subtractAP(this.actor, 1));
    html.find(".regain-ap").click(() => refreshAllActionPoints(this.actor));
    html.find(".regain-resource").click(ev => regainBasicResource(datasetOf(ev).key, this.actor, datasetOf(ev).amount));
    html.find(".spend-resource").click(ev => subtractBasicResource(datasetOf(ev).key, this.actor, datasetOf(ev).amount));

    // Item manipulation
    html.find('.item-edit').click(ev => editItemOnActor(datasetOf(ev).itemId, this.actor));
    html.find('.editable').mousedown(ev => ev.which === 2 ? editItemOnActor(datasetOf(ev).itemId, this.actor) : ()=>{});
    html.find(".level").click(ev => changeLevel(datasetOf(ev).up, datasetOf(ev).itemId, this.actor));

    // Change item charges
    html.find('.update-charges').change(ev => changeCurrentCharges(valueOf(ev), getItemFromActor(datasetOf(ev).itemId, this.actor)));

    // Update numeric values on items
    html.find('.change-item-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, getItemFromActor(datasetOf(ev).itemId, this.actor)));
    // Update numeric values on actors
    html.find('.change-actor-numeric-value').change(ev => changeNumericValue(valueOf(ev), datasetOf(ev).path, this.actor));

    // Add custom resource
    html.find('.add-resource').change(ev => createNewCustomResource(valueOf(ev), this.actor));
    html.find('.edit-resource').click(ev => configureCustomResource(this.actor, datasetOf(ev).key))
    html.find('.resource-icon').on('imageSrcChange', ev => changeResourceIcon(ev, this.actor));

    // Manage knowledge and languages
    html.find('.add-knowledge').click(() => addCustomSkill(this.actor));
    html.find('.remove-knowledge').click(ev => removeCustomSkill(datasetOf(ev).key, this.actor));
    html.find('.add-language').click(() => addCustomLanguage(this.actor));
    html.find('.remove-language').click(ev => removeCustomLanguage(datasetOf(ev).key, this.actor));

    // Item details on hover
    html.find('.item-row').hover(ev => this._showItemTooltip(datasetOf(ev).itemId, html), () => this._hideItemTooltip(html));

    // Active Effect Managment
    html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, this.actor));
    html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, this.actor));
    html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, this.actor));
    html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, this.actor) : ()=>{});
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
}
