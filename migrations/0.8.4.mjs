export async function runMigration() {
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _removeToolTypeItems(actor);
    await _updateActorFlags(actor);
    await _migrateActorItemsAndEffects(actor);
    await actor.prepareBasicActions();
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    await _removeToolTypeItems(actor);
    await _updateActorFlags(actor);
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
        await _removeToolTypeItems(actor);
        await _updateActorFlags(actor);
        await _migrateActorItemsAndEffects(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over world item sources
  for (const itemSource of game.items._source) {
    if (itemSource.type === "tool") {
      const invalidItem = game.items.getInvalid(itemSource._id);
      invalidItem.delete();
    }
  }
  // Iterate over world items
  for (const item of game.items) {
    await _migrateFailEffectsToAgainstEffects(item);
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
        else {
          await _migrateFailEffectsToAgainstEffects(item);
        }
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
  
  await actor.update({["flags.dc20rpg"]: flags});
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

async function _migrateActorItemsAndEffects(actor) {
  let duplicatedEffects = new Set();
  for ( const item of actor.items ) {
    await _migrateFailEffectsToAgainstEffects(item);
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

async function _migrateFailEffectsToAgainstEffects(item) {
  const updateData = {system: { againstEffect: {
    id: "",
    supressFromChatMessage: false,
    untilYourNextTurnStart: false,
    untilYourNextTurnEnd: false,
    untilTargetNextTurnStart: false,
    untilTargetNextTurnEnd: false,
    untilFirstTimeTriggered: false,
  }}};

  // Move Fail Effect from save to againstEffect
  if (item.system.save?.failEffect) {
    updateData.system.againstEffect.id = item.system.save.failEffect;
    updateData.system.save = {failEffect: ""}
  }

  // Move Fail Effect from contest to againstEffect
  if (item.system.check?.failEffect) {
    updateData.system.againstEffect.id = item.system.check.failEffect;
    updateData.system.check = {failEffect: ""}
  }

  // Move Fail Effects from enhanceements
  if (item.system.enhancements) {
    updateData.system.enhancements = {};
    for (const [key, enh] of Object.entries(item.system.enhancements)) {
      if (enh.modifications.save?.failEffect) {
        enh.modifications.addsAgainstEffect = true;
        enh.modifications.againstEffect = {
          id: enh.modifications.save.failEffect,
          supressFromChatMessage: false,
          untilYourNextTurnStart: false,
          untilYourNextTurnEnd: false,
          untilTargetNextTurnStart: false,
          untilTargetNextTurnEnd: false,
          untilFirstTimeTriggered: false,
        }
        delete enh.modifications.save.failEffect;
        updateData.system.enhancements[key] = enh;
      }
    }
  }
  await item.update(updateData);
}