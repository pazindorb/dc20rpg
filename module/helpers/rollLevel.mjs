import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { getActions } from "./actors/actions.mjs";
import { DC20RPG } from "./config.mjs";
import { getLabelFromKey, getValueFromPath } from "./utils.mjs";

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

export async function runItemRollLevelCheck(item, actor) {
  let [actorRollLevel, actorGenesis] = [{adv: 0, dis: 0}, []];
  let [targetRollLevel, targetGenesis] = [{adv: 0, dis: 0}, []];

  const actionType = item.system.actionType;
  let checkKey = "";
  switch (actionType) {
    case "dynamic": case "attack":
      const attackFormula = item.system.attackFormula;
      checkKey = attackFormula.checkType.substr(0, 3);
      [actorRollLevel, actorGenesis] = await _getAttackRollLevel(attackFormula, actor, "onYou", "You");
      [targetRollLevel, targetGenesis] = await _runCheckAgainstTargets("attack", attackFormula, actor);;
      break;

    case "contest": case "check":
      const check = item.system.check;
      checkKey = check.checkKey;
      check.type = "skillCheck";
      [actorRollLevel, actorGenesis] = await _getCheckRollLevel(check, actor, "onYou", "You");
      [targetRollLevel, targetGenesis] = await _runCheckAgainstTargets("check", check, actor);
      break;
  }
  const [mcpRollLevel, mcpGenesis] = _respectMultipleCheckPenalty(actor, checkKey);

  const rollLevel = {
    adv: (actorRollLevel.adv + targetRollLevel.adv + mcpRollLevel.adv),
    dis: (actorRollLevel.dis + targetRollLevel.dis + mcpRollLevel.dis)
  };
  const genesis = [...actorGenesis, ...targetGenesis, ...mcpGenesis]
  await _updateRollMenuAndShowGenesis(rollLevel, genesis, item);
}

export async function runSheetRollLevelCheck(details, actor) {
  const [actorRollLevel, actorGenesis] = await _getCheckRollLevel(details, actor, "onYou", "You");
  const [targetRollLevel, targetGenesis] = await _runCheckAgainstTargets("check", details, actor);
  const [statusRollLevel, statusGenesis] = _getRollLevelAgainsStatuses(actor, details.statuses);
  const [mcpRollLevel, mcpGenesis] = _respectMultipleCheckPenalty(actor, details.checkKey);

  const rollLevel = {
    adv: (actorRollLevel.adv + targetRollLevel.adv + statusRollLevel.adv + mcpRollLevel.adv),
    dis: (actorRollLevel.dis + targetRollLevel.dis + statusRollLevel.dis + mcpRollLevel.dis)
  };
  const genesis = [...actorGenesis, ...targetGenesis, ...statusGenesis, ...mcpGenesis]
  await _updateRollMenuAndShowGenesis(rollLevel, genesis, actor);
}

export function rollActionRollLevelCheck(actionKey, actor) {
  const action = getActions()[actionKey];
  if (!action) return;
  const details = {
    type: action.type,
    checkKey: action.checkKey
  }
  return runSheetRollLevelCheck(details, actor);
}

async function _getAttackRollLevel(attackFormula, actor, subKey, sourceName, actorAskingForCheck) {
  const rollLevelPath = _getAttackPath(attackFormula.checkType, attackFormula.rangeType);
  
  if (rollLevelPath) {
    const path = `system.rollLevel.${subKey}.${rollLevelPath}`;
    return await _getRollLevel(actor, path, sourceName, {actorAskingForCheck: actorAskingForCheck});
  }
  return [{adv: 0, dis: 0}, []];
}

