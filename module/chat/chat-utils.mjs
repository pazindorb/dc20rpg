import { generateKey } from "../helpers/utils.mjs";

//========================================
//           TARGET PREPARATION          =
//========================================
/**
 * Add informations such as hit/miss and expected damage/healing done.
 */
export function enhanceTarget(target, actionType, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals, impact, canCrit) {
  const data = {
    isCritHit: winningRoll.crit,
    isCritMiss: winningRoll.fail,
    canCrit: canCrit,
    defenceKey: defenceKey,
    halfDmgOnMiss: halfDmgOnMiss,
    impact: impact,
    conditionals: conditionals
  }

  // When no target is selected we only need to prepare data to show, no calculations needed
  if (target.noTarget) _noTargetRoll(target, dmgRolls, healRolls, data);

  // Attack Rolls are modified by things like Hit level, we need to consider those
  else if (["attack", "dynamic"].includes(actionType)) {
    _attackRoll(target, winningRoll, dmgRolls, healRolls, data);
  }
  else _nonAttackRoll(target, dmgRolls, healRolls, data);
}
function _attackRoll(target, winningRoll, dmgRolls, healRolls, data) {
  const defence = target.system.defences[data.defenceKey].value;
  data.hit = winningRoll._total - defence;

  // Prepare hit outcome label
  let outcome = {};
  if (data.isCritMiss || data.hit < 0) {
    outcome = {
      label: _outcomeLabel(data.hit, data.isCritHit, data.isCritMiss),
      miss: true
    }
  }
  else {
    outcome = {
      label: _outcomeLabel(data.hit, data.isCritHit, data.isCritMiss)
    }
  }

  _determineDamage(target, dmgRolls, data);
  _determineHealing(target, healRolls, data);
  target.attackOutcome = outcome;
}
function _nonAttackRoll(target, dmgRolls, healRolls, data) {
  _determineDamage(target, dmgRolls, data);
  _determineHealing(target, healRolls, data);
}
function _noTargetRoll(target, dmgRolls, healRolls, data) {
  _determineDamageNoMods(target, dmgRolls, data);
  _determineHealing(target, healRolls, data);
}

