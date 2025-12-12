import { validateUserOwnership } from "../../helpers/compendiumPacks.mjs";
import { capitalize, getValueFromPath } from "../../helpers/utils.mjs";

export async function collectItemsForType(itemType) {
  const hiddenItems = game.dc20rpg.compendiumBrowser.hideItems;
  const collectedItems = [];
  for (const pack of game.packs) {
    if (!validateUserOwnership(pack)) continue;

    if (pack.documentName === "Item") {
      if (pack.isOwner) continue;
      const items = await pack.getDocuments();
      for(const item of items) {
        if (item.type === itemType) {
          // If item is overriden by some other module we want to hide it from browser
          if (hiddenItems.has(item.uuid)) continue;

          // For DC20 Players Handbook module we want to keep it as a system instead of module pack
          const isDC20Handbook = pack.metadata.packageName === "dc20-core-rulebook";
          item.fromPack = isDC20Handbook ? "system" : pack.metadata.packageType;
          item.sourceName = _getSourceName(pack)
          collectedItems.push(item);
        }
      }
    }
  }
  _sort(collectedItems);
  return collectedItems;
}
export async function collectActors() {
  const hiddenActors = game.dc20rpg.compendiumBrowser.hideActors; 
  const collectedActors = [];

  for (const pack of game.packs) {
    if (!validateUserOwnership(pack)) continue;

    if (pack.documentName === "Actor") {
      if (pack.isOwner) continue;
      const actors = await pack.getDocuments();
    for(const actor of actors) {
        // If item is overriden by some other module we want to hide it from browser
        if (hiddenActors.has(actor.uuid)) continue;

        // For DC20 Players Handbook module we want to keep it as a system instead of module pack
        const isDC20Handbook = pack.metadata.packageName === "dc20-core-rulebook";
        actor.fromPack = isDC20Handbook ? "system" : pack.metadata.packageType;
        actor.sourceName = _getSourceName(pack);
        collectedActors.push(actor);
      }
    }
  }
  _sort(collectedActors);
  return collectedActors;
}
function _sort(array) {
  array.sort(function(a, b) {
    const textA = a.name.toUpperCase();
    const textB = b.name.toUpperCase();
    return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
  });
}
function _getSourceName(pack) {
  const type = pack.metadata.packageType;
  if (type === "module") {
    const module = game.modules.get(pack.metadata.packageName);
    if (module) return module.title;
    else return capitalize(type);
  }
  else return capitalize(type);
}

export function filterDocuments(collectedDocuments, filters) {
  const filtered = [];
  for (const document of collectedDocuments) {
    let filtersFailed = false;
    // Go over filters
    for (const filter of filters) {
      if (filter.nestedFilters && filter.nestedFilters.length > 0) {
        // Check for nested filters first
        for (const key of filter.nestedFilters) {
          const nested = filter[key];
          if (nested && nested.check && !nested.check(document, nested.value)) filtersFailed = true;
        }
      }
      else if (!filter.check || !filter.check(document, filter.value)) filtersFailed = true;
    }

    // Check if should be hidden
    if (document.system?.hideFromCompendiumBrowser) filtersFailed = true;
    if (!filtersFailed) filtered.push(document);
  }
  return filtered;
}

