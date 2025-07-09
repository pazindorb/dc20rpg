import { evaluateDicelessFormula } from "./rolls.mjs";
import { getLabelFromKey } from "./utils.mjs";

//========================
//       CONVERTERS      =
//========================
/**
 * Converts tokens to targets used by chat message or damage calculation.
 */
export function tokenToTarget(token, flags={}) {
  const actor = token.actor;
  const statuses = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
  const rollData = actor?.getRollData();
  const target = {
    name: actor.name,
    img: actor.img,
    id: token.id,
    isOwner: actor.isOwner,
    system: actor.system,
    statuses: statuses,
    effects: actor.allEffects,
    isFlanked: token.isFlanked,
    rollData: {
      target: {
        numberOfConditions: _numberOfConditions(actor.coreStatuses),
        system: rollData
      }
    },
    token: token,
    flags: flags
  };
  return target;
}

export function targetToToken(target) {
  return canvas.tokens.documentCollection.get(target.id);
}

function _numberOfConditions(coreStatuses) {
  let number = 0;
  const conditions = CONFIG.DC20RPG.DROPDOWN_DATA.conditions;
  for (const status of coreStatuses) {
    if (conditions[status]) number += 1;
  }
  return number;
}

//========================
//      CALCULATIONS     =
//========================
export function getAttackOutcome(target, data) {
  if (!data.isAttack || !target) return {};
  if (!data.hit) {
    const conditionals = target ? _matchingConditionals(target, data) : [];
    data.hit = _calculateHit(target, data.defenceKey, data.rollTotal, conditionals);
  }

  const outcome = {};
  if (data.isCritMiss || data.hit < 0) outcome.miss = true;
  outcome.label = _outcomeLabel(data.hit, data.isCritHit, data.isCritMiss, data.skipFor);
  outcome.defenceKey = data.defenceKey;
  outcome.hit = data.hit;
  return outcome;
}

/**
 * Returns final damage calculated for specific target. Includes DR, resitances, crits and all other modifications.
 * To convert token to target take a look at tokenToTarget documentation.
 * "formulaRoll" = {
 *    "clear": {
 *      "value": Number,
 *      "source": String,
 *      "type": String (ex. "fire")
 *    },
 *    "modified": {
 *      "value": Number,
 *      "source": String,
 *      "type": String (ex. "fire"),
 *      "each5Value": "Number",
 *      "failValue": Number
 *    }
 * }
 * "data" - note: not every field is required = {
 *    "isAttack": Boolean,
 *    "isCheck": Boolean,
 *    "canCrit": Boolean,
 *    "halfDmgOnMiss": Boolean,
 *    "isCritHit": Boolean,
 *    "isCritMiss": Boolean,
 *    "isDamage": Boolean,
 *    "isHealing": Boolean,
 *    "defenceKey": String(ex. "precision"),
 *    "hit": Number,
 *    "rollTotal": Number,
 *    "skipFor": {
 *      "heavy": Boolean,
 *      "brutal": Boolean,
 *      "crit": Boolean,
 *      "conditionals": Boolean,
 *    },
 *    "conditionals": Array
 * }
 */
