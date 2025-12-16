import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(item) {
  if (item.system.attackFormula) _calculateRollModifier(item);
  if (item.system.rollRequests) _calculateSaveDC(item);
  if (item.system.costs?.charges) _calculateMaxCharges(item);
  if (item.system.enhancements) _calculateSaveDCForEnhancements(item);
  if (item.system.conditional) _calculateSaveDCForConditionals(item);
  if (item.system.infusions) _calculateMagicPower(item);
  if (item.type === "weapon") _combatTraining(item);
  if (item.type === "feature") _checkFeatureSourceItem(item);
}

// TODO: Rework this shit
function _calculateRollModifier(item) {
  const attackFormula = item.system.attackFormula;
  let formulaModifier = "";

  // Determine if it is a spell or attack check or has a custom modifer
  if (attackFormula.customModifier) {
    formulaModifier = attackFormula.customModifier;
  }
  else if (attackFormula.checkType === "attack") {
    if (attackFormula.combatMastery) formulaModifier += " + @attack";
    else formulaModifier += " + @attackNoCM";
  }
  else if (attackFormula.checkType === "spell") formulaModifier += " + @spell";

  if (attackFormula.rollBonus) {
     formulaModifier +=  " + @rollBonus";
  }
  attackFormula.formulaMod = formulaModifier;

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

function _calculateSaveDCForConditionals(item) {
  if (!item.actor) return;

  const conditionals = item.system.conditionals;
  if (!conditionals) return;

  for (const cond of Object.values(conditionals)) {
    if (cond.addsNewRollRequest) {
      const save = cond.rollRequest;
      if (save.category === "save" && save.dcCalculation !== "flat") {
        cond.rollRequest.dc = _getSaveDCFromActor(save, item.actor);
      }
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
  if (charges.current === null) charges.current = charges.max;
}

function _combatTraining(item) {
  const owner = item.actor;
  if (!owner) return;
  if (!item.system.hasOwnProperty("combatTraining")) return;

  const combatTraining = item.system.combatTraining;
  if (combatTraining) return // Item has Combat Training from some other source (Pact Weapon for example) and we dont have to check the actor's training

  // We need to check if actor has training for that item type
  const trainingKey = _trainingKey(item);
  if (!trainingKey) return;
  item.system.combatTraining = owner.system.combatTraining[trainingKey];
}

function _trainingKey(item) {
  if (item.type === "weapon") return "weapons";
  if (item.type === "spellFocus") return "spellFocuses";
  if (item.type === "equipment") {
    switch (item.system.equipmentType) {
      case "light": return "lightArmor";
      case "heavy": return "heavyArmor";
      case "lshield": return "lightShield";
      case "hshield": return "heavyShield"
    }
  }
}

function _checkFeatureSourceItem(item) {
  const system = item.system;
  if (!CONFIG.DC20RPG.UNIQUE_ITEM_IDS) return;

  if (["class", "subclass", "ancestry", "background"].includes(system.featureType)) {
    const newOrigin = CONFIG.DC20RPG.UNIQUE_ITEM_IDS[system.featureType]?.[system.featureSourceItem];
    if (newOrigin && newOrigin !== item.system.featureOrigin) item.update({["system.featureOrigin"]: newOrigin})
  }
}

function _calculateMagicPower(item) {
  let magicPower = item.system.magicPower;
  const infusions = Object.values(item.system.infusions);
  for (const infusion of infusions) {
    if (magicPower == null) magicPower = 0;
    magicPower += infusion.power;
  }
  item.system.magicPower = magicPower;
}