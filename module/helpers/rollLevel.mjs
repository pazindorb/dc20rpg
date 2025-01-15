import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { companionShare } from "./actors/companion.mjs";
import { getLabelFromKey, getValueFromPath } from "./utils.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";

//=========================================
//               ROLL LEVEL               =
//=========================================
export async function advForApChange(object, which) {
  let adv = object.flags.dc20rpg.rollMenu.adv;
  let apCost = object.flags.dc20rpg.rollMenu.apCost;

  if (which === 1) {  // Add
    if (adv >= 9) return;
    apCost = apCost + 1;
    adv = adv + 1;
  }
  if (which === 3) {  // Subtract
    if (apCost === 0) return;
    apCost = apCost - 1;
    adv = Math.max(adv - 1, 0);
  }
  await object.update({
    ['flags.dc20rpg.rollMenu.apCost']: apCost,
    ['flags.dc20rpg.rollMenu.adv']: adv
  });
}

let toRemove = [];
export async function runItemRollLevelCheck(item, actor) {
  toRemove = [];
  let [actorRollLevel, actorGenesis, actorCrit, actorFail] = [{adv: 0, dis: 0}, []];
  let [targetRollLevel, targetGenesis, targetCrit, targetFail] = [{adv: 0, dis: 0}, []];

  const actionType = item.system.actionType;
  let checkKey = "";
  switch (actionType) {
    case "attack":
      const attackFormula = item.system.attackFormula;
      checkKey = attackFormula.checkType.substr(0, 3);
      [actorRollLevel, actorGenesis, actorCrit, actorFail] = await _getAttackRollLevel(attackFormula, actor, "onYou", "You");
      [targetRollLevel, targetGenesis, targetCrit, targetFail] = await _runCheckAgainstTargets("attack", attackFormula, actor);;
      break;

    case "check":
      const check = item.system.check;
      const respectSizeRules = check.respectSizeRules
      checkKey = check.checkKey;
      check.type = "skillCheck";
      [actorRollLevel, actorGenesis, actorCrit, actorFail] = await _getCheckRollLevel(check, actor, "onYou", "You");
      [targetRollLevel, targetGenesis, targetCrit, targetFail] = await _runCheckAgainstTargets("check", check, actor, respectSizeRules);
      break;
  }
  const [mcpRollLevel, mcpGenesis] = _respectMultipleCheckPenalty(actor, checkKey, item.flags.dc20rpg.rollMenu);

  const rollLevel = {
    adv: (actorRollLevel.adv + targetRollLevel.adv + mcpRollLevel.adv),
    dis: (actorRollLevel.dis + targetRollLevel.dis + mcpRollLevel.dis)
  };
  const genesis = [...actorGenesis, ...targetGenesis, ...mcpGenesis];
  const autoCrit = {value: actorCrit || targetCrit}; // We wrap it like that so autoCrit 
  const autoFail = {value: actorFail || targetFail}; // and autoFail can be edited by the item macro
  await runTemporaryItemMacro(item, "rollLevelCheck", actor, {rollLevel: rollLevel, genesis: genesis, autoCrit: autoCrit, autoFail: autoFail});
  if (toRemove.length > 0) await actor.update({["flags.dc20rpg.effectsToRemoveAfterRoll"]: toRemove});
  return await _updateRollMenuAndReturnGenesis(rollLevel, genesis, autoCrit.value, autoFail.value, item);
}

export async function runSheetRollLevelCheck(details, actor) {
  toRemove = [];
  const [actorRollLevel, actorGenesis, actorCrit, actorFail] = await _getCheckRollLevel(details, actor, "onYou", "You");
  const [targetRollLevel, targetGenesis, targetCrit, targetFail] = await _runCheckAgainstTargets("check", details, actor);
  const [statusRollLevel, statusGenesis, statusCrit] = _getRollLevelAgainsStatuses(actor, details.statuses);
  const [mcpRollLevel, mcpGenesis] = _respectMultipleCheckPenalty(actor, details.checkKey, actor.flags.dc20rpg.rollMenu);

  const rollLevel = {
    adv: (actorRollLevel.adv + targetRollLevel.adv + statusRollLevel.adv + mcpRollLevel.adv),
    dis: (actorRollLevel.dis + targetRollLevel.dis + statusRollLevel.dis + mcpRollLevel.dis)
  };
  const genesis = [...actorGenesis, ...targetGenesis, ...statusGenesis, ...mcpGenesis]
  const autoCrit = actorCrit || targetCrit || statusCrit;
  const autoFail = actorFail || targetFail;
  if (toRemove.length > 0) await actor.update({["flags.dc20rpg.effectsToRemoveAfterRoll"]: toRemove});
  return await _updateRollMenuAndReturnGenesis(rollLevel, genesis, autoCrit, autoFail, actor);
}

