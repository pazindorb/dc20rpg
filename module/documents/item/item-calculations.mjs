import { evaulateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(item) {
  if (item.system.attackFormula) _calculateRollModifier(item);
  if (item.system.save) _calculateSaveDC(item);
  if (item.system.costs?.charges) _calculateMaxCharges(item);
  // if (item.system.enhancements) _calculateSaveDCForEnhancements(item)
}

function _calculateRollModifier(item) {
  const system = item.system;
  const attackFormula = system.attackFormula;
  
  // Prepare formula
  if (attackFormula.overriden) {
    attackFormula.formula = attackFormula.overridenFormula;
  } else {
    let calculationFormula = "d20";

    // determine if it is a spell or attack check
    if (attackFormula.checkType === "attack") {
      if (system.attackFormula.combatMastery) calculationFormula += " + @attack";
      else calculationFormula += " + @attackNoCM";
    }
    else if (attackFormula.checkType === "spell") calculationFormula += " + @spell";

    if (system.attackFormula.rollBonus) calculationFormula +=  " + @rollBonus";
    attackFormula.formula = calculationFormula;
  }

  // Calculate roll modifier for formula
  const rollData = item.getRollData();
  attackFormula.rollModifier = attackFormula.formula ? evaulateDicelessFormula(attackFormula.formula, rollData, true).total : 0;
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
  for (const enh of Object.values(enhancements)) {
    if (enh.modifications.overrideSave) {
      const save = enh.modifications.save;
      if (save.calculationKey === "flat") continue;
      if (actor) save.dc = item._getSaveDCFromActor(save, actor);
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
      let dc = 8;
      const key = save.calculationKey;
      dc += actor.system.attributes[key].value;
      if (save.addMastery) dc += actor.system.details.combatMastery;
      return dc;
  }
}

function _calculateMaxCharges(item) {
  const charges = item.system.costs.charges;
  const rollData = item.getRollData();
  charges.max = charges.maxChargesFormula ? evaulateDicelessFormula(charges.maxChargesFormula, rollData, true).total : null;
}