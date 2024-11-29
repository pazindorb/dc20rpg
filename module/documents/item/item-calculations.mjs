import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(item) {
  if (item.system.attackFormula) _calculateRollModifier(item);
  if (item.system.save) _calculateSaveDC(item);
  if (item.system.costs?.charges) _calculateMaxCharges(item);
  if (item.system.enhancements) _calculateSaveDCForEnhancements(item);

  if (item.system.hasOwnProperty("usesWeapon")) _usesWeapon(item);
}

function _calculateRollModifier(item) {
  const system = item.system;
  const attackFormula = system.attackFormula;
  
  // Prepare formula
  let calculationFormula = "";

  // determine if it is a spell or attack check
  if (attackFormula.checkType === "attack") {
    if (system.attackFormula.combatMastery) calculationFormula += " + @attack";
    else calculationFormula += " + @attackNoCM";
  }
  else if (attackFormula.checkType === "spell") calculationFormula += " + @spell";

  if (system.attackFormula.rollBonus) calculationFormula +=  " + @rollBonus";
  attackFormula.formulaMod = calculationFormula;

  // Calculate roll modifier for formula
  const rollData = item.getRollData();
  attackFormula.rollModifier = attackFormula.formulaMod ? evaluateDicelessFormula(attackFormula.formulaMod, rollData, true).total : 0;
}

function _calculateSaveDC(item) {
  const save = item.system.save;
  if (save.calculationKey === "flat") return;

  const actor = item.actor;
  if (!actor) {
    save.dc = null;
    return;
  }
  
  save.dc = _getSaveDCFromActor(save, actor);
}

function _calculateSaveDCForEnhancements(item) {
  const actor = item.actor;
  const enhancements = item.system.enhancements;
  for (const enh of Object.values(enhancements)) {
    if (enh.modifications.overrideSave) {
      const save = enh.modifications.save;
      if (save.calculationKey === "flat") continue;
      if (actor) save.dc = _getSaveDCFromActor(save, actor);
      else save.dc = null;
    }
  }
}

function _getSaveDCFromActor(save, actor) {
  const saveDC = actor.system.saveDC;
  switch (save.calculationKey) {
    case "martial":
      return saveDC.value.martial;
    case "spell":
      return saveDC.value.spell; 
    default:
      let dc = 10;
      const key = save.calculationKey;
      dc += actor.system.attributes[key].value;
      if (save.addMastery) dc += actor.system.details.combatMastery;
      return dc;
  }
}

function _calculateMaxCharges(item) {
  const charges = item.system.costs.charges;
  const rollData = item.getRollData();
  charges.max = charges.maxChargesFormula ? evaluateDicelessFormula(charges.maxChargesFormula, rollData, true).total : null;
}

function _usesWeapon(item) {
  const usesWeapon = item.system.usesWeapon;
  if (!usesWeapon?.weaponAttack) return;

  const owner = item.actor;
  if (!owner) return;

  const weapon = owner.items.get(usesWeapon.weaponId);
  if (!weapon) return;
  
  // We want to copy weapon attack range, weaponStyle and weaponType so we can make 
  // conditionals work for techniques and features that are using weapons
  item.system.weaponStyle = weapon.system.weaponStyle;
  item.system.weaponType = weapon.system.weaponType;
  item.system.attackFormula.rangeType = weapon.system.attackFormula.rangeType;
  item.system.attackFormula.checkType = weapon.system.attackFormula.checkType;

  // We also want to copy weapon properties
  item.system.properties = weapon.system.properties;
}