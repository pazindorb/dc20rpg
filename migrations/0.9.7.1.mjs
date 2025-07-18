export async function runMigration(migrateModules) {
  await _migrateActors(migrateModules);
}

async function _migrateActors(migrateModules) {
  // Iterate over actors
  for (const actor of game.actors) {
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
        await actor.prepareBasicActions();
      }
    }
  }
}