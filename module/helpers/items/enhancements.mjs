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
  const weaponManeuver = _weaponManeuver(item.system.weaponCategory, customCosts);
  if (weaponManeuver) enhancements["weaponManeuver"] = weaponManeuver;
  enhancements["spendStamina"] = _spendStamina(customCosts);
  item.update({[`system.enhancements`]: enhancements});
}

function _weaponManeuver(weaponCategory, customCosts) {
  switch (weaponCategory) {
    case "axe": 
    case "chained": 
    case "fist": 
    case "hammer": 
    case "pick": 
    case "staff": 
    case "whip":
      return _maneuver("Weapon Maneuver", true, true, customCosts);

    case "spear":
    case "crossbow":
      return _maneuver("Weapon Maneuver", true, false, customCosts);

    case "bow": 
    case "sword":
      return _maneuver("Weapon Maneuver", false, false, customCosts);
  }
}

function _maneuver(name, hasExtraDamage, hasSave, customCosts) {
  return {
    name: name,
    number: 0,
    resources: {
      actionPoint: 1,
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