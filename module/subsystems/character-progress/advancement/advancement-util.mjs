import { createItemOnActor } from "../../../helpers/actors/itemsOnActor.mjs";
import { createNewAdvancement, removeItemsFromActor, removeMulticlassInfoFromActor } from "./advancements.mjs";
import { clearOverridenScalingValue, overrideScalingValue } from "../../../helpers/items/scalingItems.mjs";
import { generateKey } from "../../../helpers/utils.mjs";
import { getSimplePopup, SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { validateUserOwnership } from "../../../helpers/compendiumPacks.mjs";

export function canApplyAdvancement(advancement) {
  if (advancement.mustChoose && advancement.pointsLeft !== 0) {
    ui.notifications.error(`Spend correct amount of Choice Points! Points Left: ${advancement.pointsLeft}`); 
    return false;
  }
  if (advancement.progressPath && !advancement.mastery) {
    ui.notifications.error("Choose Spellcaster or Martial Path Progression!");
    return false;
  }
  return true;
}

export async function applyAdvancement(advancement, actor) {
  let selectedItems = advancement.items;
  if (advancement.mustChoose) selectedItems = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));

  const extraAdvancements = await _addItemsToActor(selectedItems, actor, advancement);
  
  // Check for Martial Expansion that comes from the class, Martial Path or some other items
  const martialExpansion = _checkMartialExpansion(advancement, actor);
  if (martialExpansion) extraAdvancements.set("martialExpansion", martialExpansion);
  
  if (advancement.repeatable) await _addRepeatableAdvancement(advancement);
  if (advancement.progressPath) await _applyPathProgression(advancement, extraAdvancements);

  await _markAdvancementAsApplied(advancement, actor);
  if (advancement.addItemsOptions?.talentFilter) await _fillMulticlassInfo(advancement, actor, extraAdvancements);
  return extraAdvancements.values();
}

export async function addAdditionalAdvancement(advancement, item, collection, index) {
  advancement.additionalAdvancement = true;

  // Add to advancements
  if (index !== undefined) collection.splice(index, 0, advancement);
  else collection.push(advancement);

  // Update the item itself
  await item.update({[`system.advancements.${advancement.key}`]: advancement});
}

export async function addNewSpellTechniqueAdvancements(actor, item, collection, level) {
  const addedAdvancements = [];
  for (const [key, known] of Object.entries(actor.system.known)) {
    const newKnownAmount = known.max - known.current;
    if (newKnownAmount > 0) {
      const advancement = createNewAdvancement();
      advancement.name = game.i18n.localize(`dc20rpg.known.${key}`);
      advancement.allowToAddItems = true;
      advancement.customTitle = `You gain new ${advancement.name} (${newKnownAmount})`;
      advancement.level = level;
      advancement.addItemsOptions = {
        helpText: `Add ${advancement.name}`,
        itemLimit: newKnownAmount
      };
      advancement.img = CONFIG.DC20RPG.ICONS[key];
      advancement.parentItem = item;
      advancement.known = true;
      advancement.key = generateKey();
      _prepareCompendiumFilters(advancement, key);
      await addAdditionalAdvancement(advancement, item, collection);
      addedAdvancements.push(advancement);
    }
  }
  return addedAdvancements;
}

export async function shouldLearnNewSpellsOrTechniques(actor) {
  const shouldLearn = [];
  actor = await refreshActor(actor);
  for (const [key, known] of Object.entries(actor.system.known)) {
    if (known.max - known.current > 0) shouldLearn.push(key);
  }
  return shouldLearn;
}

async function _applyPathProgression(advancement, extraAdvancements) {
  const parentItem = advancement.parentItem;
  const index = advancement.level -1;
  switch(advancement.mastery) {
    case "martial":
      const numberOfMartialPaths = overrideScalingValue(parentItem, index, "martial"); 
      if (numberOfMartialPaths === 2 && !parentItem.system.martial) {
        const expansion = _getSpellcasterStaminaAdvancement();
        expansion.level = advancement.level;
        expansion.key = "spellcasterStamina";
        expansion.parentItem = advancement.parentItem;
        extraAdvancements.set(expansion.key, expansion);
      }
      break;

    case "spellcaster":
      overrideScalingValue(parentItem, index, "spellcaster"); 
      break;
  }
}