async function _getAttackRollLevel(attackFormula, actor, subKey, sourceName, actorAskingForCheck) {
  const rollLevelPath = _getAttackPath(attackFormula.checkType, attackFormula.rangeType);

  if (rollLevelPath) {
    const path = `system.rollLevel.${subKey}.${rollLevelPath}`;
    return await _getRollLevel(actor, path, sourceName, {actorAskingForCheck: actorAskingForCheck});
  }
  return [{adv: 0, dis: 0}, []];
}

async function _getCheckRollLevel(check, actor, subKey, sourceName, actorAskingForCheck, respectSizeRules) {
  let rollLevelPath = "";
  const validationData = {actorAskingForCheck: actorAskingForCheck};
  let [specificSkillRollLevel, specificSkillGenesis, specificSkillCrit, specificSkillFail] = [{adv: 0, dis: 0}, []];
  let [checkRollLevel, checkGenesis, checkCrit, checkFail] = [{adv: 0, dis: 0}, []];
  let [concentrationRollLevel, concentrationGenesis, concentrationCrit, concentrationFail] = [{adv: 0, dis: 0}, []];
  let [initiativeRollLevel, initiativeGenesis, initiativeCrit, initiativeFail] = [{adv: 0, dis: 0}, []];

  switch (check.type) {
    case "deathSave": rollLevelPath = "deathSave"; break;
    case "save": rollLevelPath = _getSavePath(check.checkKey, actor, actorAskingForCheck); break;
    case "lang": rollLevelPath = _getLangPath(actor, actorAskingForCheck); break;
    case "attributeCheck": case "attackCheck": case "spellCheck":
      rollLevelPath = _getCheckPath(check.checkKey, actor, null, actorAskingForCheck); break;
    case "skillCheck":
      let category = "";
      if (actor.system.skills[check.checkKey]) category = "skills";
      if (actor.type === "character" && actor.system.tradeSkills[check.checkKey]) category = "tradeSkills";
      rollLevelPath = _getCheckPath(check.checkKey, actor, category, actorAskingForCheck);
      
      // Run check for specific skill not just attribute
      const specificSkillPath = `system.rollLevel.${subKey}.${category}`;
      [specificSkillRollLevel, specificSkillGenesis, specificSkillCrit, specificSkillFail] = await _getRollLevel(actor, specificSkillPath, sourceName, {specificSkill: check.checkKey, ...validationData})
  }

  // Run check for concentration and initiative rolls
  if (check.concentration) {
    [concentrationRollLevel, concentrationGenesis, concentrationCrit, concentrationFail] = await _getRollLevel(actor, `system.rollLevel.${subKey}.concentration`, sourceName, validationData);
  }
  if (check.initiative) {
    [initiativeRollLevel, initiativeGenesis, initiativeCrit, initiativeFail] = await _getRollLevel(actor, `system.rollLevel.${subKey}.initiative`, sourceName, validationData);
  }

  // Run check for attribute
  if (rollLevelPath) {
    const path = `system.rollLevel.${subKey}.${rollLevelPath}`;
    [checkRollLevel, checkGenesis, checkCrit, checkFail] = await _getRollLevel(actor, path, sourceName, validationData);
  }
  const rollLevel = {
    adv: (checkRollLevel.adv + specificSkillRollLevel.adv + concentrationRollLevel.adv + initiativeRollLevel.adv),
    dis: (checkRollLevel.dis + specificSkillRollLevel.dis + concentrationRollLevel.dis + initiativeRollLevel.dis)
  };
  const genesis = [...checkGenesis, ...specificSkillGenesis, ...concentrationGenesis, ...initiativeGenesis];
  let autoCrit = checkCrit || specificSkillCrit || concentrationCrit || initiativeCrit;
  let autoFail = checkFail || specificSkillFail || concentrationFail || initiativeFail;

  // Run check for size rules
  if (respectSizeRules) {
    const contestorSize = actorAskingForCheck.system.size.size;
    const targetSize = actor.system.size.size;
    const sizeDif = _sizeDifCheck(contestorSize, targetSize);
    if (sizeDif === 1) {
      rollLevel.adv++;
      genesis.push({type: "adv", sourceName: sourceName, label: "You are 1 size larger", value: 1});
    }
    if (sizeDif === -1) {
      rollLevel.dis++;
      genesis.push({type: "dis", sourceName: sourceName, label: "You are 1 size smaller", value: 1});
    }
    if (sizeDif > 1) {
      autoCrit = true;
      genesis.push({autoCrit: true, sourceName: sourceName, label: "You are more than 1 size larger"});
    }
    if (sizeDif < -1) {
      autoFail = true;
      genesis.push({autoFail: true, sourceName: sourceName, label: "You are more than 1 size smaller"});
    }
  } 
  return [rollLevel, genesis, autoCrit, autoFail];
}