export function calculateForTarget(target, formulaRoll, data) {
  const final = {
    clear: formulaRoll.clear,
    modified: formulaRoll.modified,
  }
  // We might change that data so we need to copy it
    const dr = target ? foundry.utils.deepClone(target.system.damageReduction) : null; 
    const hr = target ? foundry.utils.deepClone(target.system.healingReduction) : null;

  // 0. For Crit Miss it is always 0
  if (data.isCritMiss) {
    final.modified = _applyCritFail(final.modified, data.isAttack);
    final.clear = _applyCritFail(final.clear, data.isAttack);
    return final;
  }

  // 1.A. If Attack Calculate hit value 1st
  if (data.isAttack && !data.hit) {
    const conditionals = target ? _matchingConditionals(target, data) : [];
    data.hit = _calculateHit(target, data.defenceKey, data.rollTotal, conditionals);
  }

  // 1.B. If Check Calculate degree of success
  if (data.isCheck) {
    if (data.againstDC && data.checkDC) {
      _degreeOfSuccess(data.rollTotal, data.isCritMiss, data.checkDC, final);
    }
    else if (target?.rollOutcome) {
      const rollOutcome = target.rollOutcome;
      _degreeOfSuccess(data.rollTotal, data.isCritMiss, rollOutcome.total, final, true);
    }
  }
  
  // 2.Collect conditionals with matching condition
  data.conditionals = target ? _matchingConditionals(target, data) : [];

  // 3. Collect modifications from conditionals
  const condFlags = _modificationsFromConditionals(data.conditionals, final, target, data.skipFor?.conditionals);
  
  // 4. Apply only Attack Roll Modifications
  if (data.isAttack && data.isDamage) final.modified = _applyAttackRollModifications(data.hit, final.modified, data.skipFor);
  
  // 5. Apply Crit Success
  const canCrit = data.canCrit && !data.skipFor?.crit
  final.modified = _applyCritSuccess(final.modified, data.isCritHit, canCrit);

  // 6. Apply Flat Damage/Healing Reduction (X)
  if (data.isDamage) final.modified = _applyFlatReduction(final.modified, dr.flat, "Damage");
  if (data.isHealing) final.modified = _applyFlatReduction(final.modified, hr.flat, "Healing");

  // 7. Apply PDR, EDR and MDR to Resistances
  if (data.isAttack && data.isDamage) _applyDamageReduction(data.hit, final.modified, dr, condFlags.ignore);

  // 8. Apply Vulnerability, Resistance and DR
  if (data.isDamage) final.modified = _applyDamageModifications(final.modified, dr, condFlags.ignore);
  if (data.isDamage) final.clear = _applyDamageModifications(final.clear, dr, condFlags.ignore);

  // 9. Apply Flat Damage/Healing Reduction (Half)
  if (data.isDamage) final.modified = _applyFlatReductionHalf(final.modified, dr.flatHalf, "Damage");
  if (data.isDamage) final.clear = _applyFlatReductionHalf(final.clear, dr.flatHalf, "Damage");
  if (data.isHealing) final.modified = _applyFlatReductionHalf(final.modified, hr.flatHalf, "Healing");
  if (data.isHealing) final.clear = _applyFlatReductionHalf(final.clear, hr.flatHalf, "Healing");

  // 10. Prevent negative values
  final.modified = _finalAdjustments(final.modified);
  final.clear = _finalAdjustments(final.clear);

  // 11. Determine what should happened on Attack Miss 
  if (data.isAttack && data.isDamage && data.hit < 0) {
    if (data.halfDmgOnMiss) {
      final.modified = _applyHalfDamageOnMiss(final.modified);
      final.clear = _applyHalfDamageOnMiss(final.clear);
    }
    else {
      final.modified = _applyAttackMiss(final.modified);
      final.clear = _applyAttackMiss(final.clear);
    }
  }
  return final;
}

export function calculateNoTarget(formulaRoll, data) {
  const final = {
    clear: formulaRoll.clear,
    modified: formulaRoll.modified,
  }

  // 0. For Crit Miss it is always 0
  if (data.isCritMiss) {
    final.modified = _applyCritFail(final.modified, data.isAttack);
    final.clear = _applyCritFail(final.clear, data.isAttack);
    return final;
  }

  // 1. If Check Calculate degree of success
  if (data.isCheck && data.againstDC && data.checkDC) {
    _degreeOfSuccess(data.rollTotal, data.isCritMiss, data.checkDC, formulaRoll)
  }

  // 2. Apply Crit Success
  const canCrit = data.canCrit && !data.skipFor?.crit
  final.modified = _applyCritSuccess(final.modified, data.isCritHit, canCrit);

  // 3. Prevent negative values
  final.modified = _finalAdjustments(final.modified);
  final.clear = _finalAdjustments(final.clear);

  return final;
}

function _degreeOfSuccess(checkValue, natOne, checkDC, final, contest) {
  const modified = final.modified;

  // Check Failed
  if (natOne || (checkValue < checkDC)) {
    const failValue = modified.failValue;
    if (failValue !== undefined) {
      modified.source = modified.source.replace("Base Value", "");
      if (contest) modified.source = "[Contest Lost] " + modified.source;
      else modified.source += "[Check Failed] " + modified.source;
      modified.value = failValue;
    }
  }
  // Check succeed by 5 or more
  else if (checkValue >= checkDC + 5) {
    const each5Value = modified.each5Value;
    if (each5Value) {
      const degree = Math.floor((checkValue - checkDC) / 5);
      modified.source = modified.source.replace("Base Value", "");
      if (contest) modified.source += `[Contest Won over ${(degree * 5)}] ${modified.source}`;
      else modified.source += `[Check Succeeded over ${(degree * 5)}] ${modified.source}`;
      modified.value += (degree * each5Value);
    }
  }
  final.modified = modified;
}