async function _addItemsToActor(items, actor, advancement) {
  const extraAdvancements = new Map();
  const parentItem = advancement.parentItem;

  for (const [key, record] of Object.entries(items)) {
    const item = await fromUuid(record.uuid);
    const created = await createItemOnActor(actor, item);

    // Check if has extra advancements
    const extraAdvancement = _extraAdvancement(created);
    if (extraAdvancement) {
      extraAdvancement.level = advancement.level;
      extraAdvancement.parentItem = parentItem;
      extraAdvancement.createdBy = advancement.key;
      extraAdvancements.set(extraAdvancement.key, extraAdvancement);
    }

    const martialExpansion = _martialExpansion(created, actor, parentItem);
    if (martialExpansion) {
      martialExpansion.level = advancement.level;
      martialExpansion.parentItem = parentItem;
      martialExpansion.createdBy = advancement.key;
      extraAdvancements.set(martialExpansion.key, martialExpansion);
    }

    // Add created id to advancement record
    if (record.ignoreKnown) created.update({["system.knownLimit"]: false});
    record.createdItemId = created._id;
    advancement.items[key] = record;
  }
  return extraAdvancements;
}

async function _markAdvancementAsApplied(advancement, actor) {
  advancement.applied = true;
  advancement.featureSourceItem = ""; // clear filter
  advancement.hideRequirementMissing = false; // clear filter
  advancement.hideOwned = true; // clear filter
  advancement.itemNameFilter = "" // clear filter

  // We dont want to persist parent item within the advancement
  const parentItem = advancement.parentItem;
  delete advancement.parentItem; 
  await parentItem.update({[`system.advancements.${advancement.key}`]: advancement})
  advancement.parentItem = parentItem;

  if (advancement.key === "martialExpansion") await actor.update({["system.details.martialExpansionProvided"]: true});
}

function _extraAdvancement(item) {
  // Additional Advancement
  if (item.system.hasAdvancement) {
    const additional = item.system.advancements.default;
    additional.key = generateKey();
    additional.img = item.img;
    return additional;
  }
  return null;
}

function _martialExpansion(item, actor, parentItem) {
  // Martial Expansion
  if (item.system.provideMartialExpansion && !actor.system.details.martialExpansionProvided && !parentItem.martialExpansionProvided) {
    const expansion = _getMartialExpansionAdvancement();
    expansion.key = "martialExpansion";
    expansion.parentItem = parentItem;
    parentItem.martialExpansionProvided = true;
    return expansion;
  }
  return null;
}

function _checkMartialExpansion(advancement, actor) {
  const parentItem = advancement.parentItem;
  if (actor.system.details.martialExpansionProvided || parentItem.martialExpansionProvided) return null;

  const fromItem = parentItem.system.martialExpansion;
  const fromMartialPath = advancement.progressPath && advancement.mastery === "martial";
  if (fromItem || fromMartialPath) {
    const expansion = _getMartialExpansionAdvancement();
    expansion.level = advancement.level;
    expansion.key = "martialExpansion";
    expansion.parentItem = parentItem;
    expansion.createdBy = advancement.key;
    parentItem.martialExpansionProvided = true;
    return expansion;
  }
  return null;
}

