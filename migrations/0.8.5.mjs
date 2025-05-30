export async function runMigration() {
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActorRestPointsFromula(actor);
    await _updateActorItems(actor);
    await _updateActorBasicActions(actor);
    await _restoreMissingSkillLabels(actor);
    await _updateEffects(actor.effects);
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors
    await _updateActorRestPointsFromula(actor);
    await _updateActorItems(actor);
    await _updateActorBasicActions(actor);
    await _restoreMissingSkillLabels(actor);
    await _updateEffects(actor.effects);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateActorRestPointsFromula(actor);
        await _updateActorItems(actor);
        await _updateActorBasicActions(actor);
        await _restoreMissingSkillLabels(actor);
        await _updateEffects(actor.effects);
      }
    }
  }
}

async function _migrateItems() {

  // Iterate over world items
  for (const item of game.items) {
    await _moveSavesAndContestsToRollRequests(item);
    await _moveAgainstEffectsToAgainstStatuses(item);
    await _addNewEnhancementFields(item);
    await _updateEffects(item.effects);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _moveSavesAndContestsToRollRequests(item);
        await _moveAgainstEffectsToAgainstStatuses(item);
        await _addNewEnhancementFields(item);
        await _updateEffects(item.effects);
      }
    }
  }
}

// ACTORS
async function _updateActorRestPointsFromula(actor) {
  const resources = actor.system.resources;
  const maxFormula = resources.restPoints?.maxFormula;
  if (!maxFormula) return;

  if (maxFormula.includes('rest.restPoints.')) {
    maxFormula = maxFormula.replace("rest.restPoints.", "resources.restPoints.");
    await actor.update({["system.resources.restPoints.maxFormula"]: maxFormula})
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _moveSavesAndContestsToRollRequests(item);
    await _moveAgainstEffectsToAgainstStatuses(item);
    await _addNewEnhancementFields(item);
    await _updateEffects(item.effects);
  }
}

async function _updateActorBasicActions(actor) {
  const basicActionIds = actor.items.filter(item => item.type === "basicAction").map(item => item.id);
  await actor.deleteEmbeddedDocuments("Item", basicActionIds);
  await actor.update({["flags.basicActionsAdded"]: false});
  actor.prepareBasicActions();
}

async function _restoreMissingSkillLabels(actor) {
  const skills = actor.system.skills;
  const trades = actor.system.tradeSkills;
  const langs = actor.system.languages;
  
  const updateData = {
    skills: {},
    tradeSkills: {},
    languages: {},
  }

  if (skills) Object.entries(skills).forEach(([key, skill]) => {
    if (!skill.label) {
      const updated = skill;
      updated.label = game.i18n.localize(`dc20rpg.skills.${key}`);
      updateData.skills[key] = updated;
    }
  });

  if (trades) Object.entries(trades).forEach(([key, skill]) => {
    if (!skill.label) {
      const updated = skill;
      updated.label = game.i18n.localize(`dc20rpg.trades.${key}`);
      updateData.tradeSkills[key] = updated;
    }
  });

  if (langs) Object.entries(langs).forEach(([key, skill]) => {
    if (!skill.label) {
      const updated = skill;
      updated.label = game.i18n.localize(`dc20rpg.languages.${key}`);
      updateData.languages[key] = updated;
    }
  });
  await actor.update({system: updateData});
}

// ITEMS
async function _moveSavesAndContestsToRollRequests(item) {
  const updateData = {system: {enhancements: {}}}

  const actionType = item.system.actionType
  // Dynamic
  if (actionType === "dynamic") {
    updateData.system.actionType = "attack";
    const saveData = item.system.save;
    updateData.system.rollRequests = {
      rollRequestFromTemplate: {
        category: "save",
        saveKey: saveData.type,
        contestedKey: "",
        dcCalculation: saveData.calculationKey,
        dc: 0,
        addMasteryToDC: saveData.addMastery,
        respectSizeRules: false,
      }
    }
  }

  // Save 
  if (actionType === "save") {
    updateData.system.actionType = "other";
    const saveData = item.system.save;
    updateData.system.rollRequests = {
      rollRequestFromTemplate: {
        category: "save",
        saveKey: saveData.type,
        contestedKey: "",
        dcCalculation: saveData.calculationKey,
        dc: 0,
        addMasteryToDC: saveData.addMastery,
        respectSizeRules: false,
      }
    }
  }

  // Contests
  if (actionType === "contest") {
    updateData.system.actionType = "check";
    updateData.system.check = {againstDC: false};
    const checkData = item.system.check;
    updateData.system.rollRequests = {
      rollRequestFromTemplate: {
        category: "contest",
        saveKey: "",
        contestedKey: checkData.contestedKey,
        dcCalculation: "spell",
        dc: 0,
        addMasteryToDC: true,
        respectSizeRules: checkData.respectSizeRules,
      }
    }
  }

  // Enchancements
  const enhancements = item.system.enhancements;
  if (enhancements) {
    for(const [enhKey, enh] of Object.entries(enhancements)) {
      // Skip when item was already migrated
      if (enh.modifications.rollRequest && !enh.modifications.save) continue;

      const saveData = enh.modifications.save;
      const addsNewRollRequest = enh.modifications.overrideSave;
      const rollRequest = {
        category: "save",
        saveKey: saveData.type,
        contestedKey: "",
        dcCalculation: saveData.calculationKey,
        dc: 0,
        addMasteryToDC: saveData.addMastery,
        respectSizeRules: false,
      }

      updateData.system.enhancements[enhKey] = {
        modifications: {
          ["-=overrideSave"]: null,
          ["-=save"]: null,
          addsNewRollRequest: addsNewRollRequest,
          rollRequest: rollRequest
        }
      }
    }
  }

  await item.update(updateData);
}

