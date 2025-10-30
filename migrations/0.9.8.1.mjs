export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {
    await removeParentItemFromUniqueItems(actor); 
    await updateTradeSkills(actor);
    await updateGritFormula(actor);
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors

    await removeParentItemFromUniqueItems(actor);
    await updateTradeSkills(actor);
    await updateGritFormula(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await removeParentItemFromUniqueItems(actor);
        await updateTradeSkills(actor);
        await updateGritFormula(actor);
      }
    }
  }
}

async function removeParentItemFromUniqueItems(actor) {
  for (const item of actor.items) {
    if (!item.system.unique) continue;
    for (const [key, advancement] of Object.entries(item.system.advancements)) {
      if (advancement.parentItem) await item.update({[`system.advancements.${key}.-=parentItem`]: null});
    }
  }
}

async function updateTradeSkills(actor) {
  await actor.update({["system.trades"]: actor.system.tradeSkills});
}

async function updateGritFormula(actor) {
  if (actor.type !== "character") return;
  await actor.update({["system.resources.grit.maxFormula"]: '2 + @chaValue + @resources.grit.bonus'});
}

// ITEM
async function _migrateItems(migrateModules) {
}