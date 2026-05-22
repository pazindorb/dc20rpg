import { itemDetailsToHtml } from "../item-sheet/item-sheet-details.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";

export function duplicateItemData(context, item) {
  context.name = item.name;
  context.img = item.img;
  context.type = item.type;
  
  context.system = foundry.utils.deepClone(item.system);
  context.flags = foundry.utils.deepClone(item.flags);
  if (["weapon", "equipment", "spellFocus"].includes(item.type)) {
    context.properties = foundry.utils.deepClone(item.properties);
  }
  context.config = foundry.utils.deepClone(CONFIG.DC20RPG);

  context.hasOwner = !!item.actor;
  context.userIsGM = game.user.isGM;
  context.hasRollConfig = ["check", "attack"].includes(item.system.actionType);
}

export function prepareItemData(context, item) {
  _prepareEnhancements(context);
  _prepareAdvancements(context);
  _prepareItemUsageCosts(context, item);
  _prepareQuickDetail(context, item);
  _prepareDropdownData(context, item);
}

export function preprareSheetData(context, item) {
  context.sheetData = {
    infoBoxes: itemDetailsToHtml(item)
  };
  // TODO: Configure poperty cost in the item (set default when changin between melee and ranged weapon?)
}

export function prepareContainer(item, context) {
  const tables = {
    weapon: {label: "Weapons", items: {}},
    equipment: {label: "Equipment", items: {}},
    consumable: {label: "Consumables", items: {}},
    container: {label: "Containers", items: {}},
    loot: {label: "Loot", items: {}},
    feature: {label: "Features", items: {}},
    maneuver: {label: "Maneuvers", items: {}},
    spell: {label: "Spells", items: {}},
    other: {label: "Others", items: {}},
  };

  Object.entries(item.system.contents).forEach(([key, item]) => {
    let tableKey = item.type;
    if (!tables[tableKey]) tableKey = "other"
    tables[tableKey].items[key] = item;
    tables[tableKey].notEmpty = true;
  });
  context.tables = tables;
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
  if (!item.use) return;
  context.useCost = item.use.useCostDisplayData(true);
} 

function _prepareQuickDetail(context, item) {
  const quickDetail = [];

  // Weapon Melee/Ranged
  if (item.type === "weapon") {
    const label = `${getLabelFromKey(item.system.weaponType, CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes)} ${getLabelFromKey(item.system.weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)}`;
    quickDetail.push(label);
  }

  // Equipment Type
  if (item.type === "equipment") {
    quickDetail.push(getLabelFromKey(item.system.equipmentType, CONFIG.DC20RPG.DROPDOWN_DATA.equipmentTypes));
  } 

  // Consumable Type
  if (item.type === "consumable") {
    quickDetail.push(getLabelFromKey(item.system.consumableType, CONFIG.DC20RPG.DROPDOWN_DATA.consumableTypes));
  } 

  // Equipment Slot
  if (["weapon", "equipment", "spellFocus", "consumable", "loot"].includes(item.type)) {
    const slot = item.system.statuses.slotLink.predefined;
    if (slot) {
      const label = CONFIG.DC20RPG.DROPDOWN_DATA.equipmentSlots[slot];
      quickDetail.push(`Equipment Slot: ${label}`)
    }
  }

  // Maneuver Type
  if (item.type === "maneuver") {
    const label = `${getLabelFromKey(item.system.maneuverType, CONFIG.DC20RPG.DROPDOWN_DATA.maneuverTypes)} ${game.i18n.localize("TYPES.Item.maneuver")}`;
    quickDetail.push(label);
  }

  // Spell Type
  if (item.type === "spell") {
    if (item.system.spellType === "ritual") {
      quickDetail.push(getLabelFromKey(item.system.spellType, CONFIG.DC20RPG.DROPDOWN_DATA.spellTypes))
    }
    quickDetail.push(`Spell School: ${getLabelFromKey(item.system.spellSchool, CONFIG.DC20RPG.DROPDOWN_DATA.spellSchools)}`);
  }

  // Feature Source
  if (item.type === "feature" && item.system.featureType) {
    const label = `${getLabelFromKey(item.system.featureType, CONFIG.DC20RPG.DROPDOWN_DATA.featureSourceTypes)}: ${item.system.featureOrigin}`;
    quickDetail.push(label);
  }

  // Basic Action
  if (item.type === "basicAction") {
    quickDetail.push(`Category: ${getLabelFromKey(item.system.category, CONFIG.DC20RPG.DROPDOWN_DATA.basicActionsCategories)}`);
  }
  
  // Class Type (Martial, Spellcaster, Hybrid)
  if (item.type === "class") {
    const isMartial = item.system.martial;  
    const isSpellcaster = item.system.spellcaster;
    let classType = '';
    if (isMartial && isSpellcaster) classType = CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes["hybrid"];
    else if (isMartial) classType = CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes["martial"];
    else if (isSpellcaster) classType = CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes["spellcaster"];
    quickDetail.push(classType);
  }

  // Subclass Source (z jakiej klasy)
  if (item.type === "subclass") {
    quickDetail.push(`Class: ${item.system.forClass.name}`);
  }

  context.quickDetail = quickDetail.join(", ");
}

function _prepareDropdownData(context, item) {
  if (item.type === "feature") {
    const options = CONFIG.DC20RPG.UNIQUE_ITEM_IDS[item.system.featureType];
    context.featureSourceItems = options || null;
  }
}