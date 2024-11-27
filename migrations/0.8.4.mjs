export async function runMigration() {
  await _migrateActors();
  // await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActorFlags(actor);
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    await _updateActorFlags(actor);
  }

  // Iterate over compendium actors
  // for (const compendium of game.packs) {
  //   if (compendium.metadata.packageType === "world"
  //     && !compendium.locked
  //     && compendium.documentName === "Actor"
  //   ) {
  //     const content = await compendium.getDocuments();
  //     for (const actor of content) {
  //       await _updateActorFlags(actor);
  //     }
  //   }
  // }
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

async function _updateActorFlags(owner) {
  const flags = owner.flags.dc20rpg;
  if (!flags) return;

  const headersOrdering = flags.headersOrdering;
  if (!headersOrdering) return

  headersOrdering.basic =  {
    offensive: {
      name: "Offensive",
      order: 0,
      custom: false
    },
    defensive: {
      name: "Defensive",
      order: 1,
      custom: false
    },
    utility: {
      name: "Utility",
      order: 2,
      custom: false
    },
    reaction: {
      name: "Reaction",
      order: 3,
      custom: false
    },
    skillBased: {
      name: "Skill Based",
      order: 4,
      custom: false
    },
  }

  if (headersOrdering.inventory?.tool) {
    delete headersOrdering.inventory.tool;
  }

  if (headersOrdering.favorites) {
    headersOrdering.favorites.basic = {
      name: "Basic Actions",
      order: 0,
      custom: false
    };
  }

  if (flags.headerFilters) {
    flags.headerFilters.basic = "";
  }
  
  owner.update({["flags.dc20rpg"]: flags});
}