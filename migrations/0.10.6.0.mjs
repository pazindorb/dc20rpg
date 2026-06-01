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
    await _updateEffects(actor);
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
    await _updateEffects(actor);
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
        await _updateEffects(actor);
        await actor.prepareBasicActions();
      }
    }
  }
}

async function _updateActorItems(actor) {
  for (const item of actor.items.values()) {
    await _migrateEnhancements(item);
    await _migrateItemResetToRefresh(item);
    await _migrateConditionalToTargetModifier(item);
    await _migrateFromAttackFormulaAndCheck(item);
    await _enableCloseQuartersOnRangedAttacks(item);
    await _migratePropertiesToNewConfigurableSystem(item);
    await _updateEffects(item);
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
    await _migrateConditionalToTargetModifier(item);
    await _migrateFromAttackFormulaAndCheck(item);
    await _enableCloseQuartersOnRangedAttacks(item);
    await _migratePropertiesToNewConfigurableSystem(item);
    await _updateEffects(item);
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
        await _migrateConditionalToTargetModifier(item);
        await _migrateFromAttackFormulaAndCheck(item);
        await _enableCloseQuartersOnRangedAttacks(item);
        await _migratePropertiesToNewConfigurableSystem(item);
        await _updateEffects(item);
      }
    }
  }
}

async function _migrateEnhancements(item) {
  const enhancements = item.system.enhancements;
  if (!enhancements) return;

  const updateData = {};
  let hasChanges = false;
  for (const [key, enh] of Object.entries(enhancements)) {
    enh.repeatable = true;
    enh.defaultState = 0;
    enh.copyToSheetRoll = {};
    enh.modifications.changeDuration = false;
    enh.modifications.duration = {value: null, type: "", timeUnit: ""};
    enh.modifications.actionChange = false;
    enh.modifications.actionType = "";
    enh.altCostMax = 0;
    enh.altCost = 0;

    updateData[`system.enhancements.${key}`] = enh;
    hasChanges = true;
  }
  
  if (hasChanges) await item.update(updateData);
}

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

async function _migrateFromAttackFormulaAndCheck(item) {
  const updateData = {};
  let hasUpdates = false;

  const af = item.system.attackFormula;
  if (af && af.rangeType) {
    const checkType = af.checkType === "attack" ? "martial" : checkType;
    updateData["system.attack.rangeType"] = af.rangeType;
    updateData["system.attack.checkType"] = checkType;
    updateData["system.attack.targetDefence"] = af.targetDefence;
    updateData["system.attack.closeQuarters"] = af.rangeType === "ranged";
    updateData["system.attackFormula.rangeType"] = ""; // Just to make sure we wont call this migration after we already did
    hasUpdates = true;
  }

  if (item.system.actionType === "check") {
    const check = item.system.check;
    updateData["system.rollConfig.canCrit"] = check.canCrit;
    updateData["system.rollConfig.respectSizeRules"] = check.respectSizeRules;
    hasUpdates = true;
  }

  if (hasUpdates) await item.update(updateData);
}

async function _enableCloseQuartersOnRangedAttacks(item) {
  const attack = item.system.attack;
  if (!attack) return;

  if (attack.rangeType === "ranged" && !attack.closeQuarters) {
    await item.update({["system.attack.closeQuarters"]: true});
  }
}
  
async function _migrateConditionalToTargetModifier(item) {
  if (!item.system.conditionals) return;

  // Update target modifier
  let hasUpdates = false;
  const updateData = {};
  for (const [key, conditional] of Object.entries(item.system.conditionals)) {
    const modifier = foundry.utils.deepClone(conditional);

    // Fix condition to match new macro version
    let condition = modifier.condition;
    // This methods were removed nad will break item roll - better to remove them
    if (condition.includes("hasAnyCondition") || condition.includes("hasEffectWithName") || condition.includes("hasEffectWithKey")) {
      condition = "";
    }
    modifier.condition = condition ? `return (${condition})` : "";

    updateData[`system.targetModifiers.${key}`] = modifier;
    updateData[`system.conditionals.-=${key}`] = null;
    hasUpdates = true;
  }
  if (hasUpdates) item.update(updateData);

  
  // Update infusion
  if (item.type === "infusion") {
    if (item.system.infusion.copy.conditionals) {
      await item.update({
        ["system.infusion.copy.conditionals"]: false,
        ["system.infusion.copy.targetModifiers"]: true
      });
    }
  }
}

async function _migratePropertiesToNewConfigurableSystem(item) {
  if (!item.system.properties) return;

  const newProps = CONFIG.DC20RPG.PROPERTIES;
  const oldProps = item.system.properties;
  const properties = {};
  for (const [key, prop] of Object.entries(newProps)) {
    const oldProp = oldProps[key] || {};
    const newProp = {...prop, ...oldProp};

    delete newProp.for;
    newProp.cost = prop.cost;
    properties[key] = newProp;
  }
  // Remove old properties
  for (const propKey of Object.keys(oldProps)) {
    if (!(propKey in newProps)) properties[`-=${propKey}`] = null;
  }

  await item.update({["system.properties"]: properties})
}

// ======================= EFFECT =======================
async function _migrateEffectStatusesAndDrm(effect) {
  let hasUpdates = false;

  // Update DRM
  const changes = [];
  for (const change of effect.system.changes) {
    const isDrm = change.key.includes("system.dynamicRollModifier") && change.key.includes(".martial.melee")
    if (!isDrm) continue;

    if (change.key.includes(".martial.") || change.key.includes(".spell.")) {
      const [system, drm, target, type, range] = change.key.split(".");
      changes.push(_attackDrmFrom(type, range, target, change.value));
      hasUpdates = true;
    }
    else {
      changes.push(change);
    }
  }
  if (hasUpdates) await effect.update({changes: changes});


  // Update Disable When
  if (effect.system?.disableWhen?.path === "statusIds") {
    await effect.update({["system.disableWhen.path"]: "statuses"})
  }
}
function _attackDrmFrom(type, range, target, value) {
  return {
    key: `system.dynamicRollModifier.${target}.attack`,
    type: "add",
    value: `${value}, "attackType": "${type}", "rangeType": "${range}"`
  }
}

// ======================= COMMON =======================
async function _updateEffects(object) {
  for (const effect of object.effects.values()) {
    await _migrateEffectStatusesAndDrm(effect);
  }

  if (object.documentName === "Item") {
    // Collect effect from conditonals and enhancements
    for (const effect of object.collectRottedEffects()) {
      await _migrateEffectStatusesAndDrm(effect);
      await effect.update({["system.addToChat"]: true});
    }
  }
}

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
