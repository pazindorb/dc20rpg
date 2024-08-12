import { createInfoDisplayDialog } from "../dialogs/info-display.mjs";
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

export function runItemRollLevelCheck(item, actor) {
  const actionType = item.system.actionType;
  let rollLevelPath = "";
  let checkKey = "";
  switch (actionType) {
    case "dynamic": case "attack":
      const attackFormula = item.system.attackFormula;
      checkKey = attackFormula.checkType.substr(0, 3);
      rollLevelPath += _getAttackPath(attackFormula.checkType, attackFormula.rangeType);
      break;

    case "contest": case "check":
      checkKey = item.system.check.checkKey;
      rollLevelPath += _getCheckPath(checkKey, actor, "skills");
      break;
  }
  // Multiple check penalty
  let [rollLevel, genesis] = _respectMultipleCheckPenalty(actor, checkKey);

  // Collect roll level form actor
  if (rollLevelPath) {
    const path = `system.rollLevel.onYou.${rollLevelPath}`
    const [actorRollLevel, actorGenesis] = _getRollLevel(getValueFromPath(actor, path), "You");
    rollLevel.adv += actorRollLevel.adv;
    rollLevel.dis += actorRollLevel.dis;
    genesis = [...genesis, ...actorGenesis];
  }
  
  // Collect roll level form targets
  if (["dynamic", "attack"].includes(actionType)) {
    const attackFormula = item.system.attackFormula;
    const [targetRollLevel, targetGenesis] = _runCheckAgainstTargets(attackFormula.checkType, attackFormula.rangeType);
    rollLevel.adv += targetRollLevel.adv;
    rollLevel.dis += targetRollLevel.dis;
    genesis = [...genesis, ...targetGenesis];
  }

  _updateRollMenuAndShowGenesis(rollLevel, genesis, item);
}

export async function runSheetRollLevelCheck(details, actor) {
  let rollLevelPath = "";
  switch(details.type) {
    case "save":
      rollLevelPath += _getSavePath(details.checkKey, actor);
      break;

    case "attributeCheck": case "attackCheck": case "spellCheck": case "skillCheck":
      // Find category (skills or trade)
      let category = "";
      if (actor.system.skills[details.checkKey]) category = "skills";
      if (actor.type === "character" && actor.system.tradeSkills[details.checkKey]) category = "tradeSkills";
      rollLevelPath += _getCheckPath(details.checkKey, actor, category);
      break;

    case "lang":
      rollLevelPath += _getLangPath(actor);
      break;
  }
  if (!rollLevelPath) return;

  // Multiple check penalty
  let [rollLevel, genesis] = _respectMultipleCheckPenalty(actor, details.checkKey);

  // Collect roll level form actor
  if (rollLevelPath) {
    const path = `system.rollLevel.onYou.${rollLevelPath}`
    const [actorRollLevel, actorGenesis] = _getRollLevel(getValueFromPath(actor, path), "You");
    rollLevel.adv += actorRollLevel.adv;
    rollLevel.dis += actorRollLevel.dis;
    genesis = [...genesis, ...actorGenesis];
  }

  // Collect roll level from actor for saves vs statuses
  const [statusRollLevel, statusGenesis] = _getRollAdvantageVsStatuses(actor, details.statuses);
  rollLevel.adv += statusRollLevel.adv;
  rollLevel.dis += statusRollLevel.dis;
  genesis = [...genesis, ...statusGenesis];
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

function _getRollLevel(rollLevel, sourceName) {
  const parsed = [];
  for(const json of rollLevel) {
    try {
      const obj = JSON.parse(`{${json}}`);
      parsed.push(obj)
    } catch (e) {
      console.warn(`Cannot parse roll level modification json: ${e}`)
    }
  }

  const levelsToUpdate = {
    adv: 0,
    dis: 0
  }
  const genesis = [];

  for (const modification of parsed) {
    levelsToUpdate[modification.type] += modification.value;

    genesis.push({
      type: modification.type,
      sourceName: sourceName,
      label: modification.label,
      value: modification.value
    })
  }
  return [levelsToUpdate, genesis];
}

function _getRollAdvantageVsStatuses(actor, statuses) {
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

  if (genesisText.length > 0) createInfoDisplayDialog(genesisText, "Expected Roll Level");
  if (genesisText.length === 0) createInfoDisplayDialog(["No modifications found"], "Expected Roll Level");
}

function _runCheckAgainstTargets(checkType, rangeType) {
  const levelPerToken = [];
  const genesisPerToken = [];
  game.user.targets.forEach(token => {
    const [rollLevel, genesis] = _checkForToken(token, checkType, rangeType);
    if (rollLevel) {
      levelPerToken.push(rollLevel);
      genesisPerToken.push(genesis);
    }
  });
  return _findRollClosestToZero(levelPerToken, genesisPerToken);
}

function _checkForToken(token, checkType, rangeType) {
  const actor = token.actor;
  if (!actor) return null;

  const rollLevelPath = _getAttackPath(checkType, rangeType);
  const path = `system.rollLevel.againstYou.${rollLevelPath}`
  return _getRollLevel(getValueFromPath(actor, path), actor.name);
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