import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { getLabelFromKey, getValueFromPath } from "../helpers/utils.mjs";
import { DC20Roll } from "./rollApi.mjs";

export async function runItemDRMCheck(item, actor, initial={adv: 0, dis: 0}) {
  const afterRoll = [];
  let results = [];
  const rollMenu = item.system.rollMenu;
  const attacker = actor.getActiveTokens()[0];

  if (item.system.actionType === "attack") {
    const attackFormula = item.system.attackFormula;
    const rangeType = rollMenu.rangeType || attackFormula.rangeType; // We want to update it if roll menu modified it
    const checkType = attackFormula.checkType === "attack" ? "martial" : "spell"; // TODO: Remove after we change it to martial

    // DRM on you
    const attackPath = `system.dynamicRollModifier.onYou.${checkType}.${rangeType}`;
    const attackResult = await _getDRMValueForPath(attackPath, actor, {actorAskingForCheck: actor}, afterRoll);

    // Versatile
    const versatileResult = rollMenu.versatile ? [{modifier: "+ 2", label: "Versatile - holds weapon in 2 hands", targetHash: actor.targetHash}] : [];
    
    // Close Quarters
    const skipCloseQuarters = attackFormula.rangeType !== "ranged" || attackFormula.ignoreCloseQuarters || actor.system.globalModifier.ignore.closeQuarters;
    const closeQuartersResult = skipCloseQuarters ? [] : _closeQuartersCheck(attacker);
    results = [...results, ...attackResult, ...versatileResult, ...closeQuartersResult];

    // Target Checks
    const attackTargetPath = `system.dynamicRollModifier.againstYou.${checkType}.${rangeType}`;
    for (const token of game.user.targets) {
      if (!token.actor) continue;
      const targetAttackResult = await _getDRMValueForPath(attackTargetPath, token.actor, {actorAskingForCheck: actor}, afterRoll, true);
      const targetPositionResult = attacker ? _targetPositionCheck(token, attacker, rangeType, item) : [];
      const targetRangeResult = attacker ? _targetRangeCheck(token, attacker, rangeType, item) : [];
      results = [...results, ...targetAttackResult, ...targetPositionResult, ...targetRangeResult];      
    }
  }

  if (item.system.actionType === "check") {
    const check = item.system.check;
    const details = DC20Roll.prepareCheckDetails(check.checkKey);
    
    // DRM on you
    const checkPath = `system.dynamicRollModifier.onYou.${_getCheckPath(details, actor)}`;
    const checkResult = await _getDRMValueForPath(checkPath, actor, {actorAskingForCheck: actor}, afterRoll);
    const specificSkillResult = details.type === "skillCheck" ? await _getDRMValueForPath("system.dynamicRollModifier.onYou.skills", actor, {actorAskingForCheck: actor, specificSkill: details.checkKey}, afterRoll) : [];
    results = [...results, ...checkResult, ...specificSkillResult];

    // Target Checks
    for (const token of game.user.targets) {
      if (!token.actor) continue;
      const checkTargetPath = `system.dynamicRollModifier.againstYou.${_getCheckPath(details, token.actor)}`;
      const targetCheckResult = await _getDRMValueForPath(checkTargetPath, token.actor, {actorAskingForCheck: actor}, afterRoll, true);
      const targetSpecificSkillResult = details.type === "skillCheck" ? await _getDRMValueForPath("system.dynamicRollModifier.againstYou.skills", token.actor, {actorAskingForCheck: actor, specificSkill: details.checkKey}, afterRoll, true) : [];
      const targetSizeResult = check.respectSizeRules ? _sizeCheck(token, attacker) : [];
      results = [...results, ...targetCheckResult, ...targetSpecificSkillResult, ...targetSizeResult];  
    }
  }

  // Modifications from Enhancements
  const enhModResult = _enhancementModifications(actor, item);
  // Modifications from spending AP and Grit
  const apGritResult = _apGritModifications(actor, rollMenu);
  // Multiple Check Penalty
  const mcpResult = rollMenu.ignoreMCP ? [] : _multipleCheckPenalty(actor, item.checkKey);
  results = [...results, ...apGritResult, ...enhModResult, ...mcpResult];

  // Run DRM macro
  await runTemporaryItemMacro(item, "onDRMCheck", actor, {results: results});

  // Final result
  return _finalResult(results, initial, [], afterRoll);
}

