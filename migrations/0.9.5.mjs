let systemItems = new Map(); 

export async function runMigration(migrateModules) {
  // Reset Skill List
  await game.settings.set("dc20rpg", "skillStore", defaultSkillList());
  systemItems = await _getSystemItems();
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

async function _getSystemItems() {
  let items = new Map();
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "system" || compendium.metadata.packageName === "dc20-core-rulebook")
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        const itemKey = item.system?.itemKey;
        if (itemKey) items.set(itemKey, item);
      }
    }
  }
  return items;
}

async function _migrateActors(migrateModules) {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActorItems(actor);
    await _updateSaveMasteries(actor);
    await _updateBasicActions(actor);
    await _updateActorClass(actor);
    await _updateConditionResistances(actor);
    await _updateDamageReduction(actor);
    await actor.refreshSkills();
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
    await _updateDamageReduction(actor);
    await actor.refreshSkills();
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
        await _updateDamageReduction(actor);
        await actor.refreshSkills();
      }
    }
  }
}

async function _migrateItems(migrateModules) {
  // Iterate over world items
  for (const item of game.items) {
    await _updateItemFromSystem(item);
    await _updateItemMacro(item);
    await _updateEnhancementMacro(item);
    await _updateConditional(item);
    await _updateConcentration(item);
    await _updateClasses(item);
    await _updateConditionResistances(item);
    await _updateDamageReduction(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if ((compendium.metadata.packageType === "world" || migrateModules.has(compendium.metadata.packageName))
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateItemFromSystem(item);
        await _updateItemMacro(item);
        await _updateEnhancementMacro(item);
        await _updateConditional(item);
        await _updateConcentration(item);
        await _updateClasses(item);
        await _updateConditionResistances(item);
        await _updateDamageReduction(item);
      }
    }
  }
}