async function _getRollLevel(actor, path, sourceName, validationData) {
  const levelsToUpdate = {adv: 0, dis: 0};
  const genesis = [];
  let autoCrit = false;
  let autoFail = false;

  const rollLevel = getValueFromPath(actor, path);
  if (!rollLevel) return [levelsToUpdate, genesis];

  const parsed = [];
  for(const json of rollLevel) {
    try {
      const obj = JSON.parse(`{${json}}`);
      parsed.push(obj);
    } catch (e) {
      console.warn(`Cannot parse roll level modification json {${json}} with error: ${e}`)
    }
  }

  for (const modification of parsed) {
    if (await _shouldApply(modification, actor, validationData)) {
      levelsToUpdate[modification.type] += modification.value;
      if (modification.autoCrit) autoCrit = true;
      if (modification.autoFail) autoFail = true;
      if (modification.afterRoll) toRemove.push({
        actorId: actor._id, 
        tokenId: actor.token?.id,
        effectId: modification.effectId, 
        afterRoll: modification.afterRoll
      });
      genesis.push({
        type: modification.type,
        sourceName: sourceName,
        label: modification.label,
        value: modification.value,
        autoCrit: autoCrit,
        autoFail: autoFail
      })
    }
  }
  return [levelsToUpdate, genesis, autoCrit, autoFail];
}

async function _shouldApply(modification, target, validationData) {
  if (_runValidationDataCheck(modification, validationData)) {
    if (modification.confirmation) {
      return getSimplePopup("confirm", {header: `Should "${modification.label}" be applied for an Actor named "${target.name}"?`})
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

function _getRollLevelAgainsStatuses(actor, statuses) {
  if (!statuses) return [{adv: 0,dis: 0}, []];
  const levelPerStatus = [];
  const genesisPerStatus = [];
  const autoCritPerStatus = [];
  const autoFailPerStatus = [];

  const statusLevel = actor.system.statusResistances;
  statuses.forEach(statusId => {
    let genesis = [];
    let rollLevel = null;

    let autoCrit =  statusLevel[statusId]?.immunity;
    let saveLevel = statusLevel[statusId]?.advantage;
    autoCritPerStatus.push(autoCrit);
    autoFailPerStatus.push(false);
    if (autoCrit) {
      rollLevel = {
        adv: 0,
        dis: 0,
        autoCrit: autoCrit
      };
      const statusLabel = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.statusResistances)
      genesis.push({
        sourceName: "You",
        label: `Roll vs ${statusLabel}`,
        autoCrit: true
      });
    }
    if (saveLevel > 0) {
      if (rollLevel) rollLevel.adv = saveLevel
      else {
        rollLevel = {
          adv: saveLevel,
          dis: 0
        };
      }
      const statusLabel = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.statusResistances)
      genesis.push({
        type: "adv",
        sourceName: "You",
        label: `Roll vs ${statusLabel}`,
        value: saveLevel
      });
    }
    if (saveLevel < 0) {
      if (rollLevel) rollLevel.dis = Math.abs(saveLevel)
      else {
        rollLevel = {
          adv: 0,
          dis: Math.abs(saveLevel)
        };
      }
      const statusLabel = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.statusResistances)
      genesis.push({
        type: "dis",
        sourceName: "You",
        label: `Roll vs ${statusLabel}`,
        value: Math.abs(saveLevel)
      });
    }
    
    if (rollLevel) {
      levelPerStatus.push(rollLevel);
      genesisPerStatus.push(genesis);
    }
  });
  return _findRollClosestToZeroAndAutoOutcome(levelPerStatus, genesisPerStatus, autoCritPerStatus, autoFailPerStatus);
}

