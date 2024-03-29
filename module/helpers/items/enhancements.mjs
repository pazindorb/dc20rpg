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
    stamina: null
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
  const enhancements = item.system.enhancements;
  enhancements["powerAttack"] = _maneuver("Power Attack", true, false);
  enhancements["extendAttack"] = _maneuver("Extend Attack", false, false);
  enhancements["sweepAttack"] = _maneuver("Sweep Attack", false, false);
  enhancements["saveManeuver"] = _maneuver("Save Maneuver", false, true);
  const weaponManeuver = _weaponManeuver(item.system.weaponCategory);
  if (weaponManeuver) enhancements["weaponManeuver"] = weaponManeuver;
  enhancements["spendStamina"] = _spendStamina();
  item.update({[`system.enhancements`]: enhancements});
}

function _weaponManeuver(weaponCategory) {
  switch (weaponCategory) {
    case "axe": 
    case "chained": 
    case "fist": 
    case "hammer": 
    case "pick": 
    case "staff": 
    case "whip":
      return _maneuver("Weapon Maneuver", true, true);

    case "spear":
    case "crossbow":
      return _maneuver("Weapon Maneuver", true, false);

    case "bow": 
    case "sword":
      return _maneuver("Weapon Maneuver", false, false);
  }
}

function _maneuver(name, hasExtraDamage, hasSave) {
  return {
    name: name,
    number: 0,
    resources: {
      actionPoint: 1,
      health: null,
      mana: null,
      stamina: null
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

function _spendStamina() {
  return {
    name: "Spend Stamina Instead Of AP",
    number: 0,
    resources: {
      actionPoint: -1,
      health: null,
      mana: null,
      stamina: 1
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