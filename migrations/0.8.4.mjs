export async function runMigration() {
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActorFlags(actor);
    await _removeDuplicatedEffects(actor);
    await _removeToolTypeItems(actor);
    await actor.prepareBasicActions();
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    await _updateActorFlags(actor);
    await _removeDuplicatedEffects(actor);
    await _removeToolTypeItems(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateActorFlags(actor);
        await _removeDuplicatedEffects(actor);
        await _removeToolTypeItems(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over items on world
  for (const itemSource of game.items._source) {
    if (itemSource.type === "tool") {
      const invalidItem = game.items.getInvalid(itemSource._id);
      invalidItem.delete();
    }
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        if (item.type === "tool") await item.delete();
      }
    }
  }
}

async function _updateActorFlags(actor) {
  const flags = actor.flags.dc20rpg;
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

  flags.actionHeld = {
    isHeld: false,
    itemId: null,
    itemImg: null,
    apForAdv: null,
    enhancements: null,
    mcp: null,
    rollsHeldAction: false
  }
  
  actor.update({["flags.dc20rpg"]: flags});
}

async function _removeToolTypeItems(actor) {
  const deleteIds = new Set()
  for ( const itemSource of actor.items._source ) {
    if (itemSource.type === "tool") {
      deleteIds.add(itemSource._id)
    }
  }
  if ( deleteIds.size > 0 ) await actor.deleteEmbeddedDocuments("Item", Array.from(deleteIds));
}

async function _removeDuplicatedEffects(actor) {
  const deleteIds = new Set();
  for ( const item of actor.items ) {
    for ( const effect of item.effects ?? [] ) {
      if ( !effect.transfer ) continue;
      const match = actor.effects.find(t => {
        const diff = foundry.utils.diffObject(t, effect);
        return t.origin?.endsWith(`Item.${item._id}`) && !("changes" in diff) && !deleteIds.has(t._id);
      });
      if ( match ) deleteIds.add(match._id);
    }
  }
  if ( deleteIds.size > 0 ) await actor.deleteEmbeddedDocuments("ActiveEffect", Array.from(deleteIds));
}