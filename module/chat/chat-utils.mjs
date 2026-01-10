import { calculateForTarget, calculateNoTarget, collectTargetSpecificEffects, collectTargetSpecificRollRequests, getAttackOutcome, collectTargetSpecificFormulas } from "../helpers/targets.mjs";
import { generateKey } from "../helpers/utils.mjs";


export function enhanceOtherRolls(winningRoll, otherRolls, data, target) {
  if (otherRolls.length === 0) return;

  if (target) target.other = [];
  otherRolls.forEach(roll => {
    if (target && roll.perTarget) {
      if (target.rollOutcome) {
        const rollOutcome = target.rollOutcome;
        const otherRoll = _degreeOfSuccess(rollOutcome.against, data.isCritMiss, rollOutcome.total, roll, true);
        target.other.push(otherRoll);
      }
    }
    if (!target && winningRoll) {
      if (data?.againstDC && data.checkDC) {
        roll = _degreeOfSuccess(winningRoll._total, data.isCritMiss, data.checkDC, roll);
      }
    }
  })
}

//========================================
//           TARGET PREPARATION          =
//========================================
/**
 * Add informations such as hit/miss and expected damage/healing done.
 */
export function enhanceTarget(target, rolls, details, applierId, showModifiedStore) {
  const actionType = details.actionType;
  const winner = rolls?.winningRoll;
  const preventCriticalHit = !!target?.system?.globalModifier?.prevent?.criticalHit;
  
  // Prepare Common Data
  const data = {
    isAttack: actionType === "attack",
    isCheck: actionType === "check",
    canCrit: details.canCrit,
    rollTotal: winner?._total,
    isCritHit: winner?.crit && !preventCriticalHit,
    isCritMiss: winner?.fail,
    conditionals: details.conditionals,
    applierId: applierId
  }
  // Prepare Attack Data
  if (actionType === "attack") {
    data.defenceKey = details.targetDefence;
    data.halfDmgOnMiss = details.halfDmgOnMiss;
    data.skipFor = details.skipBonusDamage;
    if (!target.noTarget) target.attackOutcome = getAttackOutcome(target, data);
  }
  // Prepare Check Data
  if (actionType === "check") {
    data.checkDC = details.checkDetails?.checkDC;
    data.againstDC = details.checkDetails?.againstDC;
  }

  // Prepare target specific rolls
  rolls = collectTargetSpecificFormulas(target, data, rolls);
  if (game.settings.get("dc20rpg", "mergeDamageTypes")) _mergeFormulasByType(rolls);

  // Prepare final damage and healing
  target.dmg = _prepareRolls(rolls.dmg, target, data, "damage", showModifiedStore);
  target.heal = _prepareRolls(rolls.heal, target, data, "healing", showModifiedStore);
  enhanceOtherRolls(winner, rolls.other, data, target);

  // Prepare additional target specific fields
  target.effects = collectTargetSpecificEffects(target, data);
  target.rollRequests = collectTargetSpecificRollRequests(target, data);
}

function _prepareRolls(rolls, target, data, rollType, showModifiedStore) {
  const prepared = {};
  for (const rll of rolls) {
    let showModified = showModifiedStore.get(target.id+"#"+rll.modified.id);
    if (showModified === undefined) {
      showModified = Object.keys(prepared).length === 0; // By default only 1st roll should be modified
      showModifiedStore.set(target.id+"#"+rll.modified.id, showModified);
    }
    const roll = _formatRoll(rll);
    const calculateData = {...data, isDamage: rollType === "damage", isHealing: rollType === "healing"};
    
    let defenceOverriden = false;
    delete calculateData.hit; // We always want to calculate hit value in the calculateForTarget function
    if (rll.modified.overrideDefence && rll.modified.overrideDefence !== calculateData.defenceKey) {
      calculateData.defenceKey = rll.modified.overrideDefence;
      defenceOverriden = true;
    }

    const finalRoll = target.noTarget ? calculateNoTarget(roll, calculateData) : calculateForTarget(target, roll, calculateData);
    finalRoll.showModified = showModified;
    finalRoll.targetSpecific = rll.targetSpecific;
    if (defenceOverriden) finalRoll.overridenDefence = rll.modified.overrideDefence;
    prepared[rll.modified.id] = finalRoll;
  }
  return prepared;
}

