export async function runMigration(migrateModules) {
  await _migrateItems(migrateModules);
  await _migrateActors(migrateModules);
}

// ACTOR
async function _migrateActors(migrateModules) {
  // TODO migracja przenosząca mastery z tradeSkills do trades 
  // + effekty trzeba zupdatować takie co zwiększały coś z tradeSkills bo teraz jest tradees
  //  - system.rollLevel.onYou.trades
  //  - system.rollLevel.againstYou.trades
  //  - skills[`system.trades.${key}.bonus`] = `${skillLabel} - Trade Skill Check Bonus`);
  
  // Iterate over actors
  for (const actor of game.actors) {
    await _addInfusionTable(actor);
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
    
    await _addInfusionTable(actor);
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
        await _addInfusionTable(actor);
        await _updateActorItems(actor);
      }
    }
  }
}

async function _addInfusionTable(actor) {
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
  // TODO:
  // przeszukaj "preItemCost" i zobacz czy macro sie nie jebie 
  // przeszukaj na wykorzystaie "use other item", pozamieniaj na custom resource


  // Iterate over world items
  for (const item of game.items) {
    await _migrateUseCost(item);
    await _updateEnhancements(item);
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
      }
    }
  }
}

async function _migrateUseCost(item) {
  const actionPoint = item.system.costs?.resources?.actionPoint;
  if (actionPoint != null) {
    // await item.update({
    //   ["system.costs.resources.ap"]: actionPoint,
    //   ["system.costs.resources.actionPoint"]: null,
    // });
  }
}

async function _updateEnhancements(item) {
  const enhs = item.system.enhancements;
  if (!enhs) return;

  const updateData = {};
  for (const [key, enh] of Object.entries(enhs)) {
    const upadtedEnh = {..._enhancementObject(), ...enh}
    if (upadtedEnh.charges.consume) {
      delete upadtedEnh.charges.consume;
      upadtedEnh.charges.subtract = 1;
    }
    updateData[key] = upadtedEnh;
  }
  console.log(updateData);
  // await item.update({["system.enhancements"]: updateData});
}

function _enhancementObject() {
  const resources = {
    actionPoint: null,
    health: null,
    mana: null,
    stamina: null, 
    grit: null,
    custom: {}
  };
  const charges = {
    subtract: null,
    fromOriginal: false
  };
  const modifications = {
    modifiesCoreFormula: false,
    coreFormulaModification: "",
    overrideTargetDefence: false,
    targetDefenceType: "area",
    hasAdditionalFormula: false,
    additionalFormula: "",
    overrideDamageType: false,
    damageType: "",
    addsNewFormula: false,
    formula: {
      formula: "",
      type: "",
      category: "damage",
      fail: false,
      failFormula: "",
      each5: false,
      each5Formula: "",
      dontMerge: false,
      overrideDefence: "",
      perTarget: false,
    },
    addsNewRollRequest: false,
    rollRequest: {
      category: "",
      saveKey: "",
      contestedKey: "",
      dcCalculation: "",
      dc: 0,
      addMasteryToDC: true,
      respectSizeRules: false,
    },
    addsAgainstStatus: false,
    againstStatus: {
      id: "",
      supressFromChatMessage: false,
      untilYourNextTurnStart: false,
      untilYourNextTurnEnd: false,
      untilTargetNextTurnStart: false,
      untilTargetNextTurnEnd: false,
      untilFirstTimeTriggered: false,
      forOneMinute: false,
      repeatedSave: false,
      repeatedSaveKey: "phy"
    },
    addsEffect: null,
    macro: "",
    macros: {
      preItemRoll: "",
      postItemRoll: ""
    },
    rollLevelChange: false,
    rollLevel: {
      type: "adv",
      value: 1
    },
    addsRange: false,
    bonusRange: {
      melee: null,
      normal: null,
      max: null
    }
  }

  return {
    name: "New Enhancement",
    number: 0,
    resources: resources,
    charges: charges,
    modifications: modifications,
    description: "",
    hide: false,
  }
}