export async function runSheetDRMCheck(details, actor, initial={adv: 0, dis: 0}) {
  let results = [];
  const afterRoll = [];
  const rollMenu = actor.system.rollMenu;
  const attacker = actor.getActiveTokens()[0];
  const checkKey = details.checkKey;

  // DRM on you
  const checkPath = `system.dynamicRollModifier.onYou.${_getCheckPath(details, actor)}`;
  const checkResult = await _getDRMValueForPath(checkPath, actor, {actorAskingForCheck: actor}, afterRoll);
  const specificSkillResult = details.type === "skillCheck" ? await _getDRMValueForPath("system.dynamicRollModifier.onYou.skills", actor, {actorAskingForCheck: actor, specificSkill: details.checkKey}, afterRoll) : [];
  results = [...results, ...checkResult, ...specificSkillResult];

  // Against Status Check
  const statusesResult = _againstStatuses(details.statuses, actor);
  results = [...results, ...statusesResult];

  // Target Checks
  for (const token of game.user.targets) {
    const checkTargetPath = `system.dynamicRollModifier.againstYou.${_getCheckPath(details, token.actor)}`;
    const targetCheckResult = await _getDRMValueForPath(checkTargetPath, token.actor, {actorAskingForCheck: actor}, afterRoll, true);
    const targetSpecificSkillResult = details.type === "skillCheck" ? await _getDRMValueForPath("system.dynamicRollModifier.againstYou.skills", token.actor, {actorAskingForCheck: actor, specificSkill: details.checkKey}, afterRoll, true) : [];
    const targetSizeResult = details.respectSizeRules ? _sizeCheck(token, attacker) : [];
    results = [...results, ...targetCheckResult, ...targetSpecificSkillResult, ...targetSizeResult];   
  }

  // Modifications from spending AP and Grit
  const apGritResult = _apGritModifications(actor, rollMenu);
  // Multiple Check Penalty
  const mcpResult = rollMenu.ignoreMCP ? [] : _multipleCheckPenalty(actor, checkKey);
  results = [...results, ...apGritResult, ...mcpResult];

  // Final result
  return _finalResult(results, initial, details.statuses, afterRoll);
}

//========================================
//               DRM CHECK               =
//========================================
async function _getDRMValueForPath(path, actor, validationData, afterRoll, target=false) {
  const value = getValueFromPath(actor, path);
  if (!value) return [];

  const parsed = [];
  for(const json of value) {
    try {
      const modification = JSON.parse(`{${json}}`);
      const apply = await _shouldApply(modification, actor, validationData);
      if (apply) {
        modification.targetHash = actor.targetHash;
        modification.target = target;
        parsed.push(modification);

        if (modification.afterRoll) {
          afterRoll.push({
            actorId: actor._id, 
            tokenId: actor.token?.id,
            effectId: modification.effectId, 
            afterRoll: modification.afterRoll
          });
        }
      }
    } catch (e) {
      ui.notifications.error(`Cannot parse DRM json {${json}} with error: ${e}`)
    }
  }
  return parsed;
}

async function _shouldApply(modification, target, validationData) {
  if (_runValidationDataCheck(modification, validationData)) {
    if (modification.confirmation) {
      return await SimplePopup.confirm(`Should "${modification.label}" be applied for an Actor named "${target.name}"?`);
    }
    else return true;
  }
  return false;
}

function _runValidationDataCheck(modification, validationData) {
  if (!validationData) return true; // Nothing to validate
  return _validateActorAskingForCheck(modification, validationData.actorAskingForCheck) 
        && _validateSpecificSkillKey(modification, validationData.specificSkill);
}

function _validateActorAskingForCheck(modification, actorAskingForCheck) {
  if (!actorAskingForCheck) return true;
  if (!modification.applyOnlyForId) return true;
  return modification.applyOnlyForId === actorAskingForCheck.id;
}

function _validateSpecificSkillKey(modification, specificSkill) {
  if (!specificSkill) return true;
  if (!modification.skill) return true;
  return specificSkill === modification.skill;
}

//========================================
//          GENERATE CHECK PATH          =
//========================================
function _getCheckPath(details, actor) {
  switch (details.type) {
    case "attributeCheck": case "attackCheck": case "spellCheck": case "martialCheck":
      if (details.checkKey === "prime") {
        return `checks.${actor.system.details.primeAttrKey}`;
      }
      else return `checks.${details.checkKey}`;
    case "initiative":  return "initiative";
    case "deathSave":   return "deathSave";
    case "save":        return _getSavePath(details.checkKey, actor);
    case "lang":        return _getLangPath(actor);
    case "skillCheck":  return _getSkillPath(actor, details.checkKey);
  }
}

