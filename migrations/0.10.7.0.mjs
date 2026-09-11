export async function runMigration(migrateModules) {
  await _migrateActors(migrateModules);
  await _migrateTokenHotbarConfig();
}

async function _migrateTokenHotbarConfig() {
  const hasPgtSettings = game.settings.settings.has("pazindor-token-hotbar.tokenHotbarSettings");
  const hasDC20Settings = game.settings.settings.has("dc20rpg.tokenHotbarSettings");
  if (!(hasPgtSettings && hasDC20Settings)) return;

  const pgtSettings = game.settings.get("pazindor-token-hotbar", "tokenHotbarSettings");
  const dc20Settings = game.settings.get("dc20rpg", "tokenHotbarSettings");
  pgtSettings.displayToken = dc20Settings.displayToken;
  pgtSettings.effects = dc20Settings.effects;
  pgtSettings.markers = dc20Settings.markers;
  pgtSettings.sectionA = dc20Settings.sectionA;
  pgtSettings.sectionB = dc20Settings.sectionB;
  pgtSettings.showCharges = dc20Settings.showCharges;
  game.settings.set("pazindor-token-hotbar", "tokenHotbarSettings", pgtSettings);
}

// ======================= ACTOR =======================
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

