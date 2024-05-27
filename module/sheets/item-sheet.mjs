import { configureAdvancementDialog } from "../dialogs/configure-advancement.mjs";
import { getItemUsageCosts } from "../helpers/actors/costManipulator.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { createEffectOn, deleteEffectOn, editEffectOn, prepareActiveEffectsAndStatuses, toggleEffectOn } from "../helpers/effects.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { deleteAdvancement } from "../helpers/advancements.mjs";
import { addEnhancement, addMartialManeuvers, removeEnhancement } from "../helpers/items/enhancements.mjs";
import { addFormula, getFormulaHtmlForCategory, removeFormula } from "../helpers/items/itemRollFormulas.mjs";
import { addScalingValue, removeScalingValue, updateResourceValues, updateScalingValues } from "../helpers/items/scalingItems.mjs";
import { changeActivableProperty, getLabelFromKey } from "../helpers/utils.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class DC20RpgItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "sheet", "item"],
      width: 520,
      height: 520,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".item-sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/item/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const context = super.getData();

    context.userIsGM = game.user.isGM;

    context.config = DC20RPG;
    context.system = this.item.system;
    context.flags = this.item.flags;

    context.itemsWithChargesIds = {};
    context.consumableItemsIds = {};
    context.weaponsOnActor = {};
    context.hasOwner = false;
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.hasOwner = true;

      const itemIds = actor.getOwnedItemsIds(this.item.id);
      context.itemsWithChargesIds = itemIds.withCharges;
      context.consumableItemsIds = itemIds.consumable;
      context.weaponsOnActor = itemIds.weapons;
      
      this._prepareCustomCosts(context, actor); // TODO: Wyjebać to?
    }
    this._prepareEnhancements(context);
    this._prepareAdvancements(context);
    this._prepareItemUsageCosts(context, actor);

    context.sheetData = {};
    this._prepareDetailsBoxes(context);
    this._prepareTypesAndSubtypes(context);
    if (["weapon", "equipment", "consumable", "feature", "technique", "spell"].includes(this.item.type)) {
      this._prepareActionInfo(context);
    }

    // Prepare active effects
    prepareActiveEffectsAndStatuses(this.item, context);

    // Enrich text editors
    context.enriched = {};
    context.enriched.description = TextEditor.enrichHTML(context.system.description, {async: false});

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.activable').click(ev => changeActivableProperty(datasetOf(ev).path, this.item));

    // Formulas
    html.find('.add-formula').click(ev => addFormula(datasetOf(ev).category, this.item));
    html.find('.remove-formula').click(ev => removeFormula(datasetOf(ev).key, this.item));

    // Class Advancements
    html.find('.create-advancement').click(() => configureAdvancementDialog(this.item));
    html.find('.advancement-edit').click(ev => configureAdvancementDialog(this.item, datasetOf(ev).key));
    html.find('.advancement-delete').click(ev => deleteAdvancement(this.item, datasetOf(ev).key));

    // Resources Managment
    html.find('.update-resources').change(ev => updateScalingValues(this.item, datasetOf(ev) , valueOf(ev), "resources"));
    html.find('.update-scaling').change(ev => updateScalingValues(this.item, datasetOf(ev), valueOf(ev), "scaling"));
    html.find('.update-item-resource').change(ev => updateResourceValues(this.item, datasetOf(ev).index, valueOf(ev)));

    html.find('.add-scaling').click(() => addScalingValue(this.item, html.find('.scaling-resorce-key')));
    html.find('.remove-scaling').click(ev => removeScalingValue(this.item, datasetOf(ev).key))

    html.find('.select-other-item').change(ev => this._onSelection(datasetOf(ev).path, datasetOf(ev).selector, this.item));

    // Enhancement
    html.find('.add-enhancement').click(() => addEnhancement(this.item, html.find('.new-enhancement-name')));
    html.find('.add-martial-maneuvers').click(() => addMartialManeuvers(this.item))
    html.find('.remove-enhancement').click(ev => removeEnhancement(this.item, datasetOf(ev).key))

    // Active Effect Managment
    html.find(".effect-create").click(ev => createEffectOn(datasetOf(ev).type, this.item));
    html.find(".effect-toggle").click(ev => toggleEffectOn(datasetOf(ev).effectId, this.item));
    html.find(".effect-edit").click(ev => editEffectOn(datasetOf(ev).effectId, this.item));
    html.find('.editable-effect').mousedown(ev => ev.which === 2 ? editEffectOn(datasetOf(ev).effectId, this.item) : ()=>{});
    html.find(".effect-delete").click(ev => deleteEffectOn(datasetOf(ev).effectId, this.item));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
    html.find('.remove-resource').click(ev => this._removeResourceFromItem(this.item, datasetOf(ev).key))
    if (!this.isEditable) return;
  }

  _onSelection(path, selector, item) {
    const itemId = $(`.${selector} option:selected`).val();
    item.update({[path]: itemId});
  }

  //================================
  //           Get Data            =  
  //================================
  _prepareActionInfo(context) {
    context.sheetData.damageFormula = getFormulaHtmlForCategory("damage", this.item);
    context.sheetData.healingFormula = getFormulaHtmlForCategory("healing", this.item);
    context.sheetData.otherFormula = getFormulaHtmlForCategory("other", this.item);
  }

  _prepareDetailsBoxes(context) {
    const infoBoxes = {};
    infoBoxes.rollDetails = this._prepareRollDetailsBoxes(context);
    infoBoxes.properties = this._preparePropertiesBoxes(context);
    infoBoxes.spellLists = this._prepareSpellLists(context);
    infoBoxes.spellProperties = this._prepareSpellPropertiesBoxes(context);

    context.sheetData.infoBoxes = infoBoxes;
  }

  _prepareTypesAndSubtypes(context) {
    const item = this.item;
    const itemType = item.type;
    context.sheetData.fallbackType = getLabelFromKey(itemType, DC20RPG.allItemTypes);

    switch (itemType) {
      case "weapon": {
        context.sheetData.type = getLabelFromKey(item.system.weaponCategory, DC20RPG.weaponCategories);
        context.sheetData.subtype = getLabelFromKey(item.system.weaponType, DC20RPG.weaponTypes);
        break;
      }
      case "equipment": {
        context.sheetData.type = getLabelFromKey(item.system.equipmentType, DC20RPG.equipmentTypes);
        context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.inventoryTypes);
        break;
      }
      case "consumable": {
        context.sheetData.type = getLabelFromKey(item.system.consumableType, DC20RPG.consumableTypes);
        context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.inventoryTypes);
        break;
      }
      case "tool": {
        context.sheetData.type = getLabelFromKey(item.system.tradeSkillKey, DC20RPG.tradeSkills);
        context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.inventoryTypes);
        break;
      }
      case "feature": {
        context.sheetData.type = getLabelFromKey(item.system.featureType, DC20RPG.featureSourceTypes);
        context.sheetData.subtype = item.system.featureOrigin;
        break;
      }
      case "technique": {
        context.sheetData.type = getLabelFromKey(item.system.techniqueType, DC20RPG.techniqueTypes);
        context.sheetData.subtype = item.system.techniqueOrigin;
        break;
      }
      case "spell": {
        context.sheetData.type = getLabelFromKey(item.system.spellType, DC20RPG.spellTypes);
        context.sheetData.subtype = getLabelFromKey(item.system.magicSchool, DC20RPG.magicSchools);
        break;
      }
      case "class": {
        context.sheetData.type = getLabelFromKey(item.type, DC20RPG.allItemTypes);
        context.sheetData.subtype = "Level " + item.system.level;
        break;
      }
    }
  }

  _prepareRollDetailsBoxes(context) {
    const rollDetails = {};

    // Range
    const range = context.system.range;
    if(range && range.normal) {
      const unit = range.unit ? range.unit : "Spaces";
      const max = range.max ? `/${range.max}` : "";
      rollDetails.range = `${range.normal}${max} ${unit}`;
    }
    
    // Duration
    const duration = context.system.duration;
    if (duration && duration.type) {
      const value = duration.value ? duration.value : "";
      const type = getLabelFromKey(duration.type, DC20RPG.durations);
      const timeUnit = getLabelFromKey(duration.timeUnit, DC20RPG.timeUnits);

      if (duration.timeUnit) rollDetails.duration = `${type}<br> (${value} ${timeUnit})`;
      else rollDetails.duration = type;
    }

    // Target
    const target = context.system.target;
    if (target) {
      if (target.invidual) {
        if (target.type) {
          const targetType = getLabelFromKey(target.type, DC20RPG.invidualTargets);
          rollDetails.target = `${target.count} ${targetType}`;
        }
      } else {
        if (target.area) {
          const distance = target.area === "line" ? `${target.distance}/${target.width}` : target.distance;
          const arenaType = getLabelFromKey(target.area, DC20RPG.areaTypes);
          const unit = range.unit ? range.unit : "Spaces";
          rollDetails.target = `${distance} ${unit} ${arenaType}`;
        }
      }
    }

    // Tool info
    const tradeSkillKey = context.system.tradeSkillKey;
    if (tradeSkillKey) {
      const rollBonus = context.system.rollBonus ? context.system.rollBonus : 0;
      const tradeSkill = getLabelFromKey(tradeSkillKey, DC20RPG.tradeSkills);
      const sign = rollBonus >= 0 ? "+" : "-";
      rollDetails.tradeSkillBonus = `${tradeSkill} ${sign} ${Math.abs(rollBonus)}`;
    }

    return rollDetails;
  }

  _preparePropertiesBoxes(context) {
    const properties = {};
    const systemProperties = context.system.properties;
    
    if (!systemProperties) return properties;

    for (const [key, prop] of Object.entries(systemProperties)) {
      if (prop.active) {
        let label = getLabelFromKey(key, DC20RPG.properties);

        if (prop.value) {
          const value = prop.value !== null ? ` (${prop.value})` : "";
          label += value;
        }

        properties[key] = label;
      }
    }

    return properties;
  }

  _prepareSpellLists(context) {
    const properties = {};
    const spellLists = context.system.spellLists;

    if (!spellLists) return properties;

    for (const [key, prop] of Object.entries(spellLists)) {
      if (prop.active) {
        properties[key] = getLabelFromKey(key, DC20RPG.spellLists);
      }
    }

    return properties;
  }

  _prepareSpellPropertiesBoxes(context) {
    const properties = {};
    const spellComponents = context.system.components;

    if (!spellComponents) return properties;

    for (const [key, prop] of Object.entries(spellComponents)) {
      if (prop.active) {
        let label = getLabelFromKey(key, DC20RPG.components);

        if (key === "material") {
          const description = prop.description ? prop.description : "";
          const cost = prop.cost ? ` ${prop.cost} GP` : "";
          const consumed = prop.consumed ? " [Consumed On Use]" : "";
          label += `: ${description}${cost}${consumed}`;
        }

        properties[key] = label;
      }
    }

    return properties;
  }

  _prepareCustomCosts(context, actor) {
    if (!this.item.system.costs) return;

    const customResources = actor.system.resources.custom;
    const itemCustomCosts = this.item.system.costs.resources.custom;

    let customCosts = {};
    for (const [key, resource] of Object.entries(customResources)) {
      const cost = itemCustomCosts[key] ? itemCustomCosts[key] : null;

      const costWrapper = {
        name: resource.name,
        value: cost
      }
      customCosts[key] = costWrapper;
    }
    context.customCosts = customCosts;
  } 

  _prepareEnhancements(context) { // Custom resources will be added if needed
    const enhancements = this.item.system.enhancements;
    if (!enhancements) return;

    // We want to work on copy of enhancements because we will wrap its 
    // value and we dont want it to break other aspects
    const enhancementsCopy = foundry.utils.deepClone(enhancements); 
    context.enhancements = enhancementsCopy;
  }

  _prepareAdvancements(context) {
    const advancements = this.item.system.advancements;
    if (!advancements) return;
    
    // Split advancements depending on levels
    const advByLevel = {};

    Object.entries(advancements).forEach(([key, adv]) => {
      if (!advByLevel[adv.level]) advByLevel[adv.level] = {};
      advByLevel[adv.level][key] = adv;
    });

    context.advByLevel = advByLevel;
  }

  _prepareItemUsageCosts(context, actor) {
    context.usageCosts = getItemUsageCosts(this.item, actor);
  } 

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    if (item.system.isResource) this._addCustomResource(item);
   
  }

  _addCustomResource(item) {
    if (!this.item.system.costs.resources.custom) return;

    // Core Usage
    const itemResource = item.system.resource;
    const key = itemResource.resourceKey;
    const customResource = {
      name: itemResource.name,
      img: item.img,
      value: null
    };

    // Enhancements 
    const enhancements = this.item.system.enhancements;
    if (enhancements) {
      Object.keys(enhancements)
              .forEach(enhKey=> enhancements[enhKey].resources.custom[key] = customResource); 
    }

    const updateData = {
      system: {
        [`costs.resources.custom.${key}`]: customResource,
        enhancements: enhancements
      }
    }
    this.item.update(updateData);
  }


  _removeResourceFromItem(item, key) {
    const enhUpdateData = {};
    if (item.system.enhancements) {
      Object.keys(item.system.enhancements)
              .forEach(enhKey=> enhUpdateData[`enhancements.${enhKey}.resources.custom.-=${key}`] = null); 
    }

    const updateData = {
      system: {
        [`costs.resources.custom.-=${key}`]: null,
        ...enhUpdateData
      }
    }
    this.item.update(updateData);
  }
}