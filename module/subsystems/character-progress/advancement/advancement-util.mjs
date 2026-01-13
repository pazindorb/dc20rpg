import { createItemOnActor } from "../../../helpers/actors/itemsOnActor.mjs";
import { createNewAdvancement, removeItemsFromActor, removeMulticlassInfoFromActor } from "./advancements.mjs";
import { clearOverridenScalingValue, overrideScalingValue } from "../../../helpers/items/scalingItems.mjs";
import { generateKey } from "../../../helpers/utils.mjs";
import { SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { validateUserOwnership } from "../../../helpers/compendiumPacks.mjs";
import { runTemporaryMacro } from "../../../helpers/macros.mjs";

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

export async function applyAdvancement(advancement, actor, talentType) {
  let selectedItems = advancement.items;
  if (advancement.mustChoose) selectedItems = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));

  const [extraAdvancements, tips] = await _addItemsToActor(selectedItems, actor, advancement);
  if (advancement.repeatable) await _addRepeatableAdvancement(advancement);
  if (advancement.progressPath) await _applyPathProgression(advancement, extraAdvancements, actor);

  await _markAdvancementAsApplied(advancement, actor);
  if (advancement.talent) await _fillMulticlassInfo(advancement, actor, extraAdvancements, talentType);
  return [extraAdvancements.values(), tips];
}

export async function addAdditionalAdvancement(advancement, item, collection, index) {
  advancement.additionalAdvancement = true;

  // Add to advancements
  if (index !== undefined) collection.splice(index, 0, advancement);
  else collection.push(advancement);

  // Update the item itself
  await updateAdvancement(item, advancement);
}

export async function addNewSpellTechniqueAdvancements(actor, item, collection, level) {
  const infuser = actor.system.details.infuser;
  const addedAdvancements = [];
  for (const [key, known] of Object.entries(actor.system.known)) {
    const newKnownAmount = known.max - known.current;
    if (newKnownAmount > 0) {
      if (infuser && key === "spells") {
        const answer = await SimplePopup.input(`Do you want to learn infusion instead of spell? If so, how many (Max ${newKnownAmount}).`);
        let infusions = parseInt(answer) || 0;
        if (infusions > newKnownAmount) infusions = newKnownAmount;
        const spells = newKnownAmount - infusions;

        if (infusions > 0) {
          const advancement = _prepareAdvancementFromKnown("infusions", infusions, item, level);
          await addAdditionalAdvancement(advancement, item, collection);
          addedAdvancements.push(advancement);
        }
        if (spells > 0) {
          const advancement = _prepareAdvancementFromKnown("spells", spells, item, level);
          await addAdditionalAdvancement(advancement, item, collection);
          addedAdvancements.push(advancement);
        }
      }
      else {
        const advancement = _prepareAdvancementFromKnown(key, newKnownAmount, item, level);
        await addAdditionalAdvancement(advancement, item, collection);
        addedAdvancements.push(advancement);
      }
    }
  }
  return addedAdvancements;
}

function _prepareAdvancementFromKnown(key, amount, item, level) {
  const advancement = createNewAdvancement();
  advancement.name = game.i18n.localize(`dc20rpg.known.${key}`);
  advancement.allowToAddItems = true;
  advancement.customTitle = `You gain new ${advancement.name} (${amount})`;
  advancement.level = level;
  advancement.addItemsOptions = {
    helpText: `Add ${advancement.name}`,
    itemLimit: amount
  };
  advancement.img = CONFIG.DC20RPG.ICONS[key];
  advancement.parentItem = item;
  advancement.known = true;
  advancement.key = generateKey();
  _prepareCompendiumFilters(advancement, key);
  return advancement;
}

export async function shouldLearnNewSpellsOrManeuvers(actor, skipRefresh) {
  const shouldLearn = [];
  if (!skipRefresh) actor = await refreshActor(actor); // TODO do we even need to do that? Test
  for (const [key, known] of Object.entries(actor.system.known)) {
    if (known.max - known.current > 0) shouldLearn.push(key);
  }
  return shouldLearn;
}

async function _applyPathProgression(advancement, extraAdvancements, actor) {
  const parentItem = advancement.parentItem;
  const index = advancement.level -1;
  switch(advancement.mastery) {
    case "martial":
      if (!actor.system.details.staminaFeature) {
        const expansion = await _getSpellcasterStaminaAdvancement();
        expansion.level = advancement.level;
        expansion.key = "spellcasterStamina";
        expansion.parentItem = advancement.parentItem;
        extraAdvancements.set(expansion.key, expansion);
      }
      overrideScalingValue(parentItem, index, "martial"); 
      break;

    case "spellcaster":
      overrideScalingValue(parentItem, index, "spellcaster"); 
      break;
  }
}