async function _moveAgainstEffectsToAgainstStatuses(item) {
  const updateData = {system: {enhancements: {}, againstStatuses: {}}}
  // Item
  const againstEffect = item.system.againstEffect;
  const againstStatuses = item.system.againstStatuses;
  if (againstEffect?.id && Object.keys(againstStatuses).length === 0) {
    const key = foundry.utils.randomID();
    updateData.system.againstStatuses[key] = againstEffect;
  }

  // Enhancements
  const enhancements = item.system.enhancements;
  if (enhancements) {
    for(const [enhKey, enh] of Object.entries(enhancements)) {
      // Skip when item was already migrated
      if (enh.modifications.againstStatus && !enh.modifications.againstEffect) continue;

      const againstEffect = enh.modifications.againstEffect;
      const addsAgainstStatus = enh.modifications.addsAgainstEffect;
      updateData.system.enhancements[enhKey] = {
        modifications: {
          ["-=addsAgainstEffect"]: null,
          ["-=againstEffect"]: null,
          addsAgainstStatus: addsAgainstStatus,
          againstStatus: againstEffect
        }
      }
    }
  }

  await item.update(updateData);
}

async function _addNewEnhancementFields(item) {
  const updateData = {system: {enhancements: {}}}
  const enhancements = item.system.enhancements;
  if (enhancements) {
    for(const [enhKey, enh] of Object.entries(enhancements)) {
      // Skip when item was already migrated
      if (enh.modifications.rollLevel && enh.modifications.bonusRange) continue;

      updateData.system.enhancements[enhKey] = {
        modifications: {
          rollLevelChange: false,
          rollLevel: {
            type: "adv",
            value: 1
          },
          addsRange: false,
          bonusRange: {
            melee: null,
            normal: null,
            max: null
          }
        }
      }
    }
    if (Object.keys(enhancements).length > 0) await item.update(updateData);
  }
}

// Effects
async function _updateEffects(effects) {
  if (!effects) return;

  for (const effect of effects) {
    let shouldUpdate = false;
    let disableWhen = effect.flags?.dc20rpg?.disableWhen?.path || "";

    if (disableWhen === "system.details.armorEquipped") {
      disableWhen = "system.details.armor.armorEquipped";
      shouldUpdate = true;
    }
    if (disableWhen === "system.details.heavyEquipped") {
      disableWhen = "system.details.armor.heavyEquipped";
      shouldUpdate = true;
    }

    const changes = effect.changes;
    for (const change of changes) {
      if (change.value.includes('rest.restPoints.')) {
        change.value = change.value.replace("rest.restPoints.", "resources.restPoints.");
        shouldUpdate = true;
      }
      if (change.key.includes('system.conditions.')) {
        change.key = change.key.replace("system.conditions.", "system.statusResistances.");
        shouldUpdate = true;
      }
      if (change.key.includes('system.rest.restPoints.')) {
        change.key = change.key.replace("system.rest.restPoints.", "system.resources.restPoints.");
        shouldUpdate = true;
      }
    }
    if (shouldUpdate) {
      for (const change of changes) {
        change.value = parseFromString(change.value)
      }
      await effect.update({
        changes: changes,
        ["flags.dc20rpg.disableWhen.path"]: disableWhen
      });
    }
  }
}

function parseFromString(string) {
  if (string === undefined) return undefined;
  if (string === null) return null;
  if (string.startsWith('"') && string.endsWith('"')) string = string.substring(1, string.length-1);
  if (string.startsWith("'") && string.endsWith("'")) string = string.substring(1, string.length-1);
  if (string === "") return string;
  if (string === "true") return true;
  if (string === "false") return false;
  if (!isNaN(Number(string))) return Number(string);
  return string;
}