function _matchingConditionals(target, data) {
  if (!data.conditionals) return [];
  
  // Helper methods to check statuses and effects
  target.hasAnyCondition = (condsToFind, skipNonConditions) => {
    if (!condsToFind || condsToFind.length === 0) {
      if (!skipNonConditions) return target.statuses.length > 0;
      const conditions = CONFIG.DC20RPG.DROPDOWN_DATA.conditions;
      return target.statuses.find(status => conditions[status.id]) !== undefined;
    }
    return target.statuses.some(cond => condsToFind.includes(cond.id));
  };
  target.hasEffectWithName = (effectName, includeDisabled, selfOnly) => 
    target.effects.filter(effect => {
      const applierId = effect.flags.dc20rpg?.applierId;
      if (selfOnly && applierId && applierId !== data.applierId) return false;

      if (includeDisabled) return true;
      else return !effect.disabled;
    }).find(effect => effect.name === effectName) !== undefined;
  target.hasEffectWithKey = (effectKey, includeDisabled, selfOnly) => 
    target.effects.filter(effect => {
      const applierId = effect.flags.dc20rpg?.applierId;
      if (selfOnly && applierId && applierId !== data.applierId) return false;

      if (includeDisabled) return true;
      else return !effect.disabled;
    }).find(effect => effect.system?.effectKey === effectKey) !== undefined;

  const matching = [];
  data.conditionals.forEach(con => {
    const condition = con.condition;
    try {
      const conditionFulfilled = new Function('hit', 'crit', 'target', 'helpers', `return ${condition};`);
      if (conditionFulfilled(data.hit, data.isCritHit, target, CONFIG.DC20ConditionalHelpers)) matching.push(con);
    } catch (e) {
      console.warn(`Cannot evaluate '${condition}' conditional: ${e}`);
    }
  })
  return matching;
}
function _modificationsFromConditionals(conditionals, final, target, skipConditionalDamage) {
  const modified = final.modified;
  const ignore = {
    pdr: false,
    edr: false,
    mdr: false,
    resistance: new Set(),
    immune: new Set()
  }
  if (!conditionals) return {ignore: ignore};
  
  conditionals.forEach(con => {
    if (!skipConditionalDamage) {
      // Apply extra dmg/healing
      if (con.bonus && con.bonus !== "" && con.bonus !== "0") {
        modified.source += ` + ${con.name}`;
        modified.value += evaluateDicelessFormula(con.bonus, target.rollData)._total;
      }
    } 

    // Get ignore flags
    const flags = con.flags;
    if (flags) {
      if (flags.ignorePdr) ignore.pdr = true;
      if (flags.ignoreEdr) ignore.edr = true;
      if (flags.ignoreMdr) ignore.mdr = true;
      ignore.resistance = new Set([...ignore.resistance, ...Object.keys(flags.ignoreResistance)]);
      ignore.immune = new Set([...ignore.immune, ...Object.keys(flags.ignoreImmune)]);
    }
  })
  final.modified = modified;
  return {ignore: ignore};
}

function _calculateHit(target, defenceKey, rollTotal, conditionals) {
  const defence = target.system.defences[defenceKey].value;
  
  let defReducion = 0;
  conditionals.forEach(cond => {
    if (defenceKey === "precision" && cond.flags.reducePd) {
      const roll = evaluateDicelessFormula(cond.flags.reducePd, target.rollData);
      if (roll) defReducion += roll._total;
    }
    if (defenceKey === "area" && cond.flags.reduceAd) {
      const roll = evaluateDicelessFormula(cond.flags.reduceAd, target.rollData);
      if (roll) defReducion += roll._total;
    }
  });
  return rollTotal - defence + defReducion;
}

function _applyAttackRollModifications(hit, dmg, skipFor) {
  const extraDmg = Math.max(0, Math.floor(hit/5)); // We don't want to have negative extra damage

  // Add dmg from Heavy Hit, Brutal Hit etc.
  if (skipFor?.heavy) return dmg;
  if (extraDmg === 1) dmg.source += " + Heavy Hit";

  if (skipFor?.brutal) {
    dmg.source += " + Heavy Hit";
    dmg.value += extraDmg
    return dmg;
  }
  if (extraDmg === 2) dmg.source += " + Brutal Hit";
  if (extraDmg >= 3) dmg.source += ` + Brutal Hit(over ${extraDmg * 5})`;
  dmg.value += extraDmg
  return dmg;
}

