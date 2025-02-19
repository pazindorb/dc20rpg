import { generateKey } from "../utils.mjs";

export function addEnhancement(item, enhancementName) {
  if (!enhancementName) {
    let errorMessage = `Enhancement name must be provided.`;
    ui.notifications.error(errorMessage);
    return;
  }
  const enhancements = item.system.enhancements;
  const resources = {
    actionPoint: null,
    health: null,
    mana: null,
    stamina: null, 
    grit: null,
    custom: _customCosts(item)
  };
  const charges = {
    consume: false,
    fromOriginal: false
  };
  const modifications = {
    modifiesCoreFormula: false,
    coreFormulaModification: "",
    hasAdditionalFormula: false,
    additionalFormula: "",
    overrideDamageType: false,
    damageType: "",
    addsNewFormula: false,
    formula: {
      formula: "",
      type: "",
      category: "damage",
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

  let key = "";
  do {
    key = generateKey();
  } while (enhancements[key]);

  const enhancement = {
    name: enhancementName,
    number: 0,
    resources: resources,
    charges: charges,
    modifications: modifications,
    description: "",
    hide: false,
  };

  item.update({[`system.enhancements.${key}`]: enhancement});
}

export function removeEnhancement(item, key) {
  item.update({[`system.enhancements.-=${key}`]: null });
}

function _customCosts(item) {
  return Object.fromEntries(Object.entries(item.system.costs.resources.custom)
  .map(([key, custom]) => { 
    custom.value = null; 
    return [key, custom];
  }));
}