function _getSavePath(saveKey, actor) {
  const attributes = actor.system.attributes;
  if (saveKey === "phy") {
    const migSave = attributes.mig.save;
    const agiSave = attributes.agi.save;
    saveKey = migSave >= agiSave ? "mig" : "agi";
  }
  if (saveKey === "men") {
    const intSave = attributes.int.save;
    const chaSave = attributes.cha.save;
    saveKey = intSave >= chaSave ? "int" : "cha";
  }
  return `saves.${saveKey}`;
}

function _getLangPath(actor) {
  const attributes = actor.system.attributes;
  const int = attributes.int.check;
  const cha = attributes.cha.check;
  const key = int >= cha ? "int" : "cha";
  return `checks.${key}`;
}

function _getSkillPath(actor, checkKey) {
  let skill = actor.skillAndLanguage.skills[checkKey];
  if (!skill) skill = actor.skillAndLanguage.trades?.[checkKey];
  if (!skill) return;

  let attribute = skill.baseAttribute;
  if (attribute === "prime") attribute = actor.system.details.primeAttrKey;

  return `checks.${attribute}`;
}

//========================================
//         STATUS RESISTANCE CHECK       =
//========================================
function _againstStatuses(statuses, actor) {
  if (!statuses) return [];

  const result = [];
  const statusLevel = actor.system.statusResistances;
  for (const statusId of statuses) {
    const resistance = statusLevel[statusId]?.resistance || 0;
    const vulnerability = statusLevel[statusId]?.vulnerability || 0;
    const saveLevel = resistance - vulnerability;
    const statusLabel = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.allStatuses);

    if (statusLevel[statusId]?.immunity) {
      result.push({autoCrit: true, label: `Immune vs ${statusLabel}`, targetHash: actor.targetHash, status: statusId});
    }
    else if (saveLevel !== 0) {
      if (saveLevel > 0) {
        result.push({type: "adv", value: Math.abs(saveLevel), label: `Resistance vs ${statusLabel}`, targetHash: actor.targetHash, status: statusId});
      }
      if (saveLevel < 0) {
        result.push({type: "dis", value: Math.abs(saveLevel), label: `Vulnerability vs ${statusLabel}`, targetHash: actor.targetHash, status: statusId});
      }
    }

  }
  return result;
}

//========================================
//            SIZE RULES CHECK           =
//========================================
function _sizeCheck(target, attacker) {
  if (!attacker) return [];
  const attackerSize = attacker.actor.system.size.size;
  const targetSize = target.actor.system.size.size;
  const sizeDiff = _sizeNumericValue(attackerSize) - _sizeNumericValue(targetSize);
  if (sizeDiff >= 1) {
    return [{type: "adv", value: 1, label: "1 or more size smaller then the attacker", targetHash: target.actor.targetHash, target: true}];
  }
  if (sizeDiff === -1) {
    return [{type: "dis", value: 1, label: "1 size larger then the attacker", targetHash: target.actor.targetHash, target: true}];
  }
  if (sizeDiff < -1) {
    return [{autoFail: true, label: "More than 1 size larger then the attacker", targetHash: target.actor.targetHash, target: true}];
  }
  return [];
}

function _sizeNumericValue(size) {
  switch (size) {
    case "tiny": return 0;
    case "small": return 1;
    case "medium": return 2;
    case "large": return 3;
    case "huge": return 4;
    case "gargantuan": return 5;
    case "colossal": return 6;
    case "titanic": return 7;
  }
}

//========================================
//               MCP CHECK               =
//========================================
function _multipleCheckPenalty(actor, checkKey) {
  let mcp = actor.system.mcp;

  // Companion might share MCP with owner
  if (companionShare(actor, "mcp")) mcp = actor.companionOwner.system.mcp; 

  // If action was held we want to use MCP from last round
  const actionHeld = actor.flags.dc20rpg.actionHeld;
  if (actionHeld?.rollsHeldAction && actionHeld.mcp !== null) mcp = actionHeld.mcp;

  let dis = 0;
  mcp.forEach(check => {if (check === checkKey) dis++;});
  if (dis === 0) return [];
  return [{type: "dis", value: dis, label: "Multiple Check Penalty", targetHash: actor.targetHash}];
}

