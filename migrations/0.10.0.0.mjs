export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {

    await _updateActorItems(actor);
    await _migrateEffects(actor);
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

    await _updateActorItems(actor);
    await _migrateEffects(actor);
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

        await _updateActorItems(actor);
        await _migrateEffects(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await migrateTechniqueToManeuver(item);
    await migrateWeaponStyleAndProperties(item);
    await _migrateAddToChat(item);
    await _migrateEffects(item);
  }
}

// ITEM
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await migrateTechniqueToManeuver(item);
    await migrateWeaponStyleAndProperties(item);
    await _migrateAddToChat(item);
    await _migrateEffects(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await migrateTechniqueToManeuver(item);
        await migrateWeaponStyleAndProperties(item);
        await _migrateAddToChat(item);
        await _migrateEffects(item);
      }
    }
  }
}

async function migrateTechniqueToManeuver(item) {
  if (item.type !== "technique") return;

  const itemData = item.toObject();
  itemData.type = "maneuver";
  const options = {keepId: true};
  if (item.actor) options.parent = item.actor;

  await item.delete();
  await Item.create(itemData, options);
}

async function migrateWeaponStyleAndProperties(item) {
  if (item.type !== "weapon") return;

  if (item.system.weaponStyle === "chained") await item.update({["system.weaponStyle"]: "whip"});
  if (item.system.properties.multiFaceted.active) {
    const multiFaceted = item.system.properties.multiFaceted;
    if (multiFaceted.weaponStyle.first === "chained") await item.update({["system.properties.multiFaceted.weaponStyle.first"]: "whip"})
    if (multiFaceted.weaponStyle.second === "chained") await item.update({["system.properties.multiFaceted.weaponStyle.second"]: "whip"})
  }
}

async function _migrateEffects(object) {
  for (const effect of object.effects) {
    let hasChanges = false
    for (const change of effect.changes) {
      if (change.key.includes("rollLevel")) {
        change.key = change.key.replace("rollLevel", "dynamicRollModifier");
        hasChanges = true;
      }
      if (change.key.includes("globalFormulaModifiers.attackDamage")) {
        change.key = change.key.replace("globalFormulaModifiers.attackDamage", "globalFormulaModifiers.damage");
        hasChanges = true;
      }
    }
    if (hasChanges) await effect.update({changes: effect.changes});
  }
}

async function _migrateAddToChat(item) {
  const addToChat = item.system.effectsConfig?.addToChat;
  if (!addToChat) return;

  for (const effect of item.effects) {
    await effect.update({["system.addToChat"]: true});
  }
}