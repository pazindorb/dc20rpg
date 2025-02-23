import { calculateForTarget, calculateNoTarget, collectTargetSpecificEffects, collectTargetSpecificRollRequests, getAttackOutcome, collectTargetSpecificFormulas } from "../helpers/targets.mjs";
import { generateKey } from "../helpers/utils.mjs";


export function enhanceOtherRolls(winningRoll, otherRolls, checkDetails) {
  if (checkDetails?.checkDC && checkDetails?.againstDC) {
    _degreeOfSuccess(checkDetails.checkDC, winningRoll, otherRolls, true);
  }
}

//========================================
//           TARGET PREPARATION          =
//========================================
/**
 * Add informations such as hit/miss and expected damage/healing done.
 */
export function enhanceTarget(target, rolls, details) {
  const actionType = details.actionType;
  const winner = rolls.winningRoll;
  
  // Prepare Common Data
  const data = {
    isAttack: actionType === "attack",
    isCheck: actionType === "check",
    canCrit: details.canCrit,
    rollTotal: winner?._total,
    isCritHit: winner?.crit,
    isCritMiss: winner?.fail,
    conditionals: details.conditionals
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
  target.dmg = _prepareRolls(rolls.dmg, target, data, true);
  target.heal = _prepareRolls(rolls.heal, target, data, false);

  // Prepare additional target specific fields
  target.effects = collectTargetSpecificEffects(target, data);
  target.rollRequests = collectTargetSpecificRollRequests(target, data);
}

function _prepareRolls(rolls, target, data, isDamage) {
  const prepared = {};
  for (const rll of rolls) {
    const showModified = Object.keys(prepared).length === 0; // By default only 1st roll should be modified
    const roll = _formatRoll(rll);
    const calculateData = {...data, isDamage: isDamage};
    const finalRoll = target.noTarget ? calculateNoTarget(roll, calculateData) : calculateForTarget(target, roll, calculateData);
    const key = generateKey();
    finalRoll.showModified = showModified;
    finalRoll.targetSpecific = rll.targetSpecific;
    prepared[key] = finalRoll;
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

function _degreeOfSuccess(checkDC, winningRoll, rolls, otherRoll) {
  const checkValue = winningRoll._total;
  const natOne = winningRoll.fail;

  if (rolls) rolls.forEach(roll => {
    const modified = otherRoll ? roll : roll.modified;
    // Check Failed
    if (natOne || (checkValue < checkDC)) {
      const failRoll = modified.failRoll;
      if (failRoll) {
        modified.modifierSources = modified.modifierSources.replace("Base Value", "Check Failed");;
        modified._formula = failRoll.formula;
        modified._total = failRoll.total;
        modified.terms = failRoll.terms;
      }
    }
    // Check succeed by 5 or more
    else if (checkValue >= checkDC + 5) {
      const each5Roll = modified.each5Roll;
      if (each5Roll) {
        const degree = Math.floor((checkValue - checkDC) / 5);
        const formula = degree > 1 ? `(${degree} * ${each5Roll.formula})` : each5Roll.formula;

        modified.modifierSources = modified.modifierSources.replace("Base Value", `Check Succeeded over ${(degree * 5)}`);
        modified._formula += ` + ${formula}`;
        modified._total += (degree * each5Roll.total);
      }
    }
    if (otherRoll) roll = modified;
    else roll.modified = modified;
  })
}

function _mergeFormulasByType(rolls) {
  const dmgByType = new Map();
  const healByType = new Map();

  // Damage Rolls
  for (const roll of rolls.dmg) {
    if (roll.modified.dontMerge) {
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