async function _updateRollMenuAndReturnGenesis(levelsToUpdate, genesis, autoCrit, autoFail, owner) {
  // Change genesis to text format
  let genesisText = [];
  let  unequalRollLevel = false; 
  let  ignoredAutoOutcome = false;
  genesis.forEach(gen => {
    if (gen.textOnly) genesisText.push(gen.text);
    else {
      if (gen.value > 0) {
        const manualAction = gen.manualAction === "rollLevel" ? game.i18n.localize("dc20rpg.sheet.rollMenu.manualAction") : ""
        const typeLabel = game.i18n.localize(`dc20rpg.sheet.rollMenu.${gen.type}`);
        genesisText.push(`${manualAction}${typeLabel}[${gen.value}] -> (${gen.sourceName}) from: ${gen.label}`);
        if (manualAction) unequalRollLevel = true;
      }
      if (gen.autoCrit) {
        const manualAction = gen.manualAction === "autoCrit" ? game.i18n.localize("dc20rpg.sheet.rollMenu.manualAction") : ""
        const typeLabel = game.i18n.localize("dc20rpg.sheet.rollMenu.crit");
        genesisText.push(`${manualAction}${typeLabel} -> (${gen.sourceName}) from: ${gen.label}`);
        if (manualAction) ignoredAutoOutcome = true;
      }
      if (gen.autoFail) {
        const manualAction = gen.manualAction === "autoFail" ? game.i18n.localize("dc20rpg.sheet.rollMenu.manualAction") : ""
        const typeLabel = game.i18n.localize("dc20rpg.sheet.rollMenu.fail");
        genesisText.push(`${manualAction}${typeLabel} -> (${gen.sourceName}) from: ${gen.label}`);
        if (manualAction) ignoredAutoOutcome = true;
      }
    }
  })

  if (unequalRollLevel) {
    genesisText.push(game.i18n.localize("dc20rpg.sheet.rollMenu.unequalRollLevel"));
  }
  if (ignoredAutoOutcome) {
    genesisText.push(game.i18n.localize("dc20rpg.sheet.rollMenu.ignoredAutoOutcome"));
  }
  if (unequalRollLevel || ignoredAutoOutcome) {
    genesisText.push("MANUAL_ACTION_REQUIRED");
  }

  // Check roll level from ap for adv
  const apCost = owner.flags.dc20rpg.rollMenu.apCost;
  if (apCost > 0) levelsToUpdate.adv += apCost;
  
  const updateData = {
    ["flags.dc20rpg.rollMenu"]: levelsToUpdate,
    ["flags.dc20rpg.rollMenu.autoCrit"]: autoCrit,
    ["flags.dc20rpg.rollMenu.autoFail"]: autoFail,
    
  }
  await owner.update(updateData);

  if (genesisText.length === 0) return ["No modifications found"];
  return genesisText;
}

