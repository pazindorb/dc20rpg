export async function runMigration(migrateModules) {
  await _migrateActors(migrateModules);
  await _migrateItems(migrateModules);
}

// TODO
    // PDR MDR ZAMIENIC Z VALUE NA ACTIVE (Przelecieć po effektach itemków)
    // DEFENCE Zamienic physical na precision i z mysthical na area?

async function _migrateActors(migrateModules) {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActorItems(actor);
    await _updateSaveMasteries(actor);
    await _updateBasicActions(actor);
    await _updateActorClass(actor);
    await _updateConditionResistances(actor);
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
    await _updateSaveMasteries(actor);
    await _updateBasicActions(actor);
    await _updateActorClass(actor);
    await _updateConditionResistances(actor);
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
        await _updateSaveMasteries(actor);
        await _updateBasicActions(actor);
        await _updateActorClass(actor);
        await _updateConditionResistances(actor);
      }
    }
  }
}

async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _updateItemMacro(item);
    await _updateEnhancementMacro(item);
    await _updateConditional(item);
    await _updateConcentration(item);
    await _updateClasses(item);
    await _updateConditionResistances(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateItemMacro(item);
        await _updateEnhancementMacro(item);
        await _updateConditional(item);
        await _updateConcentration(item);
        await _updateClasses(item);
        await _updateConditionResistances(item);
      }
    }
  }
}

// ACTOR
async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _updateItemMacro(item);
    await _updateEnhancementMacro(item);
    await _updateConditional(item);
    await _updateConcentration(item);
    await _updateClasses(item);
    await _updateConditionResistances(item);
  }
}

async function _updateSaveMasteries(actor) {
  await actor.update({
    ["system.attributes.mig.saveMastery"]: true,
    ["system.attributes.agi.saveMastery"]: true,
    ["system.attributes.int.saveMastery"]: true,
    ["system.attributes.cha.saveMastery"]: true,
  })
}

async function _updateBasicActions(actor) {
  const basicActionIds = actor.items.filter(item => item.type === "basicAction").map(item => item.id);
  await actor.deleteEmbeddedDocuments("Item", basicActionIds);
  await actor.update({["flags.basicActionsAdded"]: false});
  actor.prepareBasicActions();
}

async function _updateActorClass(actor) {
  const classId = actor.system.details?.class?.id;
  if (!classId) return;

  const clazz = actor.items.get(classId);
  if (!clazz) return;

  const pack = game.packs.get("dc20rpg.classes");
  if (!pack) return;

  const items = await pack.getDocuments();
  const original = items.find(item => item.system.itemKey === clazz.system.itemKey);
  if (!original) return;

  const scaling = original.system.scaling;
  // Update scaling values and description
  clazz.update({
    ["system.scaling.attributePoints.values"]: scaling.attributePoints.values,
    ["system.scaling.tradePoints.values"]: scaling.tradePoints.values,
    ["system.scaling.maxHpBonus.values"]: scaling.maxHpBonus.values,
    ["system.description"]: original.system.description,
  });
}


// ITEMS
async function _updateItemMacro(item) {
  const macros = item.system.macros;
  if (!macros) return;
  
  const updateData = {system: {macros: {}}};
  let hasChanges = false;
  for (const [key, macro] of Object.entries(macros)) {
    if (macro === "" || key === "onDemandMacroTitle") {
      // Remove empty
      updateData.system.macros[`-=${key}`] = null;
      hasChanges = true;
    }
    else if (typeof macro === 'string') {
      // Create New
      const newKey = foundry.utils.randomID();
      updateData.system.macros[newKey] = {
        name: key,
        trigger: key,
        command: macro,
        disabled: false,
        title: "",
      }
      // Remove Old
      updateData.system.macros[`-=${key}`] = null;
      hasChanges = true;
    }
  }
  if (hasChanges) await item.update(updateData);
}

async function _updateEnhancementMacro(item) {
  const enhancements = item.system.enhancements;
  if (!enhancements) return;

  const updateData = {system: {enhancements: {}}};
  let hasChanges = false;
  for (const [key, enh] of Object.entries(enhancements)) {
    if (enh.modifications.macro !== undefined) {
      hasChanges = true;

      updateData.system.enhancements[key] = {
        modifications: {
          ["-=macro"]: null,
          macros: {
            postItemRoll: enh.modifications.macro,
            preItemRoll: ""
          }
        }
      }
    }
  }
  if (hasChanges) await item.update(updateData);
}

async function _updateConditional(item) {
  const conditionals = item.system.conditionals;
  if (!conditionals) return;

  if (item.system.conditional?.hasConditional) {
    delete item.system.conditional.hasConditional
    conditionals[foundry.utils.randomID()] = item.system.conditional;
    await item.update({
      ["system.conditionals"]: conditionals,
      ["system.conditional.hasConditional"]: false,
    });
  }
}

async function _updateClasses(item) {
  if (["class", "ancestry", "subclass", "background"].includes(item.type)) {
    const updateData = {
      system: {advancements: {}}
    }

    for (const [advKey, adv] of Object.entries(item.system.advancements)) {
      let helpText = "";
      let itemLimit = null
      if (item.type === "ancestry") helpText = "Add more Ancestry Traits";
      if (adv.talent) {
        helpText = "Add new Talent";
        itemLimit = 1;
      }

      updateData.system.advancements[advKey] = {
        progressPath: adv.talent,
        allowToAddItems: adv.allowToAddItems || adv.talent,
        addItemsOptions: {
          talentFilter: adv.talent,
          itemType: adv.compendium,
          helpText: helpText,
          preFilters: adv.preFilters || "",
          itemLimit: itemLimit,
        }
      }
      await item.update(updateData);
    }
  }
}

async function _updateConcentration(item) {
  if (item.system?.duration?.type === "concentration") {
    await item.update({["system.duration.type"]: "sustain"});
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
          changes[i].key = `system.statusResistances.${key}.resistance`;
          hasChanges = true;
        }
        if (changes[i].value < 0) {
          changes[i].key = `system.statusResistances.${key}.vulnerability`;
          changes[i].value = Math.abs(changes[i].value);
          hasChanges = true;
        }
      }
    }
    if (hasChanges) await effect.update({changes: effect.changes});
  }
}