async function _addItemsToActor(items, actor, advancement) {
  const extraAdvancements = new Map();
  const tips = [];
  const parentItem = advancement.parentItem;

  for (const [key, record] of Object.entries(items)) {
    const item = await fromUuid(record.uuid);
    const created = await createItemOnActor(actor, item);

    if (created.system.tip) {
      tips.push({
        name: created.name,
        img: created.img,
        tip: created.system.tip
      })
    }

    // Check if has extra advancements
    const extraAdvancement = _extraAdvancement(created);
    if (extraAdvancement) {
      extraAdvancement.level = advancement.level;
      extraAdvancement.parentItem = parentItem;
      extraAdvancement.createdBy = advancement.key;
      extraAdvancements.set(extraAdvancement.key, extraAdvancement);
    }

    // Add created id to advancement record
    if (record.ignoreKnown || advancement.doNotAddToKnownLimit) created.update({["system.knownLimit"]: false});
    record.createdItemId = created._id;
    advancement.items[key] = record;
  }
  return [extraAdvancements, tips];
}

async function _markAdvancementAsApplied(advancement, actor) {
  advancement.applied = true;
  advancement.featureSourceItem = ""; // clear filter
  advancement.hideRequirementMissing = false; // clear filter
  advancement.hideOwned = true; // clear filter
  advancement.itemNameFilter = "" // clear filter

  await updateAdvancement(advancement.parentItem, advancement);
  
  if (advancement.macro) runTemporaryMacro(advancement.macro, advancement, {actor: actor, advancement: advancement});
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
  newAdv.key = advKey;

  const parentItem = oldAdv.parentItem;
  // We want to clear item list before we add new ones
  if(oldAdv.cloneKey) await parentItem.update({[`system.advancements.${advKey}.-=items`]: null});
  await updateAdvancement(parentItem, oldAdv);
  await updateAdvancement(parentItem, newAdv);
}

async function _getSpellcasterStaminaAdvancement() {
  const spellcasterStamina = await fromUuid(CONFIG.DC20RPG.SYSTEM_CONSTANTS.spellcasterStamina);
  if (!spellcasterStamina || !spellcasterStamina?.system) {
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
    case "infusions":
      advancement.addItemsOptions.itemType = "infusion";
      advancement.addItemsOptions.preFilters = '{"tags": {"artifact": false, "cursed": false, "attunement": null, "charges": null, "uses": null, "consumable": null, "weapon": null, "spellFocus": null, "shield": null, "armor": null}}'
      break;
    case "spells":
      advancement.addItemsOptions.itemType = "spell";
      advancement.addItemsOptions.classSpellFilter = true;
      break;
    case "maneuvers":
      advancement.addItemsOptions.itemType = "maneuver";
      break;
  }
}

async function _fillMulticlassInfo(advancement, actor, extraAdvancements, talentType) {
  if (!talentType || talentType === "general" || talentType === "class") return;

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
    const selected = await SimplePopup.select("What Class/Subclass is that Multiclass Talent from?", options);
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
  const extra = createNewAdvancement();
  extra.img = img;
  extra.name = label,
  extra.customTitle = label;
  extra.mustChoose = true;
  extra.level = advancement.level;
  extra.parentItem = advancement.parentItem;
  extra.createdBy = advancement.key;
  extra.additionalAdvancement = true;
  extra.items = flavorFeatures;
  extraAdvancements.set(key, extra);
}

export function markItemRequirements(items, talentType, actor) {
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
    if (["expert", "master", "grandmaster", "legendary"].includes(talentType)) {
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
    if (["master", "grandmaster", "legendary"].includes(talentType)) {
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
    if (["grandmaster", "legendary"].includes(talentType)) {
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
    if (["legendary"].includes(talentType)) {
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
        label: custom.label,
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
  const dialog = new SimplePopup("info", {hideButtons: true, header: "Collecting Subclasses", information: ["Collecting Subclasses... Please wait it might take a while"]});
  await dialog.render(true);

  const hiddenItems = game.dc20rpg.compendiumBrowser.hideItems;
  const matching = [];
  for (const pack of game.packs) {
    if (!validateUserOwnership(pack)) continue;

    if (pack.documentName === "Item") {
      const items = await pack.getDocuments();
      items.filter(item => item.type === "subclass")
            .filter(item => !hiddenItems.has(item.uuid))
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

  await advancement.parentItem.update({[`system.advancements.-=${advancement.key}`]: null});
}

export async function updateAdvancement(item, advancement) {
  // We dont want to persist parent item within the advancement
  const copy = {...advancement};
  delete copy.parentItem; 
  await item.update({[`system.advancements.${advancement.key}`]: copy});
}