async function _getCheckRollLevel(check, actor, subKey, sourceName, actorAskingForCheck) {
  let rollLevelPath = "";
  const validationData = {actorAskingForCheck: actorAskingForCheck};
  let [specificSkillRollLevel, specificSkillGenesis] = [{adv: 0, dis: 0}, []];
  let [checkRollLevel, checkGenesis] = [{adv: 0, dis: 0}, []];

  switch (check.type) {
    case "save": rollLevelPath = _getSavePath(check.checkKey, actor); break;
    case "lang": rollLevelPath = _getLangPath(actor); break;
    case "attributeCheck": case "attackCheck": case "spellCheck":
      rollLevelPath = _getCheckPath(check.checkKey, actor); break;
    case "skillCheck":
      let category = "";
      if (actor.system.skills[check.checkKey]) category = "skills";
      if (actor.type === "character" && actor.system.tradeSkills[check.checkKey]) category = "tradeSkills";
      rollLevelPath = _getCheckPath(check.checkKey, actor, category);
      
      // Run check for specific skill not just attribute
      const specificSkillPath = `system.rollLevel.${subKey}.${category}`;
      [specificSkillRollLevel, specificSkillGenesis] = await _getRollLevel(actor, specificSkillPath, sourceName, {specificSkill: check.checkKey, ...validationData})
  }

  if (rollLevelPath) {
    const path = `system.rollLevel.${subKey}.${rollLevelPath}`;
    [checkRollLevel, checkGenesis] = await _getRollLevel(actor, path, sourceName, validationData);
  }
  const rollLevel = {
    adv: (checkRollLevel.adv + specificSkillRollLevel.adv),
    dis: (checkRollLevel.dis + specificSkillRollLevel.dis)
  };
  const genesis = [...checkGenesis, ...specificSkillGenesis]
  return [rollLevel, genesis];
}

async function _getRollLevel(actor, path, sourceName, validationData) {
  const levelsToUpdate = {adv: 0, dis: 0};
  const genesis = [];
  const rollLevel = getValueFromPath(actor, path);
  if (!rollLevel) return [levelsToUpdate, genesis];

  const parsed = [];
  for(const json of rollLevel) {
    try {
      const obj = JSON.parse(`{${json}}`);
      parsed.push(obj)
    } catch (e) {
      console.warn(`Cannot parse roll level modification json {${json}} with error: ${e}`)
    }
  }

  for (const modification of parsed) {
    if (await _shouldApply(modification, actor, validationData)) {
      levelsToUpdate[modification.type] += modification.value;
      genesis.push({
        type: modification.type,
        sourceName: sourceName,
        label: modification.label,
        value: modification.value
      })
    }
  }
  return [levelsToUpdate, genesis];
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
  
  if (actorAskingForCheck.isToken) {
    return modification.applyOnlyForId === actorAskingForCheck.token.id;
  }
  else {
    return modification.applyOnlyForId === actorAskingForCheck.id;
  }
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

  const statusLevel = actor.system.conditions;
  statuses.forEach(statusId => {
    let genesis = [];
    let rollLevel = null;

    let saveLevel = statusLevel[statusId]?.advantage;
    if (saveLevel > 0) {
      rollLevel = {
        adv: saveLevel,
        dis: 0
      };
      const statusLabel = getLabelFromKey(statusId, DC20RPG.failedSaveEffects)
      genesis.push({
        type: "adv",
        sourceName: "You",
        label: `Roll vs ${statusLabel}`,
        value: saveLevel
      });
    }
    if (saveLevel < 0) {
      rollLevel = {
        adv: 0,
        dis: Math.abs(saveLevel)
      };
      const statusLabel = getLabelFromKey(statusId, DC20RPG.failedSaveEffects)
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
  return _findRollClosestToZero(levelPerStatus, genesisPerStatus);
}

async function _updateRollMenuAndShowGenesis(levelsToUpdate, genesis, owner) {
  // Change genesis to text format
  let genesisText = [];
  genesis.forEach(gen => {
    if (gen.textOnly) genesisText.push(gen.text);
    else {
      const typeLabel = game.i18n.localize(`dc20rpg.sheet.rollMenu.${gen.type}`);
      genesisText.push(`${typeLabel}[${gen.value}] -> (${gen.sourceName}) from: ${gen.label}`);
    }
  })

  // Clear apCost
  levelsToUpdate.apCost = 0;
  const updateData = {
    ["flags.dc20rpg.rollMenu"]: levelsToUpdate
  }
  await owner.update(updateData);

  if (genesisText.length > 0) getSimplePopup("info", {information: genesisText, header: "Expected Roll Level"});
  if (genesisText.length === 0) getSimplePopup("info", {information: ["No modifications found"], header: "Expected Roll Level"});
}

async function _runCheckAgainstTargets(rollType, check, actorAskingForCheck) {
  const levelPerToken = [];
  const genesisPerToken = [];
  for (const token of game.user.targets) {
    const [rollLevel, genesis] = rollType === "attack" 
                    ? await _getAttackRollLevel(check, token.actor, "againstYou", token.name, actorAskingForCheck)
                    : await _getCheckRollLevel(check, token.actor, "againstYou", token.name, actorAskingForCheck)

    if (genesis) {
      levelPerToken.push(rollLevel);
      genesisPerToken.push(genesis);
    }
  }
  return _findRollClosestToZero(levelPerToken, genesisPerToken);
}

function _findRollClosestToZero(levelPerOption, genesisPerOption) {
  let manualActionRequired = false;
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
      if (lowestLevel[mod.type] < counter[mod.type]) {
        manualActionRequired = true;
        mod.label += ' <Requires Manual Action>';
      }
      else {
        counter[mod.type] += mod.value;
      }
    }
  });

  if (manualActionRequired) genesisPerOption.push({textOnly: true, text: game.i18n.localize("dc20rpg.sheet.rollMenu.unequalRollLevel")});
  return [lowestLevel, genesisPerOption.flat()];
}

