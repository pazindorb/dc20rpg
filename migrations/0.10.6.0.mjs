export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {

    await _updateActorItems(actor);
    await actor.prepareBasicActions();
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors

    await _updateActorItems(actor);
    await actor.prepareBasicActions();
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {

        await _updateActorItems(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _migrateEnhancements(item);
  }
}

// ITEM
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _migrateEnhancements(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _migrateEnhancements(item);
      }
    }
  }
}

// TODO: Can we check macro that adds enhancemement as well?
async function _migrateEnhancements(item) {
  const enhancements = item.system.enhancements;
  if (!enhancements) return;

  const updateData = {};
  let hasChanges = false;
  for (const [key, enh] of Object.entries(enhancements)) {
    enh.repeatable = true;
    enh.defaultState = 0;
    enh.copyToSheetRoll = {};
    enh.modifications.changeDuration = false,
    enh.modifications.duration = {value: null, type: "", timeUnit: ""};

    updateData[`system.enhancements.${key}`] = enh;
    hasChanges = true;
  }
  
  if (hasChanges) await item.update(updateData);
}

  // - dodać metodę która zbiera efekty z wszystkich enhancementów i Target Modifierów? Przydało by sie do puszczania macro updatujących - ale czy gdzieś indziej?