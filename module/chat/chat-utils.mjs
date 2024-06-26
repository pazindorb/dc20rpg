import { generateKey } from "../helpers/utils.mjs";

/**
 * Add informations such as hit/miss and expected damage/healing done.
 */
export function enhanceTarget(target, actionType, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals) {
  // When no target is selected we only need to prepare data to show, no calculations needed
  if (target.noTarget) _noTargetRoll(target, dmgRolls, healRolls);

  // Attack Rolls are modified by things like Hit level, we need to consider those
  else if (["attack", "dynamic"].includes(actionType)) {
    _attackRoll(target, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals);
  }
  else _nonAttackRoll(target, dmgRolls, healRolls, conditionals);
}
function _attackRoll(target, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals) {
  const defence = target.system.defences[defenceKey].value;
  const critMiss = winningRoll.fail;
  const critHit = winningRoll.crit;
  const hit = winningRoll._total - defence;

  // Prepare hit outcome label
  let outcome = {};
  if (critMiss || hit < 0) {
    outcome = {
      label: _outcomeLabel(hit, critHit, critMiss),
      miss: true
    }
  }
  else {
    outcome = {
      label: _outcomeLabel(hit, critHit, critMiss)
    }
  }

  _determineDamage(target, dmgRolls, conditionals, winningRoll, hit, halfDmgOnMiss);
  _determineHealing(target, healRolls);
  target.attackOutcome = outcome;
}
function _nonAttackRoll(target, dmgRolls, healRolls, conditionals) {
  _determineDamage(target, dmgRolls, conditionals);
  _determineHealing(target, healRolls);
}
function _noTargetRoll(target, dmgRolls, healRolls) {
  _determineDamageNoMods(target, dmgRolls);
  _determineHealing(target, healRolls);
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
function _determineHealing(target, healRolls) {
  if (healRolls.length === 0) target.heal = {};

  const heal = {};
  healRolls.forEach(roll => {
    const showModified = Object.keys(heal).length === 0; // By default only 1st roll should be modified
    const modified = {
      value: roll.modified._total,
      source: roll.modified.modifierSources,
      healType: roll.modified.type
    }
    const clear = {
      value: roll.clear._total,
      source: roll.clear.modifierSources,
      healType: roll.clear.type
    }
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
function _determineDamageNoMods(target, dmgRolls) {
  if (dmgRolls.length === 0) target.dmg = {};

  const dmg = {};
  dmgRolls.forEach(roll => {
    const showModified = Object.keys(dmg).length === 0; // By default only 1st roll should be modified
    const modified = {
      value: roll.modified._total,
      source: roll.modified.modifierSources,
      dmgType: roll.modified.type
    }
    const clear = {
      value: roll.clear._total,
      source: roll.clear.modifierSources,
      dmgType: roll.clear.type
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
function _determineDamage(target, dmgRolls, conditionals, winningRoll, hit, halfDmgOnMiss) {
  if (dmgRolls.length === 0) target.dmg = {};

  const dmg = {};
  dmgRolls.forEach(roll => {
    const showModified = Object.keys(dmg).length === 0; // By default only 1st roll should be modified

    // If there is no hit it means it is not and attack roll
    let modified = {};
    let clear = {};
    if (hit !== undefined) {
      const crit = winningRoll.crit;
      const fail = winningRoll.fail;
      modified = _modifiedAttackDamageRoll(target, roll.modified, conditionals, hit, crit, fail, halfDmgOnMiss);
      clear = _clearAttackDamageRoll(target, roll.clear, hit, crit, fail, halfDmgOnMiss);
    }
    else {  
      modified = _modifiedDamageRoll(target, roll.modified, conditionals);
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
function _modifiedAttackDamageRoll(target, roll, conditionals, hit, isCritHit, isCritMiss, halfDmgOnMiss) {
  const damageReduction = target.system.damageReduction;

  // Damage from enchants and similar effects
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }

  let halfDamage = false;   // If hit misses we want to set that flag to true, we might need it later.
  // Attack Check Missed
  if (!isCritHit && (hit < 0 || isCritMiss)) {
    halfDamage = true;
    if (!halfDmgOnMiss) {
      return {
        value: 0,
        dmgType: roll.type,
        source: isCritMiss ? "Critical Miss" : "Miss"
      }
    }
  }
  dmg = _applyAttackCheckDamageModifications(dmg, hit, damageReduction);
  dmg = _applyConditionals(dmg, target, conditionals, hit, isCritHit);
  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other

  // Half the final dmg taken on miss 
  if (halfDamage) {
    dmg.source += ` - Miss(Half Damage)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }
  return dmg;
}
function _clearAttackDamageRoll(target, roll, hit, isCritHit, isCritMiss, halfDmgOnMiss) {
  const damageReduction = target.system.damageReduction;
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }

  let halfDamage = false;   // If hit misses we want to set that flag to true, we might need it later.
  // Attack Check Missed
  if (!isCritHit && (hit < 0 || isCritMiss)) {
    halfDamage = true;
    if (!halfDmgOnMiss) {
      return {
        value: 0,
        dmgType: roll.type,
        source: isCritMiss ? "Critical Miss" : "Miss"
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
function _modifiedDamageRoll(target, roll, conditionals) {
  const damageReduction = target.system.damageReduction;
  let dmg = {
    value: roll._total,
    source: roll.modifierSources,
    dmgType: roll.type
  }
  dmg = _applyConditionals(dmg, target, conditionals);
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
  const extraDmg = Math.floor(hit/5);
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
function _applyDamageModifications(dmg, damageReduction) {
  const dmgType = dmg.dmgType;
  if (dmgType != "true" && dmgType != "") return dmg; // True dmg cannot be modified
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
    dmg.source += ` + Vulnerability(Half)`;
    dmg.value = dmg.value * 2; 
  }
  return dmg;
}

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