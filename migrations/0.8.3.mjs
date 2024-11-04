import { runDefaultColorsUpdate } from "../module/settings/colors.mjs";

export async function runMigration() {
  await runDefaultColorsUpdate();
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActiveEffectsOn(actor);
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    await _updateActiveEffectsOn(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateActiveEffectsOn(actor);
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over items on world
  for (const item of game.items) {
    await _updateActiveEffectsOn(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateActiveEffectsOn(item);
      }
    }
  }
}

async function _updateActiveEffectsOn(owner) {
  if (!owner.effects) return;
  for (const effect of owner.effects) {
    let shouldBeUpdated = false;
    const changes = effect.changes;
    for(let i = 0; i < changes.length; i++) {
      if (changes[i].key.startsWith("system.vision.")) {
        changes[i].key = changes[i].key.replace("system.vision.", "system.senses.");
        shouldBeUpdated = true;
      }
    }
    if (shouldBeUpdated) await effect.update({changes: changes});
  }
}