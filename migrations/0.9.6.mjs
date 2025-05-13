export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

async function _migrateActors(migrateModules) {
  // Iterate over actors
  for (const actor of game.actors) {

    await _moveEffectFlagsToSystem(actor);
    await _updateActorItems(actor);
  }

  // Iterate over tokens
  const allTokens = [];
  game.scenes.forEach(scene => {
    if (scene) scene.tokens.forEach(token => {if (token && !token.actorLink) allTokens.push(token)})
  })
  for (let i = 0; i < allTokens.length; i++) {
    const actor = allTokens[i].actor;
    if (!actor) continue; // Some modules create tokens without actors

    await _moveEffectFlagsToSystem(actor);
    await _updateActorItems(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {

        await _moveEffectFlagsToSystem(actor);
        await _updateActorItems(actor);
      }
    }
  }
}

async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _moveEffectFlagsToSystem(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _moveEffectFlagsToSystem(item);
      }
    }
  }
}

// ACTOR
async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _moveEffectFlagsToSystem(item);
  }
}

async function _moveEffectFlagsToSystem(owner) {
  const effects = owner.effects;
  for (const effect of effects) {
    const flags = effect.flags.dc20rpg || {};
    await effect.update({system: {
      duration: {
        useCounter: flags?.duration?.useCounter || false,
        resetWhenEnabled: flags?.duration?.resetWhenEnabled || false,
        onTimeEnd: flags?.duration?.onTimeEnd || ""
      },
      disableWhen: {
        path: flags?.disableWhen?.path || "",
        mode: flags?.disableWhen?.mode || "",
        value: flags?.disableWhen?.value || "",
      },
      effectKey: flags.effectKey,
      macro: flags.macro,
      addToChat: flags.addToChat,
      nonessential: flags.nonessential,
      requireEnhancement: flags.requireEnhancement
    }});
  }
}

// EFFECTS
async function _updateConditionResistances(owner) {
  const effects = owner.effects;
  for (const effect of effects) {
    const changes = effect.changes;
    let hasChanges = false;

    for (let i = 0; i < changes.length; i++) {
      if (changes[i].key.includes(".advantage")) {
        if (changes[i].value > 0) {
          changes[i].key = changes[i].key.replace(".advantage", ".resistance");
          hasChanges = true;
        }
        if (changes[i].value < 0) {
          changes[i].key = changes[i].key.replace(".advantage", ".vulnerability");
          changes[i].value = Math.abs(changes[i].value);
          hasChanges = true;
        }
      }
    }
    if (hasChanges) await effect.update({changes: effect.changes});
  }
}

async function _updateDamageReduction(owner) {
  const effects = owner.effects;
  for (const effect of effects) {
    const changes = effect.changes;
    let hasChanges = false;

    for (let i = 0; i < changes.length; i++) {
      if (changes[i].key === "system.damageReduction.pdr.bonus") {
        changes[i].key = "system.damageReduction.pdr.active";
        changes[i].value = true;
        hasChanges = true;
      }
      if (changes[i].key === "system.damageReduction.mdr.bonus") {
        changes[i].key = "system.damageReduction.mdr.active";
        changes[i].value = true;
        hasChanges = true;
      }
    }
    if (hasChanges) await effect.update({changes: effect.changes});
  }
}