function _formatRoll(roll) {
  return {
    modified: {
      value: roll.modified._total,
      source: roll.modified.modifierSources,
      type: roll.modified.type,
      each5Value: roll.modified.each5Roll?.total || 0,
      failValue: roll.modified.failRoll?.total || 0,
    },
    clear: {
      value: roll.clear._total,
      source: roll.clear.modifierSources,
      type: roll.clear.type
    }
  }
}

function _degreeOfSuccess(checkValue, natOne, checkDC, roll, contest) {
  const modified = contest ? {...roll} : roll;
  modified.source = modified.modifierSources;

  // Check Failed
  if (natOne || (checkValue < checkDC)) {
    const failRoll = roll.failRoll;
    if (failRoll) {
      modified.source = modified.source.replace("Base Value", "");
      if (contest) modified.source = "[Contest Lost] " + modified.source;
      else modified.source = "[Check Failed] " + modified.source;
      
      modified._formula = failRoll.formula;
      modified._total = failRoll.total;
      modified.terms = failRoll.terms;
    }
  }
  // Check succeed by 5 or more
  else if (checkValue >= checkDC + 5) {
    const each5Roll = roll.each5Roll;
    if (each5Roll) {
      const degree = Math.floor((checkValue - checkDC) / 5);
      const formula = degree > 1 ? `(${degree} * ${each5Roll.formula})` : each5Roll.formula;

      modified.source = modified.source.replace("Base Value", "");
      if (contest) modified.source = `[Contest Won over ${(degree * 5)}] ${modified.source}`;
      else modified.source = `[Check Succeeded over ${(degree * 5)}] ${modified.source}`;
      
      modified._formula += ` + ${formula}`;
      modified._total += (degree * each5Roll.total);
    }
  }
  return modified;
}

function _mergeFormulasByType(rolls) {
  const dmgByType = new Map();
  const healByType = new Map();

  // Damage Rolls
  for (const roll of rolls.dmg) {
    if (roll.modified.dontMerge || roll.modified.overrideDefence) {
      dmgByType.set(generateKey(), roll);
      continue;
    }

    const type = roll.modified.type;
    if (dmgByType.has(type)) {
      const rollByType = dmgByType.get(type);
      rollByType.modified._total += roll.clear._total;  // We want to add roll without modifications
      rollByType.clear._total += roll.clear._total;     // in both cases (clear and modified)
      rollByType.modified.modifierSources += ` + ${roll.clear.modifierSources}`;
      rollByType.clear.modifierSources += ` + ${roll.clear.modifierSources}`;
    }
    else dmgByType.set(type, roll);
  }

  // Healing Rolls
  for (const roll of rolls.heal) {
    if (roll.modified.dontMerge) {
      healByType.set(generateKey(), roll);
      continue;
    }

    const type = roll.modified.type;
    if (healByType.has(type)) {
      const rollByType = healByType.get(type);
      rollByType.modified._total += roll.clear._total;  // We want to add roll without modifications
      rollByType.clear._total += roll.clear._total;     // in both cases (clear and modified)
      rollByType.modified.modifierSources += ` + ${roll.clear.modifierSources}`;
      rollByType.clear.modifierSources += ` + ${roll.clear.modifierSources}`;
    }
    else healByType.set(type, roll);
  }

  rolls.dmg = Array.from(dmgByType.values());
  rolls.heal = Array.from(healByType.values());
}

//========================================
//            ROLL PREPARATION           =
//========================================
export function prepareRollsInChatFormat(rolls) {
  const coreRoll = rolls.core ? _packedRoll(rolls.core) : null;
  const otherRolls = [];
  const dmgRolls = [];
  const healingRolls = [];
  if (rolls.formula) {
    rolls.formula.forEach(roll => {
      if (roll.modified.category === "other") {
        otherRolls.push(_packedRoll(roll.modified));
      }
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
    core: coreRoll,
    other: otherRolls,
    dmg: dmgRolls,
    heal: healingRolls
  }
}
// We need to pack rolls in order to contain them after rendering message.
function _packedRoll(roll) {
  return {...roll};
}