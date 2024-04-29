import { evaulateFormula } from "../../helpers/rolls.mjs";

export async function makeCalculations(item) {
  if (item.system.attackFormula) await _calculateRollModifier(item);
  if (item.system.save) await _calculateSaveDC(item);
  if (item.system.costs?.charges) await _calculateMaxCharges(item);
  // if (item.system.enhancements) _calculateSaveDCForEnhancements(item)
}

async function _calculateRollModifier(item) {
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
  const rollData = await item.getRollData();
  attackFormula.rollModifier = attackFormula.formula ? await evaulateFormula(attackFormula.formula, rollData, true).total : 0;
}

async function _calculateSaveDC(item) {
  const save = item.system.save;
  if (save.calculationKey === "flat") return;

  const actor = await item.actor;
  if (!actor) {
    save.dc = null;
    return;
  }
  
  save.dc = _getSaveDCFromActor(save, actor);
}

async function _calculateSaveDCForEnhancements(item) {
  const actor = await item.actor;
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

async function _calculateMaxCharges(item) {
  const charges = item.system.costs.charges;
  const rollData = await item.getRollData();
  charges.max = charges.maxChargesFormula ? await evaulateFormula(charges.maxChargesFormula, rollData, true).total : null;
}