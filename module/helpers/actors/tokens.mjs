import { generateKey } from "../utils.mjs";
import { runHealthThresholdsCheck } from "./resources.mjs";

export function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

export function updateActorHp(actor, updateData) {
  if (updateData.system && updateData.system.resources && updateData.system.resources.health) {
    const newHealth = updateData.system.resources.health;
    const actorsHealth = actor.system.resources.health;
    const maxHp = actorsHealth.max;
    const currentHp = actorsHealth.current;
    const tempHp = actorsHealth.temp || 0;

    // When value (temporary + current hp) was changed
    if (newHealth.value !== undefined) {
      const newValue = newHealth.value;
      const oldValue = actorsHealth.value;
  
      if (newValue >= oldValue) {
        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        newHealth.current = newCurrentHp;
        newHealth.temp = newTempHp;
        newHealth.value = newCurrentHp + newTempHp;
      }
  
      else {
        const valueDif = oldValue - newValue;
        const remainingTempHp = tempHp - valueDif;
        if (remainingTempHp <= 0) { // It is a negative value we want to subtract from currentHp
          newHealth.temp = null;
          newHealth.current = currentHp + remainingTempHp; 
          newHealth.value = currentHp + remainingTempHp;
        }
        else {
          newHealth.temp = remainingTempHp;
          newHealth.value = currentHp + remainingTempHp;
        }
      }
    }

    // When only temporary HP was changed
    else if (newHealth.temp !== undefined) {
      newHealth.value = newHealth.temp + currentHp;
    }

    // When only current HP was changed
    else if (newHealth.current !== undefined) {
      newHealth.current = newHealth.current >= maxHp ? maxHp : newHealth.current;
      newHealth.value = newHealth.current + tempHp;
    }

    if (newHealth.current !== undefined) {
      const tresholdData = runHealthThresholdsCheck(currentHp, newHealth.current, maxHp, actor);
      foundry.utils.mergeObject(updateData, tresholdData)
    }
    updateData.system.resources.health = newHealth;
  }
  return updateData;
}

/**
 * Called when new actor is being created, makes simple pre-configuration on actor's prototype token depending on its type.
 */
export function preConfigurePrototype(actor) {
  const prototypeToken = actor.prototypeToken;
  prototypeToken.displayBars = 20;
  prototypeToken.displayName = 20;
  if (actor.type === "character") {
    prototypeToken.actorLink = true;
    prototypeToken.disposition = 1;
  }
  actor.update({['prototypeToken'] : prototypeToken});
}

/**
 * Add informations such as hit/miss and expected damage/healing done.
 */
export function enhanceTarget(target, actionType, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals) {
  if (["attack", "dynamic"].includes(actionType)) 
    return _attackRoll(target, winningRoll, dmgRolls, healRolls, defenceKey, halfDmgOnMiss, conditionals);
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

  _determineDamage(target, winningRoll, dmgRolls, hit, halfDmgOnMiss, conditionals);
  _determineHealing(target, healRolls);
  target.attackOutcome = outcome;
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

function _check() {

}

function _determineDamage(target, winningRoll, dmgRolls, hit, halfDmgOnMiss, conditionals) {
  if (dmgRolls.length === 0) target.dmg = {};

  const crit = winningRoll.crit;
  const fail = winningRoll.fail;

  const dmg = {};
  dmgRolls.forEach(roll => {
    const showModified = Object.keys(dmg).length === 0; // By default only 1st roll should be modified
    const modified = _modifiedDamageRoll(target, roll.modified, hit, crit, fail, halfDmgOnMiss, conditionals);
    const clear = _clearDamageRoll(target, roll.clear, hit, crit, fail, halfDmgOnMiss);
    const key = generateKey();
    dmg[generateKey()] = {
      clear: clear,
      modified: modified,
      showModified: showModified,
      key: key
    };
  });
  target.dmg = dmg;
}

function _modifiedDamageRoll(target, roll, hit, isCritHit, isCritMiss, halfDmgOnMiss, conditionals) {
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
  dmg = _applyConditionals(dmg, target, hit, isCritHit, conditionals);
  dmg = _applyDamageModifications(dmg, damageReduction); // Vulnerability, Resistance and other

  // Half the final dmg taken on miss 
  if (halfDamage) {
    dmg.source += ` - Miss(Half Damage)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }
  return dmg;
}

function _clearDamageRoll(target, roll, hit, isCritHit, isCritMiss, halfDmgOnMiss) {
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

function _applyConditionals(dmg, target, hit, isCritHit, conditionals) {
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
    heal[generateKey()] = {
      clear: clear,
      modified: modified,
      showModified: showModified,
      key: key
    };
  });
  target.heal = heal;
}