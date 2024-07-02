import { itemMeetsUseConditions } from "../conditionals.mjs";
import { generateKey, hasKeys } from "../utils.mjs";

export function addEnhancement(item, $nameInput) {
  const enhancementName = $nameInput.val();
  if (!enhancementName) {
    let errorMessage = `Enhancement name must be provided.`;
    ui.notifications.error(errorMessage);
    return;
  }
  const enhancements = item.system.enhancements;
  const resources = {
    actionPoint: null,
    health: null,
    mana: null,
    stamina: null, 
    custom: _customCosts(item)
  };
  const modifications = {
    hasAdditionalFormula: false,
    additionalFormula: "",
    overrideSave: false,
    save : {
      type: "",
      dc: null,
      calculationKey: "martial",
      addMastery: false
    }
  }

  let key = "";
  do {
    key = generateKey();
  } while (enhancements[key]);

  const enhancement = {
    name: enhancementName,
    number: 0,
    resources: resources,
    modifications: modifications,
    description: ""
  };

  item.update({[`system.enhancements.${key}`]: enhancement});
}

export function removeEnhancement(item, key) {
  item.update({[`system.enhancements.-=${key}`]: null });
}

function _customCosts(item) {
  return Object.fromEntries(Object.entries(item.system.costs.resources.custom)
  .map(([key, custom]) => { 
    custom.value = null; 
    return [key, custom];
  }));
}

export function duplicateEnhancementsToOtherItems(item, toItems) {
  if (toItems.size === 0) return;

  const enhancements = item.system.enhancements;
  if (!hasKeys(enhancements)) return;

  const useCondition = item.system.copyEnhancements.copyFor;
  toItems
        .filter(item => item.system.hasOwnProperty("enhancements"))
        .filter(item => itemMeetsUseConditions(useCondition, item))
        .forEach(item => {
          const newEnhList = {
            ...item.system.enhancements,
            ...enhancements
          };
          item.update({['system.enhancements']: newEnhList});
        });
}

export function removeDuplicatedEnhancements(item, fromItems) {
  if (fromItems.size === 0) return;

  const enhancements = item.system.enhancements;
  if (!hasKeys(enhancements)) return;

  fromItems
        .filter(itm => itm.system.hasOwnProperty("enhancements"))
        .filter(itm => item.id !== itm.id)
        .forEach(itm => {
          const itemEnhs = itm.system.enhancements;
          let updateData = {};
          Object.keys(enhancements).forEach(key => {
            if (itemEnhs[key]) updateData[`system.enhancements.-=${key}`] = null;
          });
          if(hasKeys(updateData)) itm.update(updateData);
        });
}

function _weaponStylePassive(weaponStyle, customCosts) {
  if (weaponStyle === "whip") return _maneuver("Target is farther than 1 Space from you", true, false, customCosts, true);
  if (weaponStyle === "chained") return _maneuver("Target uses a shield", true, false, customCosts, true);
  if (weaponStyle === "spear") return _maneuver("You moved 2 Spaces towards your target", true, false, customCosts, true);
  if (weaponStyle === "crossbow") return _maneuver("You attack the same target", true, false, customCosts, true);
}