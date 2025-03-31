import { createItemOnActor } from "../../../helpers/actors/itemsOnActor.mjs";
import { createNewAdvancement } from "../../../helpers/advancements.mjs";
import { overrideScalingValue } from "../../../helpers/items/scalingItems.mjs";
import { generateKey } from "../../../helpers/utils.mjs";

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

export async function applyAdvancement(advancement, actor, owningItem) {
  let selectedItems = advancement.items;
  if (advancement.mustChoose) selectedItems = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));

  const extraAdvancements = await _addItemsToActor(selectedItems, actor, advancement);
  
  // Check for Martial Expansion that comes from the class, Martial Path or some other items
  let martialExpansion = _checkMartialExpansion(owningItem, advancement, actor);
  if (martialExpansion) extraAdvancements.set("martialExpansion", martialExpansion);
  
  if (advancement.repeatable) await _addRepeatableAdvancement(advancement, owningItem);
  if (advancement.progressPath) await _applyPathProgression(advancement, owningItem);

  await _markAdvancementAsApplied(advancement, owningItem);
  return extraAdvancements.values();
}

export async function addAdditionalAdvancement(advancement, item, advancementCollection) {
  advancement.additionalAdvancement = true;
  advancementCollection.push([advancement.key, advancement]);
  await item.update({[`system.advancements.${advancement.key}`]: advancement});
}

export async function addNewSpellTechniqueAdvancements(actor, item, advancementCollection, level) {
  const addedAdvancements = [];
  for (const [key, known] of Object.entries(actor.system.known)) {
    const newKnownAmount = known.max - known.current;
    if (newKnownAmount > 0) {
      const advancement = createNewAdvancement();
      advancement.name = game.i18n.localize(`dc20rpg.known.${key}`);
      advancement.allowToAddItems = true;
      advancement.pointAmount = newKnownAmount;
      advancement.mustChoose = true;
      advancement.customTitle = `Add New ${advancement.name}`;
      advancement.level = level;
      // TODO: Tutaj trzeba konfiguracje browsera dla konkretneych itemów
      await addAdditionalAdvancement(advancement, item, advancementCollection);
      addedAdvancements.push(advancement);
    }
  }
  return addedAdvancements;
}

export async function shouldLearnAnyNewSpellsOrTechniques(actor) {
  actor = await refreshActor(actor);
  for (const [key, known] of Object.entries(actor.system.known)) {
    if (known.max - known.current > 0) return true;
  }
  return false;
}

async function _applyPathProgression(advancement, item) {
  const index = advancement.level -1;
  switch(advancement.mastery) {
    case "martial":
      overrideScalingValue(item, index, "martial"); break;
    case "spellcaster":
      overrideScalingValue(item, index, "spellcaster"); break;
  }
}

async function _addItemsToActor(items, actor, advancement) {
  let extraAdvancements = new Map();
  for (const [key, record] of Object.entries(items)) {
    const item = await fromUuid(record.uuid);
    const created = await createItemOnActor(actor, item);

    // Check if has extra advancements
    const extraAdvancement = _extraAdvancement(created, actor);
    if (extraAdvancement) {
      extraAdvancement.level = advancement.level;
      extraAdvancements.set(extraAdvancement.key, extraAdvancement);
    }

    // Add created id to advancement record
    if (record.ignoreKnown) created.update({["system.knownLimit"]: false});
    record.createdItemId = created._id;
    advancement.items[key] = record;
  }
  return extraAdvancements;
}

function _markAdvancementAsApplied(advancement, owningItem) {
  advancement.applied = true;
  advancement.talentFeatureOrigin = ""; // clear filter
  owningItem.update({[`system.advancements.${advancement.key}`]: advancement})
}

function _extraAdvancement(item, actor) {
  // Additional Advancement
  if (item.system.hasAdvancement) {
    const additional = item.system.advancements.default;
    additional.key = generateKey();
    return additional;
  }

  // Martial Expansion
  if (item.system.provideMartialExpansion && !actor.system.details.martialExpansionProvided) {
    const expansion = _getMartialExpansionAdvancement();
    expansion.key = "martialExpansion";
    return expansion;
  }
  return null;
}

function _checkMartialExpansion(item, advancement, actor) {
  if (actor.system.details.martialExpansionProvided) return null;

  const fromItem = item.system.provideMartialExpansion;
  const fromMartialPath = advancement.progressPath && advancement.mastery === "martial";
  if (fromItem || fromMartialPath) {
    const expansion = _getMartialExpansionAdvancement();
    expansion.level = advancement.level;
    expansion.key = "martialExpansion";
    return expansion;
  }
  return null;
}

async function _addRepeatableAdvancement(oldAdv, owningItem) {
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

  // We want to clear item list before we add new ones
  if(oldAdv.cloneKey) await owningItem.update({[`system.advancements.${advKey}.-=items`]: null});
  await owningItem.update({
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
  return advancement;
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