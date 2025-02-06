export async function runMigration() {
  await _migrateActors();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _migrateActorItemsAndEffects(actor);
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors
    await _migrateActorItemsAndEffects(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _migrateActorItemsAndEffects(actor);
      }
    }
  }
}

async function _migrateActorItemsAndEffects(actor) {
  let duplicatedEffects = new Set();
  for ( const item of actor.items ) {
    _findDuplicatedEffects(item, actor).forEach(duplicate => duplicatedEffects.add(duplicate));
  }
  if ( duplicatedEffects.size > 0 ) await actor.deleteEmbeddedDocuments("ActiveEffect", Array.from(duplicatedEffects));
}

function _findDuplicatedEffects(item, actor) {
  const duplicatedEffects = new Set();
  for ( const effect of item.effects ?? [] ) {
    if ( !effect.transfer ) continue;
    const match = actor.effects.find(actorEffect => {
      const diff = foundry.utils.diffObject(actorEffect, effect);
      return actorEffect.origin?.endsWith(`Item.${item._id}`) && !("changes" in diff) && !duplicatedEffects.has(actorEffect._id);
    });
    if (match) duplicatedEffects.add(match._id);
  }
  return duplicatedEffects;
}