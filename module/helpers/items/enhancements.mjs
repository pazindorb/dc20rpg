import { generateKey } from "../utils.mjs";

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
    modifications: modifications
  };

  item.update({[`system.enhancements.${key}`]: enhancement});
}

export function removeEnhancement(item, key) {
  item.update({[`system.enhancements.-=${key}`]: null });
}

export function addMartialManeuvers(item) {
  const customCosts = _customCosts(item);
  const enhancements = item.system.enhancements;
  enhancements["powerAttack"] = _maneuver("Power Attack", true, false, customCosts);
  enhancements["extendAttack"] = _maneuver("Extend Attack", false, false, customCosts);
  enhancements["sweepAttack"] = _maneuver("Sweep Attack", false, false, customCosts);
  enhancements["saveManeuver"] = _maneuver("Save Maneuver", false, true, customCosts);
  const stylePassive = _weaponStylePassive(item.system.weaponStyle, customCosts);
  if (stylePassive) enhancements["stylePassive"] = stylePassive;
  enhancements["spendStamina"] = _spendStamina(customCosts);
  item.update({[`system.enhancements`]: enhancements});
}

function _weaponStylePassive(weaponStyle, customCosts) {
  if (weaponStyle === "whip") return _maneuver("Target is farther than 1 Space from you", true, false, customCosts, true);
  if (weaponStyle === "chained") return _maneuver("Target uses a shield", true, false, customCosts, true);
  if (weaponStyle === "spear") return _maneuver("You moved 2 Spaces towards your target", true, false, customCosts, true);
  if (weaponStyle === "crossbow") return _maneuver("You attack the same target", true, false, customCosts, true);
}

function _maneuver(name, hasExtraDamage, hasSave, customCosts, free) {
  const apCost = free ? null : 1;

  return {
    name: name,
    number: 0,
    resources: {
      actionPoint: apCost,
      health: null,
      mana: null,
      stamina: null,
      custom: customCosts
    },
    modifications: {
      hasAdditionalFormula: hasExtraDamage,
      additionalFormula: "1",
      overrideSave: hasSave,
      save : {
        type: "",
        dc: null,
        calculationKey: "martial",
        addMastery: false
      }
    }
  };
}

function _spendStamina(customCosts) {
  return {
    name: "Spend Stamina Instead Of AP",
    number: 0,
    resources: {
      actionPoint: -1,
      health: null,
      mana: null,
      stamina: 1,
      customCosts: customCosts
    },
    modifications: {
      hasAdditionalFormula: false,
      additionalFormula: 0,
      overrideSave: false,
      save : {
        type: "",
        dc: null,
        calculationKey: "martial",
        addMastery: false
      }
    }
  };
}

function _customCosts(item) {
  return Object.fromEntries(Object.entries(item.system.costs.resources.custom)
  .map(([key, custom]) => { 
    custom.value = null; 
    return [key, custom];
  }));
}