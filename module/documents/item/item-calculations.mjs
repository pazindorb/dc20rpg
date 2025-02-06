import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(item) {
  if (item.system.attackFormula) _calculateRollModifier(item);
  if (item.system.rollRequests) _calculateSaveDC(item);
  if (item.system.costs?.charges) _calculateMaxCharges(item);
  if (item.system.enhancements) _calculateSaveDCForEnhancements(item);
  if (item.type === "weapon") _runWeaponStyleCheck(item);

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
  const rollRequests = item.system.rollRequests;
  if (!item.actor) return;

  for (const [key, request] of Object.entries(rollRequests)) {
    if (request.category !== "save") continue;
    if (request.dcCalculation === "flat") continue;
    request.dc = _getSaveDCFromActor(request, item.actor);
    rollRequests[key] = request;
  }
}

function _calculateSaveDCForEnhancements(item) {
  if (!item.actor) return;

  const enhancements = item.system.enhancements;
  for (const enh of Object.values(enhancements)) {
    if (enh.modifications.addsNewRollRequest) {
      const save = enh.modifications.rollRequest;
      if (save.category !== "save") continue;
      if (save.dcCalculation === "flat") continue;
      enh.modifications.rollRequest.dc = _getSaveDCFromActor(save, item.actor);
    }
  }
}

function _getSaveDCFromActor(request, actor) {
  const saveDC = actor.system.saveDC;
  switch (request.dcCalculation) {
    case "martial":
      return saveDC.value.martial;
    case "spell":
      return saveDC.value.spell; 
    default:
      let dc = 10;
      const key = request.dcCalculation;
      if (!key) return 0;
      dc += actor.system.attributes[key].value;
      if (request.addMastery) dc += actor.system.details.combatMastery;
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
  item.system.weaponStyleActive = weapon.system.weaponStyleActive;
  item.system.attackFormula.rangeType = weapon.system.attackFormula.rangeType;
  item.system.attackFormula.checkType = weapon.system.attackFormula.checkType;

  // We also want to copy weapon properties and range
  item.system.properties = weapon.system.properties;
  item.system.range = weapon.system.range;
}

function _runWeaponStyleCheck(item) {
  const owner = item.actor;
  if (!owner) return;

  const weaponStyleActive = item.system.weaponStyleActive;
  // If it is not true then we want to check if actor has "weapons" Combat Training.
  // If it is true, then we assume that some feature made it that way and we dont care about the actor
  if (!weaponStyleActive) item.system.weaponStyleActive = owner.system.combatTraining.weapons;
}