async function _addRepeatableAdvancement(oldAdv) {
  let nextLevel = null;
  // Collect next level where advancement should appear
  for (let i = oldAdv.level + 1; i <= 20; i++) {
    const choicePoints = oldAdv.repeatAt[i];
    if (choicePoints > 0) {
      nextLevel = {
        level: i,
        pointAmount: choicePoints
      }
      break;
    }
  }
  if (nextLevel === null) return;

  // If next level advancement was already created before we want to replace it, if not we will create new one
  const advKey = oldAdv.cloneKey || generateKey();
  const newAdv = foundry.utils.deepClone(oldAdv);
  newAdv.pointAmount = nextLevel.pointAmount;
  newAdv.level = nextLevel.level;
  newAdv.additionalAdvancement = false;
  newAdv.cloneKey = null;

  // Remove already added items
  const filteredItems = Object.fromEntries(
    Object.entries(newAdv.items).filter(([key, item]) => !item.selected)
  );

  oldAdv.cloneKey = advKey;
  newAdv.items = filteredItems;

  const parentItem = oldAdv.parentItem;
  // We want to clear item list before we add new ones
  if(oldAdv.cloneKey) await parentItem.update({[`system.advancements.${advKey}.-=items`]: null});
  await parentItem.update({
    [`system.advancements.${advKey}`]: newAdv,
    [`system.advancements.${oldAdv.key}`]: oldAdv,
  });
}

function _getMartialExpansionAdvancement() {
  const martialExpansion = fromUuidSync(CONFIG.DC20RPG.SYSTEM_CONSTANTS.martialExpansion);
  if (!martialExpansion) {
    ui.notifications.warn("Martial Expansion Item cannot be found")
    return;
  }
  const advancement = Object.values(martialExpansion.system.advancements)[0];
  advancement.customTitle = advancement.name;
  advancement.img = CONFIG.DC20RPG.ICONS["martialExpansion"];
  return advancement;
}

function _getSpellcasterStaminaAdvancement() {
  const spellcasterStamina = fromUuidSync(CONFIG.DC20RPG.SYSTEM_CONSTANTS.spellcasterStamina);
  if (!spellcasterStamina) {
    ui.notifications.warn("Spellcaster Stamina Expansion Item cannot be found")
    return;
  }
  const advancement = Object.values(spellcasterStamina.system.advancements)[0];
  advancement.customTitle = advancement.name;
  advancement.img = spellcasterStamina.img;
  return advancement;
}

function _prepareCompendiumFilters(advancement, key) {
  switch(key) {
    case "cantrips":
      advancement.addItemsOptions.itemType = "spell";
      advancement.addItemsOptions.preFilters = '{"spellType": "cantrip"}'
      break;
    case "spells":
      advancement.addItemsOptions.itemType = "spell";
      advancement.addItemsOptions.preFilters = '{"spellType": "spell"}'
      break;
    case "maneuvers":
      advancement.addItemsOptions.itemType = "technique";
      advancement.addItemsOptions.preFilters = '{"techniqueType": "maneuver"}'
      break;
    case "techniques":
      advancement.addItemsOptions.itemType = "technique";
      advancement.addItemsOptions.preFilters = '{"techniqueType": "technique"}'
      break;
  }
}

async function _fillMulticlassInfo(advancement, actor, extraAdvancements) {
  if (advancement.talentFilterType === "general" || advancement.talentFilterType === "class") return;

  const multiclass = await _findSelectedMulticlassOption(advancement, actor);
  const clazz = actor.class;
  if (multiclass && clazz) {
    if (_shouldAddFlavorFeature(multiclass, clazz.system.multiclass)) {
      await _addFlavorFeatureAdvancement(multiclass, extraAdvancements, advancement);
    }
    await clazz.update({[`system.multiclass.${advancement.key}`]: multiclass.source});
  }
}

async function _findSelectedMulticlassOption(advancement, actor) {
  const multiclassOptions = [];
  Object.values(advancement.items).forEach(itm => {
    if (itm.removable) { // Possible multiclass candidate
      const item = actor.items.get(itm.createdItemId);
      const source = item.system.featureSourceItem;
      const type = item.system.featureType;
      const name = CONFIG.DC20RPG.UNIQUE_ITEM_IDS[type][source];
      multiclassOptions.push({
        source: source,
        type: type,
        name: name
      })
    }
  })

  if (multiclassOptions.length === 0) {
    ui.notifications.error("Cannot recognize Multiclass Talent source - skipped");
    return null;
  }
  if (multiclassOptions.length > 1) {
    const options = {};
    multiclassOptions.forEach(multiclass => options[multiclass.source] = multiclass.name);
    const selected = await getSimplePopup("select", {header: "What Class/Subclass is that Multiclass Talent from?", selectOptions: options});
    return multiclassOptions.find(multiclass => multiclass.source === selected);
  }
  return multiclassOptions[0];
}