export function getDefaultItemFilters(preSelectedFilters) {
  let parsedFilters = {};
  if (preSelectedFilters) {
    try {
      parsedFilters = JSON.parse(preSelectedFilters);
    } catch (e) {
      ui.notifications.error(`Cannot parse pre selected filters '${preSelectedFilters}' with error: ${e}`)
    }
  }

  return {
    name: _filter("name", "name", "text"),
    compendium: _filter("fromPack", "compendium", "multi-select", {
      system: true,
      world: true,
      module: true
    }, "stringCheck"),
    sourceName: _filter("sourceName", "sourceName", "text"),
    feature: {
      featureOrigin: _filter("system.featureOrigin", "feature.featureOrigin", "text", parsedFilters["featureOrigin"]),
      featureType: _filter("system.featureType", "feature.featureType", "select", parsedFilters["featureType"], CONFIG.DC20RPG.DROPDOWN_DATA.featureSourceTypes),
      level: {
        over: _filter("system.requirements.level", "feature.level.over", "over"),
        under: _filter("system.requirements.level", "feature.level.under", "under"),
        filterType: "over-under",
        updatePath: "level",
        nestedFilters: ["over", "under"]
      },
    },
    maneuver: {
      maneuverOrigin: _filter("system.maneuverOrigin", "maneuver.maneuverOrigin", "text", parsedFilters["maneuverOrigin"]),
      techniqueType: _filter("system.maneuverType", "technique.maneuverType", "select", parsedFilters["maneuverType"], CONFIG.DC20RPG.DROPDOWN_DATA.maneuverTypes)
    },
    spell: {
      spellOrigin: _filter("system.spellOrigin", "spell.spellOrigin", "text", parsedFilters["spellOrigin"]),
      spellType: _filter("system.spellType", "spell.spellType", "select", parsedFilters["spellType"], CONFIG.DC20RPG.DROPDOWN_DATA.spellTypes),
      magicSchool: _filter("system.magicSchool", "spell.magicSchool", "select", parsedFilters["magicSchool"], CONFIG.DC20RPG.DROPDOWN_DATA.magicSchools),
      spellLists: _filter("system.spellLists", "spell.spellLists", "multi-select", parsedFilters["spellLists"] || {
        arcane: true,
        divine: true,
        primal: true
      }) 
    },
    infusion: {
      power: {
        over: _filter("system.infusion.power", "infusion.power.over", "over"),
        under: _filter("system.infusion.power", "infusion.power.under", "under"),
        filterType: "over-under",
        updatePath: "power",
        nestedFilters: ["over", "under"]
      },
      tags: _filter("system.infusion.tags", "infusion.tags", "multi-select-3-states", parsedFilters["tags"] || {
        artifact: null,
        attunement: null,
        cursed: null,
        charges: null,
        uses: null,
        consumable: null,
        weapon: null,
        shield: null,
        armor: null,
      }),
    },
    weapon: {
      weaponType: _filter("system.weaponType", "weapon.weaponType", "select", parsedFilters["weaponType"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes),
      weaponStyle: _filter("system.weaponStyle", "weapon.weaponStyle", "select", parsedFilters["weaponStyle"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles),
    },
    equipment: {
      equipmentType: _filter("system.equipmentType", "equipment.equipmentType", "select", parsedFilters["equipmentType"], CONFIG.DC20RPG.DROPDOWN_DATA.equipmentTypes)
    },
    consumable: {
      consumableType: _filter("system.consumableType", "consumable.consumableType", "select", parsedFilters["consumableType"], CONFIG.DC20RPG.DROPDOWN_DATA.consumableTypes)
    },
    subclass: {
      classSpecialId: _filter("system.forClass.classSpecialId", "subclass.classSpecialId", "select", parsedFilters["classSpecialId"], CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class)
    }
  }
}

export function getDefaultActorFilters() {
  return {
    name: _filter("name", "name", "text"),
    level: {
      over: _filter("system.details.level", "level.over", "over"),
      under: _filter("system.details.level", "level.under", "under"),
      filterType: "over-under",
      updatePath: "level",
      nestedFilters: ["over", "under"]
    },
    type: _filter("type", "type", "multi-select", {
      character: false,
      npc: true,
      companion: false
    }, "stringCheck"),
    role: _filter("system.details.role", "role", "text"),
    creatureType: _filter("system.details.creatureType", "creatureType", "text"),
    compendium: _filter("fromPack", "compendium", "multi-select", {
      system: true,
      world: true,
      module: true
    }, "stringCheck"),
    sourceName: _filter("sourceName", "sourceName", "text"),
  }
}

function _filter(pathToCheck, filterUpdatePath, filterType, defaultValue, options) {
  let value = defaultValue;
  
  // Prepare check method
  let method = (document, value) => {
    if (!value) return true;
    return getValueFromPath(document, pathToCheck) === value;
  };
  if (filterType === "boolean") method = (document, value) => {
    if (value === undefined || value === null) return true;
    return getValueFromPath(document, pathToCheck) === value;
  }
  if (filterType === "number") method = (document, value) => {
    if (value === undefined || value === null) return true;
    return getValueFromPath(document, pathToCheck) == value;
  }
  if (filterType === "text") method = (document, value) => {
    if (!value) return true;
    const documentValue = getValueFromPath(document, pathToCheck);
    if (!documentValue) return false;
    return documentValue.toLowerCase().includes(value.toLowerCase());
  }
  if (filterType === "multi-select") method = (document, expected) => {
    if (!expected) return true;
    // We need to check if string value is one of the selected filter value
    if (options === "stringCheck") return expected[getValueFromPath(document, pathToCheck)];

    // We need to check if at least one filter value equals activated document multi select options
    const selected = getValueFromPath(document, pathToCheck);
    if (!selected) return false;

    let mathing = false;
    for (const [key, value] of Object.entries(expected)) {
      if (value && selected[key] && selected[key].active) mathing = true;
    }
    return mathing;
  }
  if (filterType === "multi-select-3-states") method = (document, expected) => {
    if (!expected) return true;
    // We need to check if string value is one of the selected filter value
    if (options === "stringCheck") return expected[getValueFromPath(document, pathToCheck)];

    const selected = getValueFromPath(document, pathToCheck);
    if (!selected) return false;

    let mathing = true;
    for (const [key, expectedState] of Object.entries(expected)) {
      if (expectedState === undefined || expectedState === null) continue;

      const realState = selected[key]?.active;
      if (realState !== expectedState) mathing = false;
    }
    return mathing;
  }
  if (filterType === "under") method = (document, under) => {
    if (under === undefined || under === null || under === "") return true;
    const value = getValueFromPath(document, pathToCheck);
    return value <= under;
  }
  if (filterType === "over") method = (document, over) => {
    if (over === undefined || over === null || over === "") return true;
    const value = getValueFromPath(document, pathToCheck);
    return value >= over;
  }

  return {
    check: method,
    updatePath: filterUpdatePath, 
    filterType: filterType,
    value: value,
    options: options
  }
}