//========================================
//        ADDITIONAL MODIFICATIONS       =
//========================================
function _enhancementModifications(actor, item) {
  const result = [];
  item.enhancements.active.values().forEach(enh => {
    const mod = enh.modifications;
    
    // Roll Level
    if (mod.rollLevelChange && mod.rollLevel.value) {
      const value = enh.number * mod.rollLevel.value;
      result.push({type: mod.rollLevel.type, value: value, label: enh.name, targetHash: actor.targetHash});
    }

    // Core Formula Modification
    if (mod.modifiesCoreFormula && mod.coreFormulaModification) {
      let formulaModification = "";
      for (let i = 0; i < enh.number; i++) {
        formulaModification += mod.coreFormulaModification;
      }
      result.push({modifier: formulaModification, label: enh.name, targetHash: actor.targetHash});
    }
  })
  return result;
}

function _apGritModifications(actor, rollMenu) {
  const result = [];
  if (rollMenu.apCost > 0) {
    result.push({type: "adv", value: rollMenu.apCost, label: "AP spent of ADV", targetHash: actor.targetHash});
  }
  if (rollMenu.gritCost > 0) {
    result.push({type: "adv", value: rollMenu.gritCost, label: "Grit spent of ADV", targetHash: actor.targetHash});
  }
  return result;
}

//========================================
//            POSITION CHECK             =
//========================================
function _closeQuartersCheck(attacker) {
  if (!game.settings.get("dc20rpg", "enablePositionCheck")) return [];
  if (!attacker) return [];

  let closeQuarters = false;
  attacker.enemyNeighbours.values().forEach(token => {
    if (!token.actor.hasAnyStatus(["incapacitated", "dead"])) closeQuarters = true;
  });
  if (closeQuarters) return [{type: "dis", value: 1, label: "Close Quarters", targetHash: attacker.actor.targetHash}]
  return [];
}

function _targetPositionCheck(target, attacker, rangeType, item) {
  if (!game.settings.get("dc20rpg", "enablePositionCheck")) return [];
  const result = [];

  const rollMenu = item.system.rollMenu;
  // FLANKING
  if (rollMenu.flanks || (rangeType === "melee" && target.isFlanked)) {
    result.push({modifier: "+ 2", label: "Is Flanked", target: true, targetHash: target.actor.targetHash});
  }

  // COVER
  const cover = target.actor.system.globalModifier.provide || {};
  if (rollMenu.tqCover || cover.tqCover) {
    result.push({modifier: "- 5", label: "Three-Quarter Cover", target: true, targetHash: target.actor.targetHash});
  }
  else if (rollMenu.halfCover || cover.halfCover) {
    result.push({modifier: "- 2", label: "Half Cover", target: true, targetHash: target.actor.targetHash});
  }

  // UNWIELDY PROPERTY
  if (item.system.properties?.unwieldy?.active && attacker && attacker.neighbours.has(target.id)) {
    result.push({type: "dis", value: 1, label: "Unwieldy Property", target: true, targetHash: target.actor.targetHash});
  }

  return result;
}

//========================================
//              RANGE CHECK              =
//========================================
function _targetRangeCheck(target, attacker, rangeType, item) {
  if (!game.settings.get("dc20rpg", "enableRangeCheck")) return [];
  if (rangeType === "area") return [];
  if (!attacker) return [];

  const result = [];
  const range = item.system.range;
  if (rangeType === "melee") {
    const melee = (range.melee || 1) + _bonusRange("melee", item, attacker.actor);
    if (!attacker.isTokenInRange(target, melee)) {
      result.push(_outOfRange(target));
    }
  }
  if (rangeType === "ranged") {
    const longRange = !attacker.actor.system.globalModifier.ignore.longRange;
    let normal = range.normal;
    let max = range.max;

    // Check for Improvised Weapon (when weapon is thrown without "toss" or "throw" property);
    if (normal == null && item.system.inventory) normal = 0;
    if (max == null && item.system.inventory) {
      max = 2 * Math.max(1, attacker.actor.system.attributes.mig.current); 
    }

    if (normal != null && max != null) {
      normal = normal + _bonusRange("normal", item, attacker.actor);
      max = max + _bonusRange("max", item, attacker.actor);
      if (!attacker.isTokenInRange(target, max)) {
        result.push(_outOfRange(target));  // Out of max range
      }
      else if (!attacker.isTokenInRange(target, normal) && longRange) {
        result.push(_longRange(target));  // In long range
      }
    }
    else if (normal != null) {
      normal = normal + _bonusRange("normal", item, attacker.actor);
      if (!attacker.isTokenInRange(target, normal)) {
        result.push(_outOfRange(target));
      }
    }
  }
  return result;
}

