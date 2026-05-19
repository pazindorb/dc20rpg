import { itemDetailsToHtml } from "../item-sheet/item-sheet-details.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";

export function duplicateItemData(context, item) {
  context.name = item.name;
  context.img = item.img;
  context.type = item.type;
  
  context.system = foundry.utils.deepClone(item.system);
  context.flags = foundry.utils.deepClone(item.flags);
  context.properties = foundry.utils.deepClone(item.properties);
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
  // Equipment Type
  // Consumable Type

  // Equipment Slot
  if (["weapon", "equipment", "consumable", "loot"].includes(item.type)) {
    const slot = item.system.statuses.slotLink.predefined;
    if (slot) quickDetail.push(`Equipment Slot: ${slot}`)
  }

  // Maneuver Type?
  // Use Weapon as part of the attack?

  // Feature Source (Class - jaka, Talent, Ancestry, etc (Jeśli inner fature to text z Feature Origin przepisac))
  
  // Class Type (Martial, Spellcaster, Hybrid)
  // Subclass Source (z jakiej klasy)

  context.quickDetail = quickDetail.join(", ");
}

function _prepareTypesAndSubtypes(context, item) {
  const itemType = item.type;
  context.sheetData.fallbackType = getLabelFromKey(itemType, CONFIG.DC20RPG.DROPDOWN_DATA.allItemTypes);

  switch (itemType) {
    case "weapon": {
      context.sheetData.type = getLabelFromKey(item.system.weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles);
      context.sheetData.subtype = getLabelFromKey(item.system.weaponType, CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes);
      break;
    }
    case "equipment": {
      context.sheetData.type = getLabelFromKey(item.system.equipmentType, CONFIG.DC20RPG.DROPDOWN_DATA.equipmentTypes);
      context.sheetData.subtype = getLabelFromKey(item.system.statuses.slotLink.predefined, CONFIG.DC20RPG.DROPDOWN_DATA.equipmentSlots) || "?";
      break;
    }
    case "spellFocus": {
      context.sheetData.type = "";
      context.sheetData.subtype = game.i18n.localize("TYPES.Item.spellFocus");
    }
    case "consumable": {
      context.sheetData.type = getLabelFromKey(item.system.consumableType, CONFIG.DC20RPG.DROPDOWN_DATA.consumableTypes);
      context.sheetData.subtype = getLabelFromKey(item.type, CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes);
      break;
    }
    case "feature": {
      context.sheetData.type = getLabelFromKey(item.system.featureType, CONFIG.DC20RPG.DROPDOWN_DATA.featureSourceTypes);
      context.sheetData.subtype = item.system.featureOrigin;
      break;
    }
    case "maneuver": {
      context.sheetData.type = getLabelFromKey(item.system.maneuverType, CONFIG.DC20RPG.DROPDOWN_DATA.maneuverTypes);
      context.sheetData.subtype = game.i18n.localize("TYPES.Item.maneuver");
      break;
    }
    case "spell": {
      context.sheetData.type = getLabelFromKey(item.system.spellType, CONFIG.DC20RPG.DROPDOWN_DATA.spellTypes);
      context.sheetData.subtype = getLabelFromKey(item.system.spellSchool, CONFIG.DC20RPG.DROPDOWN_DATA.spellSchools);
      break;
    }
    case "infusion": {
      const infusion = item.system.infusion;
      context.sheetData.type = getLabelFromKey(itemType, CONFIG.DC20RPG.DROPDOWN_DATA.allItemTypes);
      context.sheetData.subtype = `${game.i18n.localize("dc20rpg.item.sheet.infusions.power")}: ${infusion.variablePower ? "?" : infusion.power}`;
      break;
    }
    case "basicAction": {
      context.sheetData.type = game.i18n.localize("dc20rpg.item.sheet.header.action");
      context.sheetData.subtype = getLabelFromKey(item.system.category, CONFIG.DC20RPG.DROPDOWN_DATA.basicActionsCategories);
      break;
    }
    case "subclass": {
      context.sheetData.type = game.i18n.localize("TYPES.Item.subclass");
      context.sheetData.subtype = item.system.forClass.name;
      break;
    }
    case "class": {
      const isMartial = item.system.martial;  
      const isSpellcaster = item.system.spellcaster;
      let classType = '';
      if (isMartial && isSpellcaster) classType = getLabelFromKey("hybrid", CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes);
      else if (isMartial) classType = getLabelFromKey("martial", CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes);
      else if (isSpellcaster) classType = getLabelFromKey("spellcaster", CONFIG.DC20RPG.TRANSLATION_LABELS.classTypes);
      
      context.sheetData.subtype = getLabelFromKey(item.type, CONFIG.DC20RPG.DROPDOWN_DATA.allItemTypes);
      context.sheetData.type = classType;
      break;
    }
  }
}

function _prepareDropdownData(context, item) {
  if (item.type === "feature") {
    const options = CONFIG.DC20RPG.UNIQUE_ITEM_IDS[item.system.featureType];
    context.featureSourceItems = options || null;
  }
}