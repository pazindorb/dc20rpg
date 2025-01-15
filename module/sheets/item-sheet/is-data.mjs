import { getItemUsageCosts } from "../../helpers/actors/costManipulator.mjs";
import { getFormulaHtmlForCategory } from "../../helpers/items/itemRollFormulas.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";
import { DC20RPG } from "../../helpers/config.mjs";
import { getRollRequestHtmlForCategory } from "../../helpers/items/rollRequest.mjs";

export function duplicateItemData(context, item) {
  context.userIsGM = game.user.isGM;
  context.config = DC20RPG;
  context.system = item.system;
  context.flags = item.flags;

  context.itemsWithChargesIds = {};
  context.consumableItemsIds = {};
  context.weaponsOnActor = {};
  context.hasOwner = false;
  let actor = item.actor ?? null;
  if (actor) {
    context.hasOwner = true;
    const itemIds = actor.getOwnedItemsIds(item.id);
    context.itemsWithChargesIds = itemIds.withCharges;
    context.consumableItemsIds = itemIds.consumable;
    context.weaponsOnActor = itemIds.weapons;
  }
}

export function prepareItemData(context, item) {
  _prepareEnhancements(context);
  _prepareAdvancements(context);
  _prepareItemUsageCosts(context, item);
}

export function preprareSheetData(context, item) {
  context.sheetData = {};
  _prepareTypesAndSubtypes(context, item);
  _prepareDetailsBoxes(context, item);
  if (["weapon", "equipment", "consumable", "feature", "technique", "spell", "basicAction"].includes(item.type)) {
    _prepareActionInfo(context, item);
    _prepareFormulas(context, item);
  }
}

function _prepareDetailsBoxes(context, item) {
  const infoBoxes = {};
  infoBoxes.rollDetails = _prepareRollDetailsBoxes(context);
  infoBoxes.properties = _preparePropertiesBoxes(context);
  infoBoxes.spellLists = _prepareSpellLists(context);
  infoBoxes.spellProperties = _prepareSpellPropertiesBoxes(context);

  context.sheetData.infoBoxes = infoBoxes;
}

function _prepareRollDetailsBoxes(context) {
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
    const type = getLabelFromKey(duration.type, DC20RPG.DROPDOWN_DATA.durations);
    const timeUnit = getLabelFromKey(duration.timeUnit, DC20RPG.DROPDOWN_DATA.timeUnits);

    if (duration.timeUnit) rollDetails.duration = `${type}<br> (${value} ${timeUnit})`;
    else rollDetails.duration = type;
  }

  // Target
  const target = context.system.target;
  if (target) {
    if (target.invidual) {
      if (target.type) {
        const targetType = getLabelFromKey(target.type, DC20RPG.DROPDOWN_DATA.invidualTargets);
        rollDetails.target = `${target.count} ${targetType}`;
      }
    } else {
      if (target.area) {
        const distance = target.area === "line" ? `${target.distance}/${target.width}` : target.distance;
        const arenaType = getLabelFromKey(target.area, DC20RPG.DROPDOWN_DATA.areaTypes);
        const unit = range.unit ? range.unit : "Spaces";
        rollDetails.target = `${distance} ${unit} ${arenaType}`;
      }
    }
  }

  return rollDetails;
}

function _preparePropertiesBoxes(context) {
  const properties = {};
  const systemProperties = context.system.properties;
  
  if (!systemProperties) return properties;

  for (const [key, prop] of Object.entries(systemProperties)) {
    if (prop.active) {
      let label = getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.properties);

      if (prop.value) {
        const value = prop.value !== null ? ` (${prop.value})` : "";
        label += value;
      }

      properties[key] = label;
    }
  }

  return properties;
}

function _prepareSpellLists(context) {
  const properties = {};
  const spellLists = context.system.spellLists;

  if (!spellLists) return properties;

  for (const [key, prop] of Object.entries(spellLists)) {
    if (prop.active) {
      properties[key] = getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.spellLists);
    }
  }

  return properties;
}

function _prepareSpellPropertiesBoxes(context) {
  const properties = {};
  const spellComponents = context.system.components;

  if (!spellComponents) return properties;

  for (const [key, prop] of Object.entries(spellComponents)) {
    if (prop.active) {
      let label = getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.components);

      if (key === "material") {
        const description = prop.description ? prop.description : "";
        const cost = prop.cost ? ` (${prop.cost} GP)` : "";
        const consumed = prop.consumed ? " [Consumed]" : "";
        label += `: ${description}${cost}${consumed}`;
      }

      properties[key] = label;
    }
  }

  return properties;
}