function _bonusRange(rangeKey, item, actor) {
  let range = 0;

  // Reach
  const properties = item.system.properties;
  if (rangeKey === "melee" && properties?.reach?.active) {
    range += properties.reach.value;
  }

  // Enhancement
  item.enhancements.active.values().forEach(enh => {
    const bonusRange = enh.modifications.bonusRange[rangeKey];
    const addsRange = enh.modifications.addsRange[rangeKey];
    if (addsRange && bonusRange) {
      range += (enh.number * bonusRange);
    }
  })

  // Global Modifier
  range += actor.system.globalModifier.range[rangeKey] || 0;

  return range;
}

function _outOfRange(target) {
  return {autoFail: true, label: "Out of Range", target: true, targetHash: target.actor.targetHash};
}

function _longRange(target) {
  return {type: "dis", value: 1, label: "Long Range", target: true, targetHash: target.actor.targetHash};
}

//========================================
//             FINAL RESULT              =
//========================================
function _finalResult(results, initial, statusIds=[], afterRoll) {
  const roller = [];

  const statuses = new Map();
  for (const statusId of statusIds) {
    statuses.set(statusId, []);
  }

  const targets = new Map();
  for (const token of game.user.targets) {
    if (token.actor) targets.set(token.actor.targetHash, []);
  }

  for (const result of results) {
    if (result.target) {
      const hash = result.targetHash;
      if (targets.has(hash)) {
        const array = targets.get(hash);
        array.push(result);
        targets.set(hash, array);
      }
    }
    else if (result.status) {
      const statusId = result.status;
      if (statuses.has(statusId)) {
        const array = statuses.get(statusId);
        array.push(result);
        statuses.set(statusId, array);
      }
    }
    else {
      roller.push(result);
    }
  }

  // Roller Data
  const rollLevel = _rollLevel(roller);
  const [modifiers, label] = _rollModifier(roller);
  const [autoCrit, autoFail] = _autoOutcomes(roller);
  const finalResult = {
    modifier: modifiers,
    adv: rollLevel.adv,
    dis: rollLevel.dis,
    autoCrit: autoCrit,
    autoFail: autoFail,
    label: `You (${label})`,
    manualChanges: false
  }

  // Find common value for statuses and merge it with roller's values
  const statusResult = _commonValue(statuses, "Status");
  if (statusResult) {
    finalResult.manualChanges = _markManualChanges(statuses, statusResult);
    finalResult.modifier += statusResult.modifier;
    finalResult.label += statusResult.label;
    finalResult.adv += statusResult.adv;
    finalResult.dis += statusResult.dis;
    finalResult.autoCrit = finalResult.autoCrit || statusResult.autoCrit;
    finalResult.autoFail = finalResult.autoFail || statusResult.autoFail;
  }

  // Find common value for targets and merge it with roller's values
  const targetResult = _commonValue(targets, "Target");
  if (targetResult) {
    if (!finalResult.manualChanges) {
      finalResult.manualChanges = _markManualChanges(targets, targetResult);
    }
    finalResult.modifier += targetResult.modifier;
    finalResult.label += targetResult.label;
    finalResult.adv += targetResult.adv;
    finalResult.dis += targetResult.dis;
    finalResult.autoCrit = finalResult.autoCrit || targetResult.autoCrit;
    finalResult.autoFail = finalResult.autoFail || targetResult.autoFail;
  }

  // Add initial values if provided 
  if (initial.adv || initial.dis) {
    finalResult.adv += initial.adv;
    finalResult.dis += initial.dis;
    roller.push({manual: `Initial state of Roll Menu [adv: ${initial.adv}, dis: ${initial.dis}]`});
  }

  const allDRMs = {
    roller: roller,
    statuses: statuses,
    targets: targets
  }
  return [finalResult, allDRMs, afterRoll];
}