// ACTOR
async function _updateActorItems(actor) {
  for (const item of actor.items) {
    await _updateItemFromSystem(item)
    await _updateItemMacro(item);
    await _updateEnhancementMacro(item);
    await _updateConditional(item);
    await _updateConcentration(item);
    await _updateClasses(item);
    await _updateConditionResistances(item);
    await _updateDamageReduction(item);
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
  const basicActionIds = actor.items.filter(item => item.type === "basicAction" || item.system.itemKey === "unarmedStrike").map(item => item.id);
  await actor.deleteEmbeddedDocuments("Item", basicActionIds);
  await actor.update({["flags.basicActionsAdded"]: false});
  actor.prepareBasicActions();
}

async function _updateActorClass(actor) {
  const classId = actor.system.details?.class?.id;
  if (!classId) return;

  const clazz = actor.items.get(classId);
  if (!clazz) return;
  let classKey = clazz.system.itemKey;
  if (!classKey) classKey = clazz.name.toLowerCase();

  const pack = game.packs.get("dc20rpg.classes");
  if (!pack) return;

  const items = await pack.getDocuments();
  const original = items.find(item => item.system.itemKey === classKey);
  if (!original) return;

  const scaling = original.system.scaling;
  // Update scaling values and description
  clazz.update({
    ["system.scaling.attributePoints.values"]: scaling.attributePoints.values,
    ["system.scaling.tradePoints.values"]: scaling.tradePoints.values,
    ["system.scaling.maxHpBonus.values"]: scaling.maxHpBonus.values,
    ["system.description"]: original.system.description,
    ["system.itemKey"]: original.system.itemKey
  });
}

async function _updateItemFromSystem(item) {
  const itemKey = item.system.itemKey;
  if (itemKey) await _fromSystem(item, itemKey);
  else await _withDefaults(item);
}

async function _fromSystem(item, itemKey) {
  const systemItem = systemItems.get(itemKey);
  if (!systemItem) {
    await _withDefaults(item);
    return;
  }

  const updateData = {
    ["system.description"]: systemItem.system.description,
  }
  if (systemItem.system?.attackFormula?.targetDefence) {
    updateData["system.attackFormula.targetDefence"] = systemItem.system.attackFormula.targetDefence;
    updateData["system.formulas"] = systemItem.system.formulas;
    updateData["system.enhancements"] = systemItem.system.enhancements;
  }
  await item.update(updateData);

  for (const effect of item.effects) {
    const systemEffect = systemItem.effects.getName(effect.name);
    if (systemEffect) {
      if (shouldUpdate(effect)) await effect.update({["changes"]: systemEffect.changes});
    }
    else {
      await _updateEffectWithDefault(effect); 
    }
  }
}

async function _withDefaults(item) {
  if (["mystical", "physical"].includes(item.system?.attackFormula?.targetDefence)) {
    await item.update({["system.attackFormula.targetDefence"]: "precision"});
  }

  for (const effect of item.effects) {
    await _updateEffectWithDefault(effect);
  }
}

function shouldUpdate(effect) {
  let shouldUpdate = false;
  const changes = effect.changes;
  for (let i = 0; i < changes.length; i++) {
    if (changes[i].key.includes("system.defences.physical.bonuses.") 
      || changes[i].key.includes("system.defences.mystical.bonuses.")
    ) {
      shouldUpdate = true;
    }
  }
  return shouldUpdate;
}

async function _updateEffectWithDefault(effect) {
  const changes = effect.changes;
  let hasChanges = false;

  for (let i = 0; i < changes.length; i++) {
    if (changes[i].key.includes("system.defences.physical.bonuses.")) {
      changes[i].key = changes[i].key.replace("physical", "precision");
      changes[i].value = true;
      hasChanges = true;
    }
    if (changes[i].key.includes("system.defences.mystical.bonuses.")) {
      changes[i].key = changes[i].key.replace("mystical", "precision");
      changes[i].value = true;
      hasChanges = true;
    }
  }
  if (hasChanges) await effect.update({changes: effect.changes});
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

function defaultSkillList() {
  return {
    skills: {
      awa: skill("prime", "dc20rpg.skills.awa"),
      acr: skill("agi", "dc20rpg.skills.acr"),
      ani: skill("cha", "dc20rpg.skills.ani"),
      ath: skill("mig", "dc20rpg.skills.ath"),
      inf: skill("cha", "dc20rpg.skills.inf"),
      inm: skill("mig", "dc20rpg.skills.inm"),
      ins: skill("cha", "dc20rpg.skills.ins"),
      inv: skill("int", "dc20rpg.skills.inv"),
      med: skill("int", "dc20rpg.skills.med"),
      ste: skill("agi", "dc20rpg.skills.ste"),
      sur: skill("int", "dc20rpg.skills.sur"),
      tri: skill("agi", "dc20rpg.skills.tri")
    },
    trades: {
      arc: skill("int", "dc20rpg.trades.arc"),
      his: skill("int", "dc20rpg.trades.his"),
      nat: skill("int", "dc20rpg.trades.nat"),
      occ: skill("int", "dc20rpg.trades.occ"),
      rel: skill("int", "dc20rpg.trades.rel"),
      eng: skill("int", "dc20rpg.trades.eng"),
      alc: skill("int", "dc20rpg.trades.alc"),
      bla: skill("mig", "dc20rpg.trades.bla"),
      bre: skill("int", "dc20rpg.trades.bre"),
      cap: skill("agi", "dc20rpg.trades.cap"),
      car: skill("int", "dc20rpg.trades.car"),
      coo: skill("int", "dc20rpg.trades.coo"),
      cry: skill("int", "dc20rpg.trades.cry"),
      dis: skill("cha", "dc20rpg.trades.dis"),
      gam: skill("cha", "dc20rpg.trades.gam"),
      gla: skill("mig", "dc20rpg.trades.gla"),
      her: skill("int", "dc20rpg.trades.her"),
      ill: skill("agi", "dc20rpg.trades.ill"),
      jew: skill("agi", "dc20rpg.trades.jew"),
      lea: skill("agi", "dc20rpg.trades.lea"),
      loc: skill("agi", "dc20rpg.trades.loc"),
      mas: skill("mig", "dc20rpg.trades.mas"),
      mus: skill("cha", "dc20rpg.trades.mus"),
      scu: skill("agi", "dc20rpg.trades.scu"),
      the: skill("cha", "dc20rpg.trades.the"),
      tin: skill("int", "dc20rpg.trades.tin"),
      wea: skill("agi", "dc20rpg.trades.wea"),
      veh: skill("agi", "dc20rpg.trades.veh")
    },
    languages: {
      com: {
        mastery: 2 ,
        category: "mortal",
        label: "dc20rpg.languages.com"
      },
      hum: lang("mortal", "dc20rpg.languages.hum"),
      dwa: lang("mortal", "dc20rpg.languages.dwa"),
      elv: lang("mortal", "dc20rpg.languages.elv"),
      gno: lang("mortal", "dc20rpg.languages.gno"),
      hal: lang("mortal", "dc20rpg.languages.hal"),
      sig: lang("mortal", "dc20rpg.languages.sig"),
      gia: lang("exotic", "dc20rpg.languages.gia"),
      dra: lang("exotic", "dc20rpg.languages.dra"),
      orc: lang("exotic", "dc20rpg.languages.orc"),
      fey: lang("exotic", "dc20rpg.languages.fey"),
      ele: lang("exotic", "dc20rpg.languages.ele"),
      cel: lang("divine", "dc20rpg.languages.cel"),
      fie: lang("divine", "dc20rpg.languages.fie"),
      dee: lang("outer", "dc20rpg.languages.dee"),
    }
  }
}

function skill(baseAttribute, label) {
  return {
    modifier: 0,
    bonus: 0,
    mastery: 0,
    baseAttribute: baseAttribute,
    custom: false,
    label: label,
  };
}

function lang(category, label) {
  return {
    mastery: 0,
    category: category,
    label: label
  }
}