async function _runCheckAgainstTargets(rollType, check, actorAskingForCheck, respectSizeRules) {
  const levelPerToken = [];
  const genesisPerToken = [];
  const autoCritPerToken = [];
  const autoFailPerToken = [];
  for (const token of game.user.targets) {
    const [rollLevel, genesis, autoCrit, autoFail] = rollType === "attack" 
                    ? await _getAttackRollLevel(check, token.actor, "againstYou", token.name, actorAskingForCheck)
                    : await _getCheckRollLevel(check, token.actor, "againstYou", token.name, actorAskingForCheck, respectSizeRules)

    if (genesis) {
      levelPerToken.push(rollLevel);
      genesisPerToken.push(genesis);
      autoCritPerToken.push(autoCrit);
      autoFailPerToken.push(autoFail);
    }
  }

  return _findRollClosestToZeroAndAutoOutcome(levelPerToken, genesisPerToken, autoCritPerToken, autoFailPerToken);
}

function _findRollClosestToZeroAndAutoOutcome(levelPerOption, genesisPerOption, autoCritPerToken, autoFailPerToken) {
  if (levelPerOption.length === 0) return [{adv: 0,dis: 0}, []];

  // We need to find roll level that is closest to 0 so players can manualy change that later
  let lowestLevel = levelPerOption[0];
  for(let i = 1; i < levelPerOption.length; i++) {
    const currentLow = Math.abs(lowestLevel.adv - lowestLevel.dis);
    const newLow = Math.abs(levelPerOption[i].adv - levelPerOption[i].dis);

    if (newLow < currentLow) {
      lowestLevel = levelPerOption[i];
    }
  }

  // Auto crit/fail should be applied only if every target is affected
  const applyAutoCrit = autoCritPerToken.every(x => x === true);
  const applyAutoFail = autoFailPerToken.every(x => x === true);

  // Now we need to mark which targets requiere some manual modifications to be done, 
  // because those have higher levels of advantages/disadvantages
  genesisPerOption.forEach(genesis => {
    let counter = {
      adv: 0,
      dis: 0,
    };
    if (genesis[0]) {
      if (genesis[0].type === "adv") counter.adv = genesis[0].value;
      if (genesis[0].type === "dis") counter.dis = genesis[0].value;
    } 

    for(let mod of genesis) {
      // Roll Level application
      if (lowestLevel[mod.type] < counter[mod.type]) mod.manualAction = "rollLevel";
      else counter[mod.type] += mod.value;

      // Auto crit/fail application
      if (mod.autoCrit && !applyAutoCrit) mod.manualAction = "autoCrit";
      if (mod.autoFail && !applyAutoFail) mod.manualAction = "autoFail";
    }
  });

  return [lowestLevel, genesisPerOption.flat(), applyAutoCrit, applyAutoFail];
}

function _getAttackPath(checkType, rangeType) {
  if (checkType === "attack") return `martial.${rangeType}`;
  if (checkType === "spell") return `spell.${rangeType}`;
  return "";
}

function _getCheckPath(checkKey, actor, category, actorAskingForCheck) {
  // When we send actor asking for check it means this is "againstCheck" so we want to 
  // collect skill modifiers from the actor that makes that roll not the one the roll 
  // is being made against 
  const actorToAnalyze = actorAskingForCheck || actor;
  if (["mig", "agi", "cha", "int"].includes(checkKey)) return `checks.${checkKey}`;
  if (checkKey === "prime") return `checks.${actorToAnalyze.system.details.primeAttrKey}`;
  if (checkKey === "att") return `checks.att`;
  if (checkKey === "spe") return `checks.spe`;
  if (checkKey === "mar") {
    const acrModifier = actorToAnalyze.system.skills.acr.modifier;
    const athModifier = actorToAnalyze.system.skills.ath.modifier;
    checkKey = acrModifier >= athModifier ? "acr" : "ath";
    category = "skills";
  }
  if (!category) return;

  let attrKey = actorToAnalyze.system[category][checkKey].baseAttribute;
  if (attrKey === "prime") attrKey = actorToAnalyze.system.details.primeAttrKey;
  return `checks.${attrKey}`;
}

