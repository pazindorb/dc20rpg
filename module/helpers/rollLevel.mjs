import { createInfoDisplayDialog } from "../dialogs/info-display.mjs";
import { getValueFromPath } from "./utils.mjs";

export function runItemRollLevelCheck(item, actor) {
  const actionType = item.system.actionType;
  let rollLevelPath = "";
  switch (actionType) {
    case "dynamic": case "attack":
      const attackFormula = item.system.attackFormula;
      rollLevelPath += _getAttackPath(attackFormula.checkType, attackFormula.rangeType);
      break;

    case "contest": case "check":
      rollLevelPath += _getItemCheckPath(item.system.check.checkKey, actor, "skills");
      break;
  }


  if (!rollLevelPath) return;

  // Collect roll level form actor
  const path = `system.rollLevel.onYou.${rollLevelPath}`
  let [rollLevel, genesis] = _getRollLevel(getValueFromPath(actor, path), "You");
  
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
      rollLevelPath += _getSavePath(details.attr, actor);
      break;

    case "attributeCheck": case "attackCheck": case "spellCheck": case "skillCheck":
      rollLevelPath += _getSheetCheckPath(details.attr, actor);
      break;

    case "lang":
      rollLevelPath += _getLangPath(actor);
      break;
  }
  if (!rollLevelPath) return;

  // Collect roll level form actor
  const path = `system.rollLevel.onYou.${rollLevelPath}`
  const [rollLevel, genesis] = _getRollLevel(getValueFromPath(actor, path), "You");
  await _updateRollMenuAndShowGenesis(rollLevel, genesis, actor);
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

  const updateData = {
    ["flags.dc20rpg.rollMenu"]: levelsToUpdate
  }
  await owner.update(updateData);

  if (genesisText.length > 0) createInfoDisplayDialog(genesisText, "Expected Roll Level");
  if (genesisText.length === 0) createInfoDisplayDialog(["No modifications found"], "Expected Roll Level");
}

function _runCheckAgainstTargets(checkType, rangeType) {
  let manualActionRequired = false;
  const levelPerToken = [];
  const genesisPerToken = [];
  game.user.targets.forEach(token => {
    const [rollLevel, genesis] = _checkForToken(token, checkType, rangeType);
    if (rollLevel) {
      levelPerToken.push(rollLevel);
      genesisPerToken.push(genesis);
    }
  });

  if (levelPerToken.length === 0) return [{adv: 0,dis: 0}, []];

  // We need to find roll level that is closest to 0 so players can manualy change that later
  let lowestLevel = levelPerToken[0];
  for(let i = 1; i < levelPerToken.length; i++) {
    const currentLow = Math.abs(lowestLevel.adv - lowestLevel.dis);
    const newLow = Math.abs(levelPerToken[i].adv - levelPerToken[i].dis);

    if (newLow < currentLow) {
      lowestLevel = levelPerToken[i];
    }
  }

  // Now we need to mark which targets requiere some manual modifications to be done, 
  // because those have higher levels of advantages/disadvantages
  genesisPerToken.forEach(genesis => {
    let counter = {
      adv: 0,
      dis: 0,
    };
    for(let mod of genesis) {
      if (lowestLevel[mod.type] <= counter[mod.type]) {
        manualActionRequired = true;
        mod.label += ' <Requires Manual Action>';
      }
      else {
        counter[mod.type]++;
      }
    }
  });

  if (manualActionRequired) genesisPerToken.push({textOnly: true, text: game.i18n.localize("dc20rpg.sheet.rollMenu.unequalRollLevel")});
  return [lowestLevel, genesisPerToken.flat()];
}

function _checkForToken(token, checkType, rangeType) {
  const actor = token.actor;
  if (!actor) return null;

  const rollLevelPath = _getAttackPath(checkType, rangeType);
  const path = `system.rollLevel.againstYou.${rollLevelPath}`
  return _getRollLevel(getValueFromPath(actor, path), actor.name);
}

function _getAttackPath(checkType, rangeType) {
  if (checkType === "attack") return `martial.${rangeType}`;
  if (checkType === "spell") return `spell.${rangeType}`;
  return "";
}

function _getItemCheckPath(checkKey, actor, category) {
  if (checkKey === "att") return `checks.att`;
  if (checkKey === "spe") return `checks.spe`;
  if (checkKey === "mar") {
    const acrModifier = actor.system.skills.acr.modifier;
    const athModifier = actor.system.skills.ath.modifier;
    checkKey = acrModifier >= athModifier ? "acr" : "ath";
  }

  let attrKey = actor.system[category][checkKey].baseAttribute;
  if (attrKey === "prime") attrKey = actor.system.details.primeAttrKey;
  return `checks.${attrKey}`;
}

function _getSheetCheckPath(attrKey, actor) {
  if (attrKey === "mar") {
    const acrModifier = actor.system.skills.acr.modifier;
    const athModifier = actor.system.skills.ath.modifier;
    const acrBase = actor.system.skills.acr.baseAttribute;
    const athBase = actor.system.skills.ath.baseAttribute;
    attrKey = acrModifier >= athModifier ? acrBase : athBase;
  }

  if (attrKey === "prime") attrKey = actor.system.details.primeAttrKey;
  return `checks.${attrKey}`
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