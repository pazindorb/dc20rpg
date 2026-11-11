export async function runMigration(migrateModules) {
  await DC20.migration.refreshSkillStoreWithDefault();

  await _migrateActors(migrateModules);
  await _migrateItems(migrateModules);

  // TODO: MIGRATE COLOR PALETTE DEFAULT:
  // --npc-table-1: #353a81;
  // --npc-table-2: #030b87;
  // --npc-main-light: #687eaf;
  // --pc-table-2: #4e008f;
  // (can be done with 
  // await game.settings.set("dc20rpg", "colorPaletteStore", null);
  // await game.settings.set("dc20rpg", "colorPaletteStore", defaultColorPalette());
  //)
}

// ======================= ACTOR =======================
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) await _migrateActor(actor);

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (actor) await _migrateActor(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) await _migrateActor(actor);
    }
  }
}

async function _migrateActor(actor) {
  await actor.skillAndLanguage.refreshAll();
}

// ======================= ITEM ========================
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) await _migrateItem(item);

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) await _migrateItem(item);
    }
  }
}

async function _migrateItem(item) {

}