function _shouldAddFlavorFeature(multiclass, multiclassTalents) {
  const talents = Object.values(multiclassTalents);
  const sameMulticlass = talents.filter(talent => talent === multiclass.source);

  if (multiclass.type === "subclass") return sameMulticlass.length === 0; 
  if (multiclass.type === "class") return sameMulticlass.length === 1; 
  return false;
}

async function _addFlavorFeatureAdvancement(multiclass, extraAdvancements, advancement) {
  let img = "icons/magic/defensive/shield-barrier-blades-teal.webp";
  const flavorFeatures = {};
  for (const pack of game.packs) {
    if (pack.documentName === "Item") {
      const items = await pack.getDocuments();
      items.filter(item => item.type === "feature")
            .filter(item => item.system.flavorFeature)
            .filter(item => item.system.featureSourceItem === multiclass.source)
            .forEach(item => {
              img = item.img;
              flavorFeatures[item.id] = {
                createdItemId: "",
                description: item.system.description,
                img: item.img,
                mandatory: false,
                name: item.name,
                pointValue: 1,
                selected: Object.values(flavorFeatures).length === 0,
                uuid: item.uuid,
              }
            });
    }
  }
  if (Object.values(flavorFeatures).length === 0) return;

  const label = `${multiclass.name} - Flavor Feature`;
  const key = generateKey();
  extraAdvancements.set(key, {
    img: img,
    name: label,
    customTitle: label,
    mustChoose: true,
    pointAmount: 1,
    level: advancement.level,
    parentItem: advancement.parentItem,
    createdBy: advancement.key,
    applied: false,
    talent: false,
    repeatable: false,
    repeatAt: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    allowToAddItems: false,
    additionalAdvancement: true,
    compendium: "",
    preFilters: "",
    tip: "",
    items: flavorFeatures
  });
}

export function markItemRequirements(items, talentFilterType, actor) {
  for (const item of items) {
    const requirements = item.system.requirements;
    let requirementMissing = "";

    // Required Level
    const actorLevel = actor.system.details.level;
    if (requirements.level > actorLevel) {
      requirementMissing += `Required Level: ${requirements.level}`;
    }

    // Required Item
    if (requirements.items) {
      const itemNames = requirements.items.split(',');
      for (const name of itemNames) {
        if (actor.items.filter(item => item.name === name).length === 0) {
          if (requirementMissing !== "") requirementMissing += "\n"; 
          requirementMissing += `Missing Required Item: ${name}`;
        }
      }
    }

    const baseClassKey = actor.system.details.class.classKey;
    const multiclass = actor.class !== undefined ? Object.values(actor.class.system.multiclass) : [];
    // Subclass 3rd level feature requires at least one feature from Class or needs to be from your class
    if (["expert", "master", "grandmaster", "legendary"].includes(talentFilterType)) {
      if (item.system.featureType === "subclass" && requirements.level === 3) {
        const subclassKey = item.system.featureSourceItem;
        const classKey = CONFIG.DC20RPG.SUBCLASS_CLASS_LINK[subclassKey];
        if (!multiclass.find(key => key === classKey) && classKey !== baseClassKey) {
          const className = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class[classKey];
          if (requirementMissing !== "") requirementMissing += "\n"; 
          requirementMissing += `Requires at least one talent from ${className} Class`;
        }
      }
    }
    // Subclass 6th level feature requires at least one feature from that Subclass 
    if (["master", "grandmaster", "legendary"].includes(talentFilterType)) {
      if (item.system.featureType === "subclass" && requirements.level === 6) {
        const subclassKey = item.system.featureSourceItem;
        if (!multiclass.find(key => key === subclassKey)) {
          const subclassName = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.subclass[subclassKey];
          if (requirementMissing !== "") requirementMissing += "\n"; 
          requirementMissing += `Requires at least one talent from ${subclassName} Subclass`;
        }
      }
    }
    // Class Capstone 8th level feature requires at least two features from that Class 
    if (["grandmaster", "legendary"].includes(talentFilterType)) {
      if (item.system.featureType === "class" && requirements.level === 8) {
        const classKey = item.system.featureSourceItem;
        if (multiclass.filter(key => key === classKey).length < 2) {
          const className = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class[classKey];
          if (requirementMissing !== "") requirementMissing += "\n"; 
          requirementMissing += `Requires at least two talents from ${className} Class`;
        }
      }
    }
    // Subclass Capstone 9th level feature requires at least two features from that Subclass 
    if (["legendary"].includes(talentFilterType)) {
      if (item.system.featureType === "subclass" && requirements.level === 9) {
        const subclassKey = item.system.featureSourceItem;
        if (multiclass.filter(key => key === subclassKey).length < 2) {
          const subclassName = CONFIG.DC20RPG.UNIQUE_ITEM_IDS.subclass[subclassKey];
          if (requirementMissing !== "") requirementMissing += "\n"; 
          requirementMissing += `Requires at least two talents from ${subclassName} Subclass`;
        }
      }
    }
    if (requirementMissing) item.requirementMissing = requirementMissing;
  }
}