function _prepareEnhancements(context) {
  const enhancements = context.system.enhancements;
  if (!enhancements) return;

  // We want to work on copy of enhancements because we will wrap its 
  // value and we dont want it to break other aspects
  const enhancementsCopy = foundry.utils.deepClone(enhancements); 
  context.enhancements = enhancementsCopy;
}

function _prepareAdvancements(context) {
  const advancements = context.system.advancements;
  if (!advancements) return;
  
  // Split advancements depending on levels
  const advByLevel = {};

  Object.entries(advancements).forEach(([key, adv]) => {
    if (!advByLevel[adv.level]) advByLevel[adv.level] = {};
    advByLevel[adv.level][key] = adv;
  });

  context.advByLevel = advByLevel;
}

function _prepareItemUsageCosts(context, item) {
  context.usageCosts = getItemUsageCosts(item);
} 

function _prepareTypesAndSubtypes(context, item) {
  const itemType = item.type;
  context.sheetData.fallbackType = getLabelFromKey(itemType, DC20RPG.DROPDOWN_DATA.allItemTypes);

  switch (itemType) {
    case "weapon": {
      context.sheetData.type = getLabelFromKey(item.system.weaponStyle, DC20RPG.DROPDOWN_DATA.weaponStyles);
      context.sheetData.subtype = getLabelFromKey(item.system.weaponType, DC20RPG.DROPDOWN_DATA.weaponTypes);
      break;
    }
    case "equipment": {
      context.sheetData.type = getLabelFromKey(item.system.equipmentType, DC20RPG.DROPDOWN_DATA.equipmentTypes);
      context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.DROPDOWN_DATA.inventoryTypes);
      break;
    }
    case "consumable": {
      context.sheetData.type = getLabelFromKey(item.system.consumableType, DC20RPG.DROPDOWN_DATA.consumableTypes);
      context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.DROPDOWN_DATA.inventoryTypes);
      break;
    }
    case "feature": {
      context.sheetData.type = getLabelFromKey(item.system.featureType, DC20RPG.DROPDOWN_DATA.featureSourceTypes);
      context.sheetData.subtype = item.system.featureOrigin;
      break;
    }
    case "technique": {
      context.sheetData.type = getLabelFromKey(item.system.techniqueType, DC20RPG.DROPDOWN_DATA.techniqueTypes);
      context.sheetData.subtype = item.system.techniqueOrigin;
      break;
    }
    case "spell": {
      context.sheetData.type = getLabelFromKey(item.system.spellType, DC20RPG.DROPDOWN_DATA.spellTypes);
      context.sheetData.subtype = getLabelFromKey(item.system.magicSchool, DC20RPG.DROPDOWN_DATA.magicSchools);
      break;
    }
    case "basicAction": {
      context.sheetData.type = game.i18n.localize("dc20rpg.item.sheet.header.action");
      context.sheetData.subtype = getLabelFromKey(item.system.category, DC20RPG.DROPDOWN_DATA.basicActionsCategories);
      break;
    }
    case "class": {
      const isMartial = item.system.martial;  
      const isSpellcaster = item.system.spellcaster;
      let classType = '';
      if (isMartial && isSpellcaster) classType = getLabelFromKey("hybrid", DC20RPG.TRANSLATION_LABELS.classTypes);
      else if (isMartial) classType = getLabelFromKey("martial", DC20RPG.TRANSLATION_LABELS.classTypes);
      else if (isSpellcaster) classType = getLabelFromKey("spellcaster", DC20RPG.TRANSLATION_LABELS.classTypes);
      
      context.sheetData.subtype = getLabelFromKey(item.type, DC20RPG.DROPDOWN_DATA.allItemTypes);
      context.sheetData.type = classType;
      break;
    }
  }
}

function _prepareActionInfo(context, item) {
  context.sheetData.damageFormula = getFormulaHtmlForCategory("damage", item);
  context.sheetData.healingFormula = getFormulaHtmlForCategory("healing", item);
  context.sheetData.otherFormula = getFormulaHtmlForCategory("other", item);
  context.sheetData.saves = getRollRequestHtmlForCategory("save", item);
  context.sheetData.contests = getRollRequestHtmlForCategory("contest", item);
}

function _prepareFormulas(context) {
  const damage = {}
  const healing = {};
  const other = {};

  Object.entries(context.system.formulas).forEach(([key, formula]) => {
    switch (formula.category) {
      case "damage": 
        formula.types = DC20RPG.DROPDOWN_DATA.damageTypes;
        damage[key] = formula; 
        break;
      case "healing": 
        formula.types = DC20RPG.DROPDOWN_DATA.healingTypes;
        healing[key] = formula; 
        break;
      case "other": 
        other[key] = formula; 
        break;
    }
  })
  context.formulas = [damage, healing, other];
}