function _outcomeLabel(hit, critHit, critMiss) {
  let label = "";

  // Miss
  if (critMiss) return "Critical Miss";
  if (hit < 0) return "Miss";

  // Crit Hit
  if (critHit) label += "Critical ";
  
  // Hit
  if (hit >= 0 && hit < 5)    label += "Hit";
  if (hit >= 5 && hit < 10)   label += "Heavy Hit";
  if (hit >= 10 && hit < 15)  label += "Brutal Hit";
  if (hit >= 15)              label += "Brutal Hit(+)";

  return label;
}
function _determineHealing(target, healRolls, data) {
  if (healRolls.length === 0) target.heal = {};

  const heal = {};
  healRolls.forEach(roll => {
    const showModified = Object.keys(heal).length === 0; // By default only 1st roll should be modified
    let modified = {
      value: roll.modified._total,
      source: roll.modified.modifierSources,
      healType: roll.modified.type
    }
    const clear = {
      value: roll.clear._total,
      source: roll.clear.modifierSources,
      healType: roll.clear.type
    }
    modified = _applyCrit(modified, data.isCritHit, data.canCrit);
    const key = generateKey();
    heal[key] = {
      clear: clear,
      modified: modified,
      showModified: showModified,
      key: key
    };
  });
  target.heal = heal;
}
function _determineDamageNoMods(target, dmgRolls, data) {
  if (dmgRolls.length === 0) target.dmg = {};

  const dmg = {};
  dmgRolls.forEach(roll => {
    const showModified = Object.keys(dmg).length === 0; // By default only 1st roll should be modified
    let modified = {
      value: roll.modified._total,
      source: roll.modified.modifierSources,
      dmgType: roll.modified.type
    }
    const clear = {
      value: roll.clear._total,
      source: roll.clear.modifierSources,
      dmgType: roll.clear.type
    }
    modified = _applyCrit(modified, data.isCritHit, data.canCrit);
    const key = generateKey();
    dmg[key] = {
      clear: clear,
      modified: modified,
      showModified: showModified,
      key: key
    };
  });
  target.dmg = dmg;
}
function _determineDamage(target, dmgRolls, data) {
  if (dmgRolls.length === 0) target.dmg = {};

  const dmg = {};
  dmgRolls.forEach(roll => {
    const showModified = Object.keys(dmg).length === 0; // By default only 1st roll should be modified

    // If there is no hit it means it is not and attack roll
    let modified = {};
    let clear = {};
    if (data.hit !== undefined) {
      modified = _modifiedAttackDamageRoll(target, roll.modified, data);
      clear = _clearAttackDamageRoll(target, roll.clear, data);
    }
    else {  
      modified = _modifiedDamageRoll(target, roll.modified, data);
      clear = _clearDamageRoll(target, roll.clear);
    }
    
    const key = generateKey();
    dmg[key] = {
      clear: clear,
      modified: modified,
      showModified: showModified,
      key: key
    };
  });
  target.dmg = dmg;
}
function _modifiedAttackDamageRoll(target, roll, data) {
  const damageReduction = target.system.damageReduction;

  // Damage from enchants and similar effects
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }

  let halfDamage = false;   // If hit misses we want to set that flag to true, we might need it later.
  // Attack Check Missed
  if (!data.isCritHit && (data.hit < 0 || data.isCritMiss)) {
    halfDamage = true;
    if (!data.halfDmgOnMiss || data.isCritMiss) {
      return {
        value: 0,
        dmgType: roll.type,
        source: data.isCritMiss ? "Critical Miss" : "Miss"
      }
    }
  }
  dmg = _applyCrit(dmg, data.isCritHit, data.canCrit);
  dmg = _applyAttackCheckDamageModifications(dmg, data.hit, damageReduction, data.impact);
  dmg = _applyConditionals(dmg, target, data.conditionals, data.hit, data.isCritHit);
  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other

  // Half the final dmg taken on miss 
  if (halfDamage) {
    dmg.source += ` - Miss(Half Damage)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }
  return dmg;
}
function _clearAttackDamageRoll(target, roll, data) {
  const damageReduction = target.system.damageReduction;
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }

  let halfDamage = false;   // If hit misses we want to set that flag to true, we might need it later.
  // Attack Check Missed
  if (!data.isCritHit && (data.hit < 0 || data.isCritMiss)) {
    halfDamage = true;
    if (!data.halfDmgOnMiss || data.isCritMiss) {
      return {
        value: 0,
        dmgType: roll.type,
        source: data.isCritMiss ? "Critical Miss" : "Miss"
      }
    }
  }

  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other

    // Half the final dmg taken on miss 
    if (halfDamage) {
      dmg.source += ` - Miss(Half Damage)`;
      dmg.value = Math.ceil(dmg.value/2);  
    }
    return dmg;
}
function _modifiedDamageRoll(target, roll, data) {
  const damageReduction = target.system.damageReduction;
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }
  dmg = _applyConditionals(dmg, target, data.conditionals);
  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other
  return dmg;
}
function _clearDamageRoll(target, roll) {
  const damageReduction = target.system.damageReduction;
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }
  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other
  return dmg;
}
function _applyAttackCheckDamageModifications(dmg, hit, damageReduction, impact) {
  const extraDmg = Math.max(0, Math.floor(hit/5)); // We don't want to have negative extra damage
  const dmgType = dmg.dmgType;

  // Apply damage reduction
  const drKey = ["radiant", "umbral", "sonic", "psychic"].includes(dmgType) ? "mdr" : "pdr";
  const dr = dmgType === "true" ? 0 : damageReduction[drKey].value;
  if (extraDmg <= 0 && dr > 0) {
    dmg.source += " - Damage Reduction";
    dmg.value -= dr
    return dmg; 
  }

  // Add dmg from Heavy Hit, Brutal Hit etc.
  if (extraDmg === 1) dmg.source += " + Heavy Hit";
  if (extraDmg === 2) dmg.source += " + Brutal Hit";
  if (extraDmg >= 3) dmg.source += ` + Brutal Hit(over ${extraDmg * 5})`;
  dmg.value += extraDmg

  // Check impact property 
  if (extraDmg >= 1 && impact) {
    dmg.source += " + Impact";
    dmg.value += 1
  } 
  return dmg;  
}
function _applyConditionals(dmg, target, conditionals, hit, isCritHit) {
  // Helper method to check conditions
  target.hasAnyCondition = (condsToFind) => target.conditions.some(cond => condsToFind.includes(cond))

  conditionals.forEach(con => {
    const condition = con.condition;
    try {
    const conFun = new Function('hit', 'crit', 'target', `return ${condition};`);
    if (conFun(hit, isCritHit, target)) {
      dmg.source += ` + ${con.name}`;
      dmg.value += parseInt(con.bonus);
    }

  } catch (e) {
    console.warn(`Cannot evaluate '${condition}' condition: ${e}`);
    return dmg;
  }
  });
  return dmg;
}
export function _applyDamageModifications(dmg, damageReduction) {
  const dmgType = dmg.dmgType;
  if (dmgType == "true" || dmgType == "") return dmg; // True dmg cannot be modified
  const modifications = damageReduction.damageTypes[dmgType];

  // STEP 1 - Adding & Subtracting
  // Resist X
  if (modifications.resist > 0) {
    dmg.source += ` - Resistance(${modifications.resist})`;
    dmg.value -= modifications.resist;
  }
  // Vulnerable X
  if (modifications.vulnerable > 0) {
    dmg.source += ` + Vulnerability(${modifications.vulnerable})`;
    dmg.value += modifications.vulnerable; 
  }
  dmg.value = dmg.value > 0 ? dmg.value : 0;

  // STEP 2 - Doubling & Halving
  // Immunity
  if (modifications.immune) {
    dmg.source = "Resistance(Immune)";
    dmg.value = 0;
    return dmg;
  }
  // Resistance and Vulnerability - cancel each other
  if (modifications.resistance && modifications.vulnerability) return dmg;
  // Resistance
  if (modifications.resistance) {
    dmg.source += ` - Resistance(Half)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }
  // Vulnerability
  if (modifications.vulnerability) {
    dmg.source += ` + Vulnerability(Double)`;
    dmg.value = dmg.value * 2; 
  }
  return dmg;
}
function _applyCrit(toApply, isCritHit, canCrit) {
  if (isCritHit && canCrit) {
    toApply.source += " + Critical";
    toApply.value += 2;
  }
  return toApply;
}

//========================================
//            ROLL PREPARATION           =
//========================================
export function prepareRollsInChatFormat(rolls) {
  const boxRolls = []; // Core and Other rolls
  const dmgRolls = [];
  const healingRolls = [];
  if (rolls.core) rolls.core.forEach(roll => boxRolls.push(_packedRoll(roll)));
  if (rolls.formula) {
    rolls.formula.forEach(roll => {
      if (roll.clear.category === "other") boxRolls.push(_packedRoll(roll.clear)); // We do not modify Other rolls
      if (roll.clear.category === "damage") {
        dmgRolls.push({
          modified: _packedRoll(roll.modified),
          clear: _packedRoll(roll.clear)
        });
      }
      if (roll.clear.category === "healing") {
        healingRolls.push({
          modified: _packedRoll(roll.modified),
          clear: _packedRoll(roll.clear)
        });
      }
    });
  }
  return {
    box: boxRolls,
    dmg: dmgRolls,
    heal: healingRolls,
    winningRoll: _packedRoll(rolls.winningRoll)
  }
}
// We need to pack rolls in order to contain them after rendering message.
function _packedRoll(roll) {
  return {...roll};
}