function _getAttackPath(checkType, rangeType) {
  if (checkType === "attack") return `martial.${rangeType}`;
  if (checkType === "spell") return `spell.${rangeType}`;
  return "";
}

function _getCheckPath(checkKey, actor, category) {
  if (["mig", "agi", "cha", "int"].includes(checkKey)) return `checks.${checkKey}`;
  if (checkKey === "att") return `checks.att`;
  if (checkKey === "spe") return `checks.spe`;
  if (checkKey === "mar") {
    const acrModifier = actor.system.skills.acr.modifier;
    const athModifier = actor.system.skills.ath.modifier;
    checkKey = acrModifier >= athModifier ? "acr" : "ath";
    category = "skills";
  }
  if (!category) return;

  let attrKey = actor.system[category][checkKey].baseAttribute;
  if (attrKey === "prime") attrKey = actor.system.details.primeAttrKey;
  return `checks.${attrKey}`;
}

function _getSavePath(saveKey, actor) {
  if (saveKey === "phy") {
    const migSave = actor.system.attributes.mig.save;
    const agiSave = actor.system.attributes.agi.save;
    saveKey = migSave >= agiSave ? "mig" : "agi";
  }

  if (saveKey === "men") {
    const intSave = actor.system.attributes.int.save;
    const chaSave = actor.system.attributes.cha.save;
    saveKey = intSave >= chaSave ? "int" : "cha";
  }

  if (saveKey === "prime") saveKey = actor.system.details.primeAttrKey;
  return `saves.${saveKey}`;
}

function _getLangPath(actor) {
  const intSave = actor.system.attributes.int.check;
  const chaSave = actor.system.attributes.cha.check;
  const key = intSave >= chaSave ? "int" : "cha";
  return `checks.${key}`;
}

//======================================
//=       MULTIPLE CHECK PENALTY       =
//======================================
export function applyMultipleCheckPenalty(actor, distinction) {
  if (!distinction) return;

  // Get active started combat
  const activeCombat = game.combats.active;
  if (!activeCombat || !activeCombat.started) return;

  // If roll was made by actor on his turn apply multiple check penalty
  const combatantId = activeCombat.current.combatantId;
  const combatant = activeCombat.combatants.get(combatantId);
  if (combatant.actorId === actor.id) {
    const mcp = actor.system.mcp;
    mcp.push(distinction);
    actor.update({["system.mcp"]: mcp});
  }
}

export function clearMultipleCheckPenalty(actor) {
  actor.update({["system.mcp"]: []});
}

function _respectMultipleCheckPenalty(actor, checkKey) {
  let dis = 0;
  let genesis = [];
  actor.system.mcp.forEach(check => {
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