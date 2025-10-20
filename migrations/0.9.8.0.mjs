export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {
    await _moveTradeSkills(actor);
    await _addInfusionTable(actor);
    await _updateActorItems(actor);
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
    
    await _moveTradeSkills(actor);
    await _addInfusionTable(actor);
    await _updateActorItems(actor);
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
        await _moveTradeSkills(actor);
        await _addInfusionTable(actor);
        await _updateActorItems(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _moveTradeSkills(actor) {
  if (!actor.system.tradeSkills) return;

  const updateData = {system: {trades: actor.system.trades}};
  for (const [key, trade] of Object.entries(actor.system.tradeSkills)) {
    if (updateData.system.trades[key]) {
      updateData.system.trades[key].mastery = trade.mastery;
    }
    else {
      updateData.system.trades[key] = trade;
    }
  }
  await actor.update(updateData);

  for (const effect of actor.allEffects) {
    await _updateTradeSkillEffect(effect);
  }
}

async function _addInfusionTable(actor) {
  if (actor !== "character") return;
  await actor.update({["flags.headersOrdering.spells.infusion"]: {
    name: "Infusions",
    order: 6,
    custom: true
  }});
}

async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _migrateUseCost(item);
    await _updateEnhancements(item);
  }
}

// ITEM
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _migrateUseCost(item);
    await _updateEnhancements(item);
    for (const effect of item.effects) {
      await _updateTradeSkillEffect(effect);
    }
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _migrateUseCost(item);
        await _updateEnhancements(item);
        for (const effect of item.effects) {
          await _updateTradeSkillEffect(effect);
        }
      }
    }
  }
}

async function _migrateUseCost(item) {
  const actionPoint = item.system.costs?.resources?.actionPoint;
  if (actionPoint != null) {
    await item.update({
      ["system.costs.resources.ap"]: actionPoint,
      ["system.costs.resources.actionPoint"]: null,
    });
  }
}

async function _updateEnhancements(item) {
  const enhs = item.system.enhancements;
  if (!enhs) return;

  const updateData = {};
  for (const [key, enh] of Object.entries(enhs)) {
    const upadtedEnh = foundry.utils.mergeObject(new DC20.Enhancement(item), enh);
    if (upadtedEnh.charges.consume && upadtedEnh.charges.subtract == null) {
      upadtedEnh.charges['-=consume'] = null;
      upadtedEnh.charges.subtract = 1;
    }
    if (upadtedEnh.resources.actionPoint != null && upadtedEnh.resources.ap == null) {
      upadtedEnh.resources.ap = upadtedEnh.resources.actionPoint;
      upadtedEnh.resources['-=actionPoint'] = null;
    }
    updateData[key] = upadtedEnh;
  }
  await item.update({["system.enhancements"]: updateData});
}

// EFFECTS
async function _updateTradeSkillEffect(effect) {
  const changes = effect.changes;
  let hasChanges = false;

  for (let i = 0; i < changes.length; i++) {
    if (changes[i].key.includes(".tradeSkills")) {
      changes[i].key = changes[i].key.replace(".tradeSkills", ".trades")
      hasChanges = true;
    }
  }
  if (hasChanges) await effect.update({changes: effect.changes});
}