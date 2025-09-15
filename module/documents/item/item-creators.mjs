import { generateKey } from "../../helpers/utils.mjs";

export class Enhancement {

  static newObject(item) { 
    const customCosts = !item ? {} : Object.fromEntries(
      Object.entries(item.system.costs.resources.custom)
        .map(([key, custom]) => { 
          custom.value = null; 
          return [key, custom];
        })
      );

    const resources = {
      actionPoint: null,
      health: null,
      mana: null,
      stamina: null, 
      grit: null,
      custom: customCosts
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
      formula: Formula.newObject(),
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

  static async create(enhancementData={}, item, enhancementKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const enhancement = foundry.utils.mergeObject(Enhancement.newObject(item), enhancementData);
    const key = enhancementKey ? enhancementKey : generateKey();
    await item.update({[`system.enhancements.${key}`]: enhancement});
    return key;
  }
} 

export class Formula {

  static newObject() {
    return {
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
    }
  }

  static async create(formulaData={}, item, formulaKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const formula = foundry.utils.mergeObject(Formula.newObject(), formulaData);
    const key = formulaKey ? formulaKey : generateKey();
    await item.update({[`system.formulas.${key}`]: formula});
    return key;
  }
}

export class Conditional {

  static newObject() {
    return {
      name: "New Conditional",
      condition: "", 
      useFor: "",
      linkWithToggle: false,
      bonus: "",
      flags: {
        ignorePdr: false,
        ignoreEdr: false,
        ignoreMdr: false,
        ignoreResistance: {},
        ignoreImmune: {},
        reduceAd: "",
        reducePd: ""
      },
      effect: null,
      addsNewRollRequest: false,
      rollRequest: {
        category: "",
        saveKey: "phy",
        contestedKey: "",
        dcCalculation: "",
        dc: 0,
        addMasteryToDC: true,
        respectSizeRules: false,
      },
      addsNewFormula: false,
      formula: Formula.newObject(),
    };
  }

  static async create(conditionalData={}, item, conditionalKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const conditional = foundry.utils.mergeObject(Conditional.newObject(), conditionalData);
    const key = conditionalKey ? conditionalKey : generateKey();
    await item.update({[`system.conditionals.${key}`]: conditional});
    return key;
  }
}

export class Macro {
  static newObject() {
    return {
      command: "",
      trigger: "",
      disabled: false,
      name: "New Macro",
      title: "",
      global: false,
    };
  }

  static async create(macroData={}, item, macroKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const macro = foundry.utils.mergeObject(Conditional.newObject(), macroData);
    const key = macroKey ? macroKey : generateKey();
    await item.update({[`system.macros.${key}`]: macro});
    return key;
  }
}

export class RollRequest {

  static newObject() {
    return {
      category: "save",
      saveKey: "",
      contestedKey: "",
      dcCalculation: "spell",
      dc: 0,
      addMasteryToDC: true,
      respectSizeRules: false,
    }
  }

  static async create(rollRequestData={}, item, rollRequestKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const rollRequest = foundry.utils.mergeObject(RollRequest.newObject(), rollRequestData);
    const key = rollRequestKey ? rollRequestKey : generateKey();
    await item.update({[`system.rollRequests.${key}`]: rollRequest});
    return key;
  }
}

export class AgainstStatus {

  static newObject() {
    return {
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
    };
  }

  static async create(againstStatusData={}, item, againstStatusKey) {
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const againstStatus = foundry.utils.mergeObject(AgainstStatus.newObject(), againstStatusData);
    const key = againstStatusKey ? againstStatusKey : generateKey();
    await item.update({[`system.againstStatuses.${key}`]: againstStatus});
    return key;
  }
}