function _applyDamageModifications(dmg, damageReduction, ignore) {
  const dmgType = dmg.type;
  if (dmgType == "true" || dmgType == "") return dmg; // True dmg cannot be modified
  const modifications = damageReduction.damageTypes[dmgType];
  const ignoreResitance = ignore.resistance.has(dmgType);
  const ignoreImmune = ignore.immune.has(dmgType);

  // STEP 1 - Adding & Subtracting
  // Resist X
  if (modifications.resist > 0 && !ignoreResitance) {
    dmg.source += ` - Resistance(${modifications.resist})`;
    dmg.value -= modifications.resist;
  }
  // Vulnerable X
  if (modifications.vulnerable > 0) {
    dmg.source += ` + Vulnerability(${modifications.vulnerable})`;
    dmg.value += modifications.vulnerable; 
  }

  // STEP 2 - Doubling & Halving
  // Immunity
  if (modifications.immune && !ignoreImmune) {
    dmg.source = "Resistance(Immune)";
    dmg.value = 0;
    return dmg;
  }
  // Resistance and Vulnerability - cancel each other
  if ((modifications.resistance && !ignoreResitance) && modifications.vulnerability) return dmg;
  // Resistance (reduce minimum 1)
  if (modifications.resistance && !ignoreResitance) {
    const newValue = Math.ceil(dmg.value/2);
    if (newValue === dmg.value) dmg.value = dmg.value - 1;
    else dmg.value = newValue;
    dmg.source += ` - Resistance(Half)`;
  } 
  // Vulnerability (adds minimum 1)
  if (modifications.vulnerability) {
    const newValue = Math.ceil(dmg.value * 2);
    if (newValue === dmg.value) dmg.value = dmg.value + 1;
    else dmg.value = newValue;
    dmg.source += ` + Vulnerability(Double)`;
  }
  return dmg;
}
function _applyDamageReduction(hit, dmg, damageReduction, ignore) {
  if (hit >= 5) return; // DR is applied only for normal hits;

  const dmgType = dmg.type;
  let drKey = "";
  if (CONFIG.DC20RPG.DROPDOWN_DATA.physicalDamageTypes[dmgType]) drKey = "pdr";
  if (CONFIG.DC20RPG.DROPDOWN_DATA.elementalDamageTypes[dmgType]) drKey = "edr";
  if (CONFIG.DC20RPG.DROPDOWN_DATA.mysticalDamageTypes[dmgType]) drKey = "mdr";
  if (!drKey) return;
  if (ignore[drKey]) return;
  
  // If dr is active we want to add resistance to specific damage types
  const activeDr = damageReduction[drKey].active;
  if (activeDr) {
    switch (drKey) {
      case "pdr":
        damageReduction.damageTypes.bludgeoning.resistance = true;
        damageReduction.damageTypes.slashing.resistance = true;
        damageReduction.damageTypes.piercing.resistance = true;
        break;
      case "mdr":
        damageReduction.damageTypes.umbral.resistance = true;
        damageReduction.damageTypes.radiant.resistance = true;
        damageReduction.damageTypes.psychic.resistance = true;
        break;
      case "edr":
        damageReduction.damageTypes.sonic.resistance = true;
        damageReduction.damageTypes.poison.resistance = true;
        damageReduction.damageTypes.corrosion.resistance = true;
        damageReduction.damageTypes.lightning.resistance = true;
        damageReduction.damageTypes.fire.resistance = true;
        damageReduction.damageTypes.cold.resistance = true;
        break;
    }
  }
}
function _applyFlatReduction(toApply, flatValue, label) {
  if (flatValue > 0) toApply.source += ` - ${label} Reduction(${flatValue})`;
  if (flatValue < 0) toApply.source += ` + Extra ${label}(${Math.abs(flatValue)})`;
  toApply.value -= flatValue;
  return toApply;
}
function _applyFlatReductionHalf(toApply, flatHalf, label) {
  if (flatHalf) {
    toApply.source += ` - ${label} Reduction(Half)`;
    toApply.value = Math.ceil(toApply.value/2);  
  }
  return toApply;
}
function _applyCritSuccess(toApply, isCritHit, canCrit) {
  if (isCritHit && canCrit) {
    toApply.source += " + Critical";
    toApply.value += 2;
  }
  return toApply;
}
function _applyCritFail(toApply, isAttack) {
  toApply.value = 0;
  toApply.source = isAttack ? "Critical Miss" : "Critical Fail";
  return toApply;
}
function _applyAttackMiss(toApply) {
  toApply.value = 0;
  toApply.source = "Miss"
  return toApply;
}
function _applyHalfDamageOnMiss(toApply) {
  toApply.source += ` - Miss(Half Damage)`;
  toApply.value = Math.ceil(toApply.value/2);  
  return toApply;
}
function _finalAdjustments(toApply) {
  if (toApply.value < 0) toApply.value = 0;
  toApply.value = Math.ceil(toApply.value);
  return toApply;
}

