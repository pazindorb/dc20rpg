export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ======================= ACTOR =======================
async function _migrateActors(migrateModules) {  
  // Iterate over actors
  for (const actor of game.actors) {

    await _migrateResourceResetToRefresh(actor);
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

    await _migrateResourceResetToRefresh(actor);
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

        await _migrateResourceResetToRefresh(actor);
        await _updateActorItems(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items.values()) {
    await _migrateEnhancements(item);
    await _migrateItemResetToRefresh(item);
  }
}

async function _migrateResourceResetToRefresh(actor) {
  for (const resource of actor.resources.iterate()) {
    const fullKey = resource.fullKey;
    const refresh = _fillRefreshDeppendigOnReset(resource.reset);
    await actor.update({[`system.resources.${fullKey}.refresh`]: refresh});
  }
}

// ======================= ITEM =======================
async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _migrateEnhancements(item);
    await _migrateItemResetToRefresh(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _migrateEnhancements(item);
        await _migrateItemResetToRefresh(item);
      }
    }
  }
}

// TODO: Can we check macro that adds enhancemement as well?
async function _migrateEnhancements(item) {
  const enhancements = item.system.enhancements;
  if (!enhancements) return;

  const updateData = {};
  let hasChanges = false;
  for (const [key, enh] of Object.entries(enhancements)) {
    enh.repeatable = true;
    enh.defaultState = 0;
    enh.copyToSheetRoll = {};
    enh.modifications.changeDuration = false,
    enh.modifications.duration = {value: null, type: "", timeUnit: ""};

    updateData[`system.enhancements.${key}`] = enh;
    hasChanges = true;
  }
  
  if (hasChanges) await item.update(updateData);
}

  // - dodać metodę która zbiera efekty z wszystkich enhancementów i Target Modifierów? Przydało by sie do puszczania macro updatujących - ale czy gdzieś indziej?
  async function _migrateItemResetToRefresh(item) {
    // Item charges refresh
    const reset = item.system.costs?.charges?.reset;
    if (reset) {
      const refresh = _fillRefreshDeppendigOnReset(reset);
      await item.update({["system.costs.charges.refresh"]: refresh});
    }

    // Infusion refresh
    if (item.type === "infusion") {
      const tags = item.system.infusion.tags;
      if (tags.charges.active) {
        const refresh = _fillRefreshDeppendigOnReset(tags.charges.reset);
        await item.update({["system.infusion.tags.charges.refresh"]: refresh});
      }
      if (tags.uses.active) {
        const refresh = _fillRefreshDeppendigOnReset(tags.uses.reset);
        await item.update({["system.infusion.tags.uses.refresh"]: refresh});
      }
    }

    // Item Resource refresh
    if (item.system.isResource) {
      const resource = item.system.resource;
      const refresh = _fillRefreshDeppendigOnReset(resource.reset);
      await item.update({["system.resource.refresh"]: refresh});
    }
  }

  
  // ======================= COMMON =======================
  function _fillRefreshDeppendigOnReset(resetType) {
    const refresh = {};
    switch(resetType) {
      case "quick": 
        refresh["quick"] = "Quick Rest";
        refresh["short"] = "Short Rest";
        refresh["long"] = "Long Rest";
        refresh["full"] = "Full Rest";
        break;

      case "short": 
        refresh["short"] = "Short Rest";
        refresh["long"] = "Long Rest";
        refresh["full"] = "Full Rest";
        break;

      case "long": 
        refresh["long"] = "Long Rest";
        refresh["full"] = "Full Rest";
        break;

      case "full": 
        refresh["full"] = "Full Rest";
        break;

      case "halfOnShort": 
        refresh["halfOnShort"] = "Short Rest (Regain Half)";
        refresh["long"] = "Long Rest";
        refresh["full"] = "Full Rest";
        break;

      case "long4h": 
        refresh["long4h"] = "Long Rest (First 4h)";
        refresh["full"] = "Full Rest";
        break;

      case "day": 
        refresh["day"] = "Daily";
        break;

      case "charges": 
        refresh["charges"] = "Charges";
        break;

      case "combatStart": 
        refresh["combatStart"] = "Combat Start";
        break;

      case "combatEnd": 
        refresh["combatEnd"] = "Combat End";
        break;

      case "roundStart": 
        refresh["roundStart"] = "Turn Start";
        break;

      case "roundEnd": 
        refresh["roundEnd"] = "Turn End";
        break;
    }
    return refresh;
  }