function _getSavePath(saveKey, actor, actorAskingForCheck) {
  // Explained in _getCheckPath method
  const actorToAnalyze = actorAskingForCheck || actor;
  if (saveKey === "phy") {
    const migSave = actorToAnalyze.system.attributes.mig.save;
    const agiSave = actorToAnalyze.system.attributes.agi.save;
    saveKey = migSave >= agiSave ? "mig" : "agi";
  }

  if (saveKey === "men") {
    const intSave = actorToAnalyze.system.attributes.int.save;
    const chaSave = actorToAnalyze.system.attributes.cha.save;
    saveKey = intSave >= chaSave ? "int" : "cha";
  }

  if (saveKey === "prime") saveKey = actorToAnalyze.system.details.primeAttrKey;
  return `saves.${saveKey}`;
}

function _getLangPath(actor, actorAskingForCheck) {
  // Explained in _getCheckPath method
  const actorToAnalyze = actorAskingForCheck || actor;
  const intSave = actorToAnalyze.system.attributes.int.check;
  const chaSave = actorToAnalyze.system.attributes.cha.check;
  const key = intSave >= chaSave ? "int" : "cha";
  return `checks.${key}`;
}

function _sizeDifCheck(contestor, target) {
  const contestorSize = _sizeNumericValue(contestor);
  const targetSize = _sizeNumericValue(target);
  return contestorSize - targetSize
}

function _sizeNumericValue(size) {
  switch (size) {
    case "tiny": return 0;
    case "small": return 1;
    case "medium": return 2;
    case "mediumLarge": case "large": return 3;
    case "huge": return 4;
    case "gargantuan": return 5;
  }
}

//======================================
//=       MULTIPLE CHECK PENALTY       =
//======================================
export function applyMultipleCheckPenalty(actor, distinction, rollMenu) {
  if (!distinction) return;
  if (rollMenu.ignoreMCP) return;
  let actorToUpdate = actor;
  // Companion might share MCP with owner
  if (companionShare(actor, "mcp")) actorToUpdate = actor.companionOwner; 

  // Get active started combat
  const activeCombat = game.combats.active;
  if (!activeCombat || !activeCombat.started) return;

  // If roll was made by actor on his turn apply multiple check penalty
  const combatantId = activeCombat.current.combatantId;
  const combatant = activeCombat.combatants.get(combatantId);
  if (combatant?.actorId === actorToUpdate.id) {
    const mcp = actorToUpdate.system.mcp;
    mcp.push(distinction);
    actorToUpdate.update({["system.mcp"]: mcp});
  }
}

export function applyMultipleHelpPenalty(actor, maxDice) {
  let actorToUpdate = actor;
  // Companion might share MCP with owner
  if (companionShare(actor, "mcp")) actorToUpdate = actor.companionOwner; 

  const mcp = actorToUpdate.system.mcp;
  const penalty = mcp.filter(mhp => mhp === "help");
  mcp.push("help");
  actorToUpdate.update({["system.mcp"]: mcp});
  return maxDice - (2 * penalty.length);
}

export function clearMultipleCheckPenalty(actor) {
  if (actor.flags.dc20rpg.actionHeld?.isHeld) {
    let mcp = actor.system.mcp;
    if (companionShare(actor, "mcp")) mcp = actor.companionOwner.system.mcp;
    actor.update({["flags.dc20rpg.actionHeld.mcp"]: mcp});
  }
  actor.update({["system.mcp"]: []});
}

function _respectMultipleCheckPenalty(actor, checkKey, rollMenu) {
  if (rollMenu.ignoreMCP) return [{adv: 0, dis: 0}, []];
  let mcp = actor.system.mcp;

  // Companion might share MCP with owner
  if (companionShare(actor, "mcp")) mcp = actor.companionOwner.system.mcp; 

  // If action was held we want to use MCP from last round
  const actionHeld = actor.flags.dc20rpg.actionHeld;
  if (actionHeld?.rollsHeldAction && actionHeld.mcp !== null) {
    mcp = actionHeld.mcp;
  }

  let dis = 0;
  let genesis = [];
  mcp.forEach(check => {
    if (check === checkKey) dis++;
  });
  if (dis > 0) {
    genesis.push({
      type: "dis",
      sourceName: "You",
      label: "Multiple Check Penalty",
      value: dis
    })
  }
  return [{adv: 0, dis: dis}, genesis];
}