function _outcomeLabel(hit, critHit, critMiss, skipFor) {
  let label = "";

  // Miss
  if (critMiss) return "Critical Miss";
  if (hit < 0) return "Miss";

  // Crit Hit
  if (critHit && !skipFor?.crit) label += "Critical ";

  // Hit
  if (hit >= 0 && hit < 5) {
    label += "Hit";
    return label;
  }
  if (skipFor?.heavy) {
    label += "Hit";
    return label;
  }

  // Heavy
  if (hit >= 5 && hit < 10)  {
    label += "Heavy Hit";
    return label;
  }
  if (skipFor?.brutal) {
    label += "Heavy Hit";
    return label;
  }

  // Brutal
  if (hit >= 10 && hit < 15) label += "Brutal Hit";
  if (hit >= 15)             label += "Brutal Hit(+)";
  return label;
}

//========================
//         OTHER         =
//========================
export function collectTargetSpecificFormulas(target, data, rolls) {
  // Clear any target specific rolls if those were added before
  rolls.dmg = rolls.dmg.filter(roll => !roll.clear.targetSpecific);
  rolls.heal = rolls.heal.filter(roll => !roll.clear.targetSpecific);

  const mathing = target ? _matchingConditionals(target, data) : [];
  for (const cond of mathing) {
    if (cond.addsNewFormula) {
      const type = cond.formula.type;
      const value = evaluateDicelessFormula(cond.formula.formula)._total;
      const source = cond.name;
      const dontMerge = cond.formula.dontMerge;
      const overrideDefence = cond.formula.overrideDefence;
      if (cond.formula.category === "damage") {
        rolls.dmg.push(_toRoll(value, type, source, dontMerge, overrideDefence))
      }
      if (cond.formula.category === "healing") {
        rolls.heal.push(_toRoll(value, type, source, dontMerge, overrideDefence))
      }
    }
  }
  return rolls;
}

function _toRoll(value, type, source, dontMerge, overrideDefence) {
  return {
    modified: {
      _total: value,
      modifierSources: source,
      type: type,
      dontMerge: dontMerge,
      overrideDefence: overrideDefence,
      targetSpecific: true,
    },
    clear: {
      _total: value,
      modifierSources: source,
      type: type,
      dontMerge: dontMerge,
      overrideDefence: overrideDefence,
      targetSpecific: true,
    }
  }
}

export function collectTargetSpecificEffects(target, data) {
  const mathing = target ? _matchingConditionals(target, data) : [];
  const effects = [];
  for (const cond of mathing) {
    if (cond.effect) effects.push(cond.effect);
  }
  return effects;
}

export function collectTargetSpecificRollRequests(target, data) {
  const mathing = target ? _matchingConditionals(target, data) : [];
  const rollRequests = {
    contests: [],
    saves: []
  }
  for (const cond of mathing) {
    if (cond.addsNewRollRequest && cond.rollRequest.category !== "") {
      const request = cond.rollRequest;
      if (request.category === "save") {
        request.label = getLabelFromKey(request.saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes);
        request.title = game.i18n.localize("dc20rpg.chat.targetSpecificRoll") + cond.name;
        rollRequests.saves.push(request);
      }
      if (request.category === "contest") {
        request.label = getLabelFromKey(request.contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests);
        request.title = game.i18n.localize("dc20rpg.chat.targetSpecificRoll") + cond.name;
        rollRequests.contests.push(request);
      }
    }
  }
  return rollRequests;
}