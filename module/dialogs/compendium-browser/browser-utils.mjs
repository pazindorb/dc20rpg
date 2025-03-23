import { validateUserOwnership } from "../../helpers/compendiumPacks.mjs";
import { capitalize, getValueFromPath } from "../../helpers/utils.mjs";

export async function collectItemsForType(itemType) {
  const hideItems = game.dc20rpg.compendiumBrowser.hideItems;
  // Finally we need to collect all items of given type from packs
  const collectedItems = [];
  for (const pack of game.packs) {
    if (!validateUserOwnership(pack)) continue;

    if (pack.documentName === "Item") {
      if (pack.isOwner) continue;
      const items = await pack.getDocuments();
      for(const item of items) {
        if (item.type === itemType) {
          const packageType = pack.metadata.packageType;
          // If system item is overriden by some other module we want to hide it from browser
          if (packageType === "system" && hideItems.has(item.id)) continue;

          // For DC20 Players Handbook module we want to keep it as a system instead of module pack
          const isDC20Handbook = pack.metadata.packageName === "dc20-core-rulebook";
          item.fromPack = isDC20Handbook ? "system" : packageType;
          item.sourceName = _getSourceName(pack)
          collectedItems.push(item);
        }
      }
    }
  }
  _sort(collectedItems);
  return collectedItems;
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

export function filterItems(collectedItems, filters) {
  const filtered = [];
  for (const item of collectedItems) {
    let filtersFailed = false;
    // Go over filters
    for (const filter of filters) {
      if (!filter.check(item, filter.value)) filtersFailed = true;
    }

    // Check if item is hidden
    if (item.system.hideFromCompendiumBrowser) filtersFailed = true;
    if (!filtersFailed) filtered.push(item);
  }
  return filtered;
}

export function getDefaultItemFilters(preSelectedFilters) {
  let parsedFilters = {};
  if (preSelectedFilters) {
    try {
      parsedFilters = JSON.parse(preSelectedFilters);
    } catch (e) {
      console.warn(`Cannot parse pre selected filters '${preSelectedFilters}' with error: ${e}`)
    }
  }

  return {
    name: _filter("name", "name", "text"),
    compendium: _filter("fromPack", "compendium", "multi-select", {
      system: true,
      world: true,
      module: true
    }, "oneToMany"),
    feature: {
      featureOrigin: _filter("system.featureOrigin", "feature.featureOrigin", "text", parsedFilters["featureOrigin"]),
      featureType: _filter("system.featureType", "feature.featureType", "select", parsedFilters["featureType"], CONFIG.DC20RPG.DROPDOWN_DATA.featureSourceTypes)
    },
    technique: {
      techniqueOrigin: _filter("system.techniqueOrigin", "technique.techniqueOrigin", "text", parsedFilters["techniqueOrigin"]),
      techniqueType: _filter("system.techniqueType", "technique.techniqueType", "select", parsedFilters["techniqueType"], CONFIG.DC20RPG.DROPDOWN_DATA.techniqueTypes)
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
    weapon: {
      weaponType: _filter("system.weaponType", "weapon.weaponType", "select", parsedFilters["weaponType"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes),
      weaponStyle: _filter("system.weaponStyle", "weapon.weaponStyle", "select", parsedFilters["weaponStyle"], CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles),

    },
    equipment: {
      equipmentType: _filter("system.equipmentType", "equipment.equipmentType", "select", parsedFilters["equipmentType"], CONFIG.DC20RPG.DROPDOWN_DATA.equipmentTypes)
    },
    consumable: {
      consumableType: _filter("system.consumableType", "consumable.consumableType", "select", parsedFilters["consumableType"], CONFIG.DC20RPG.DROPDOWN_DATA.consumableTypes)
    }
  }
}

function _filter(pathToCheck, filterUpdatePath, filterType, defaultValue, options) {
  const value = defaultValue || "";
  
  // Prepare check method
  let method = (item, value) => {
    if (!value) return true;
    return getValueFromPath(item, pathToCheck) === value;
  };
  if (filterType === "text") method = (item, value) => {
    if (!value) return true;
    return getValueFromPath(item, pathToCheck).toLowerCase().includes(value.toLowerCase());
  }
  if (filterType === "multi-select") method = (item, expected) => {
    if (!expected) return true;
    // We need to chack if string value is one of the selected filter value
    if (options === "oneToMany") return expected[getValueFromPath(item, pathToCheck)];

    // We need to check if at least one filter value equals activated item multi select options
    const selected = getValueFromPath(item, pathToCheck);
    if (!selected) return false;

    let mathing = false;
    for (const [key, value] of Object.entries(expected)) {
      if (value && selected[key] && selected[key].active) mathing = true;
    }
    return mathing;
  }

  return {
    check: method,
    updatePath: filterUpdatePath, 
    filterType: filterType,
    value: value,
    options: options
  }
}