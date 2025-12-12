export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {

    await _updateActorItems(actor);
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
      }
    }
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items) {

  }
}

// ITEM
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {

  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        if (item.type === "technique")
      }
    }
  }
}