export async function collectScalingValues(actor, oldSystemData) {
  await refreshActor(actor);
  const scalingValues = [];

  const resources = actor.system.resources;
  const oldResources = oldSystemData.resources;
  
  // Go over core resources and collect changes
  Object.entries(resources).forEach(([key, resource]) => {
    if (key === "custom") {}
    else if (resource.max !== oldResources[key].max) {
      scalingValues.push({
        resourceKey: key,
        label: game.i18n.localize(`dc20rpg.resource.${key}`),
        previous: oldResources[key].max,
        current: resource.max
      });
    }
  });

  // Go over custom resources
  Object.entries(resources.custom).forEach(([key, custom]) => {    
    if (custom.max !== oldResources.custom[key]?.max) {
      scalingValues.push({
        resourceKey: key,
        custom: true,
        label: custom.name,
        previous: oldResources.custom[key]?.max || 0,
        current: custom.max
      });
    }
  });
  return scalingValues;
}

export async function refreshActor(actor) {
  const counter = actor.flags.dc20rpg.advancementCounter + 1;
  return await actor.update({[`flags.dc20rpg.advancementCounter`]: counter});
}

export async function collectSubclassesForClass(classKey) {
  const dialog =  new SimplePopup("non-closable", {header: "Collecting Subclasses", message: "Collecting Subclasses... Please wait it might take a while"}, {title: "Collecting Subclasses"});
  await dialog._render(true);

  const matching = [];
  for (const pack of game.packs) {
    if (!validateUserOwnership(pack)) continue;

    if (pack.documentName === "Item") {
      const items = await pack.getDocuments();
      items.filter(item => item.type === "subclass")
            .filter(item => item.system.forClass.classSpecialId === classKey)
            .forEach(item => matching.push(item))
    }
  }
  
  dialog.close();
  return matching;
}

export async function revertAdvancement(actor, advancement, collection) {
  if (advancement.progressPath) clearOverridenScalingValue(advancement.parentItem, advancement.level - 1);
  await removeItemsFromActor(actor, advancement.items);
  await removeMulticlassInfoFromActor(actor, advancement.key);

  // Mark Advancement as not applied
  advancement.applied = false;
  await advancement.parentItem.update({[`system.advancements.${advancement.key}.applied`]: false});

  const advancementsToDelete = collection.filter(adv => adv.createdBy === advancement.key);
  for (const adv of advancementsToDelete) {
    await removeAdvancement(actor, adv, collection);
  }
}

export async function removeAdvancement(actor, advancement, collection) {
  // Remove from Array
  const index = collection.findIndex(adv => adv.key === advancement.key);
  if (index === -1) return;
  collection.splice(index, 1);

  // Remove from DB
  if (advancement.key === "martialExpansion") {
    await actor.update({["system.details.martialExpansionProvided"]: false});
    advancement.parentItem.martialExpansionProvided = false;
  }
  await advancement.parentItem.update({[`system.advancements.-=${advancement.key}`]: null});
}
