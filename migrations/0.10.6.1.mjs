export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ======================= ACTOR =======================
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateEffects(actor);
    
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors

    await _updateEffects(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateEffects(actor);
      }
    }
  }
}

// ======================= ITEM =======================
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _updateEffects(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateEffects(item);
      }
    }
  }
}

async function _updateEffects(object) {
  for (const effect of object.effects.values()) {
    _migrateReductionsToGlobalModifiers(effect);
  }

  if (object.documentName === "Item") {
    for (const effect of (object?.collectRootedEffects() || [])) {
      await _migrateReductionsToGlobalModifiers(effect);
    }
  }
}

async function _migrateReductionsToGlobalModifiers(effect) {
  let shouldUpdate = false;
  const changes = [];
  for (const change of effect.system.changes) {
    if (change.key === "system.healingReduction.flat") {
      change.key = "system.globalModifier.modify.healingTaken.flat";
      change.value = (-1 * change.value);
      shouldUpdate = true;
    }
    if (change.key === "system.healingReduction.flatHalf") {
      change.key = "system.globalModifier.modify.healingTaken.reduce";
      shouldUpdate = true;
    }

    if (change.key === "system.damageReduction.flat") {
      change.key = "system.globalModifier.modify.damageTaken.flat";
      change.value = (-1 * change.value);
      shouldUpdate = true;
    }
    if (change.key === "system.damageReduction.flatHalf") {
      change.key = "system.globalModifier.modify.damageTaken.reduce";
      shouldUpdate = true;
    }

    changes.push(change);
  }

  if (shouldUpdate) await effect.update({["system.chanes"]: changes});
}