function _commonValue(values, labelPartial) {
  if (values.keys() === 0) return null;

  let coreRollMod = null;
  let finalLabel = null;
  let autoCrit = [];
  let autoFail = [];
  let lowestRollLevel = null;

  for (const value of values.values()) {
    const [rollModifier, label] = _rollModifier(value);
    const rollLevel = _rollLevel(value);
    const [crit, fail] = _autoOutcomes(value);

    autoCrit.push(crit);
    autoFail.push(fail);

    if (rollModifier != null) {
      if (coreRollMod === null) {
        coreRollMod = rollModifier;
        finalLabel = label;
      }
      else if (coreRollMod !== rollModifier) {
        coreRollMod = "";
        finalLabel = null;
      }
    }

    if (lowestRollLevel === null) {
      lowestRollLevel = rollLevel;
    }
    else if (Math.abs(rollLevel.level) < Math.abs(lowestRollLevel.level)) {
      lowestRollLevel = rollLevel;
    }
  }

  autoCrit = autoCrit.length > 0 ? autoCrit.every(x => x === true) : false;
  autoFail = autoFail.length > 0 ? autoFail.every(x => x === true) : false;
  lowestRollLevel = lowestRollLevel || {level: 0, adv: 0, dis: 0};
  coreRollMod = coreRollMod || "";
  finalLabel = finalLabel ? `, ${labelPartial} (${finalLabel})` : "";

  return {
    modifier: coreRollMod,
    adv: lowestRollLevel.adv,
    dis: lowestRollLevel.dis,
    level: lowestRollLevel.level,
    autoCrit: autoCrit,
    autoFail: autoFail,
    label: finalLabel
  }
}

//========================================
//          MARK MANUAL CHANGES          =
//========================================
function _markManualChanges(values, common) {
  let manualChanges = false;
  for (const value of values.values()) {
    const [rollModifier, label] = _rollModifier(value);
    const rollLevel = _rollLevel(value);
    const [crit, fail] = _autoOutcomes(value);

    if (rollModifier !== common.modifier) {
      manualChanges = true;
      value.push({manual: `For this target/status, you need to modify that roll with: '${rollModifier}'.`});
    }
    if (rollLevel.level !== common.level) {
      manualChanges = true;
      // ADV -> ADV
      if (rollLevel.level > 0 && common.level >= 0) {
        value.push({manual: `For this target/status, you should roll ${rollLevel.level - common.level} more advantage dice.`});
      }
      // DIS -> DIS
      if (rollLevel.level < 0 && common.level <= 0) {
        value.push({manual: `For this target/status, you should roll ${Math.abs(rollLevel.level) - Math.abs(common.level)} more disadvantage dice.`});
      }
      // ADV -> DIS
      if (rollLevel.level < 0 && common.level > 0) {
        value.push({manual: `For this target/status, you need to remove all advantages and roll ${Math.abs(rollLevel.level)} disadvantage dice.`});
      }
      // DIS -> ADV
      if (rollLevel.level > 0 && common.level < 0) {
        value.push({manual: `For this target/status, you need to remove all disadvantages and roll ${rollLevel.level} advantage dice.`});
      }
    }
    if (crit !== common.autoCrit) {
      manualChanges = true;
      value.push({manual: "For this target/status this role should be a guaranteed critical success."});
    }
    if (fail !== common.autoFail) {
      manualChanges = true;
      value.push({manual: "For this target/status this role should be a guaranteed fail."});
    }
  }
  return manualChanges;
}

//========================================
//              COLLECTORS               =
//========================================
function _rollLevel(drm) {
  let rollLevel = {level: 0, adv: 0, dis: 0};
  for (const result of drm) {
    if (result.value) {
      if (result.type === "dis") {
        rollLevel.level -= result.value;
        rollLevel.dis += result.value;
      }
      if (result.type === "adv") {
        rollLevel.level += result.value;
        rollLevel.adv += result.value;
      }
    }
  }
  return rollLevel;
}

function _rollModifier(drm) {
  let rollModifier = "";
  let label = ""
  for (const result of drm) {
    if (result.modifier) {
      const modifier = (result.modifier.includes("+") || result.modifier.includes("-")) ? ` ${result.modifier}` : ` + ${result.modifier}`;
      rollModifier += modifier;
      if (!label) label = result.label;
      else label += ` + ${result.label}`;
    }
  }
  return [rollModifier, label];
}

function _autoOutcomes(drm) {
  let autoCrit = false;
  let autoFail = false;
  for (const result of drm) {
    if (result.autoCrit) autoCrit = true;
    if (result.autoFail) autoFail = true;
  }
  return [autoCrit, autoFail];
}