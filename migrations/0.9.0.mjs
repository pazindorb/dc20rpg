export async function runMigration() {
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateFeatureTableHeaders(actor);
    await _updateActorBasicActions(actor);
    await _updateIgnoreFlagsEffects(actor);
    await _updateCombatTrainingEffects(actor);
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors
    await _updateFeatureTableHeaders(actor);
    await _updateActorBasicActions(actor);
    await _updateIgnoreFlagsEffects(actor);
    await _updateCombatTrainingEffects(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateFeatureTableHeaders(actor);
        await _updateActorBasicActions(actor);
        await _updateIgnoreFlagsEffects(actor);
        await _updateCombatTrainingEffects(actor);
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over world items
  for (const item of game.items) {
    await _updateIgnoreFlagsEffects(item);
    await _updateCombatTrainingEffects(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateIgnoreFlagsEffects(item);
        await _updateCombatTrainingEffects(item);
      }
    }
  }
}

// ACTORS
async function _updateFeatureTableHeaders(actor) {
  const features = {
    class: {
      name: "Class Features",
      order: 0,
      custom: false
    },
    subclass: {
      name: "Subclass Features",
      order: 1,
      custom: false
    },
    ancestry: {
      name: "Ancestry Traits",
      order: 2,
      custom: false
    },
    feature: {
      name: "Features",
      order: 3,
      custom: false
    },
    passive: {
      name: "Passives",
      order: 4,
      custom: false
    }
  };
  await actor.update({["flags.dc20rpg.headersOrdering.features"]: features});
}

async function _updateActorBasicActions(actor) {
  const basicActionIds = actor.items.filter(item => item.type === "basicAction").map(item => item.id);
  await actor.deleteEmbeddedDocuments("Item", basicActionIds);
  await actor.update({["flags.basicActionsAdded"]: false});
  actor.prepareBasicActions();
}

// ACTORS & ITEMS
async function _updateIgnoreFlagsEffects(owner) {
  if (!owner.effects) return;

  for (const effect of owner.effects) {
    const changes = effect.changes;
    let hasChanges = false;

    for (let i = 0; i < changes.length; i++) {
      if (changes[i].key === "system.details.ignoreDifficultTerrain") {
        changes[i].key = "system.globalModifier.ignore.difficultTerrain";
        hasChanges = true;
      }
      if (changes[i].key === "system.details.ignoreCloseQuarters") {
        changes[i].key = "system.globalModifier.ignore.closeQuarters";
        hasChanges = true;
      }
      if (changes[i].key === "system.details.ignoreLongRange") {
        changes[i].key = "system.globalModifier.ignore.longRange";
        hasChanges = true;
      }
      if (changes[i].key === "system.details.ignoreFlanking") {
        changes[i].key = "system.globalModifier.ignore.flanking";
        hasChanges = true;
      }
    }
    if (hasChanges) await effect.update({changes: effect.changes});
  }
}

async function _updateCombatTrainingEffects(owner) {
  if (!owner.effects) return;

  for (const effect of owner.effects) {
    const changes = effect.changes;
    let hasChanges = false;

    for (let i = 0; i < changes.length; i++) {
      if (changes[i].key.includes("system.masteries")) {
        changes[i].key = changes[i].key.replace("system.masteries", "system.combatTraining")
        hasChanges = true;
      }
      if (changes[i].key === "system.combatTraining.spellcasting" || changes[i].key === "system.combatTraining.weaponStyles") {
        changes[i].key = "";
        hasChanges = true;
      }
    }
    if (hasChanges) await effect.update({changes: changes});
  }
}