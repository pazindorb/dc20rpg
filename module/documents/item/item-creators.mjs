import { generateKey } from "../../helpers/utils.mjs";

export class Enhancement {
  name = "New Enhancement";
  number = 0;
  description = "";
  hide = false;
  resources = {
    ap: null,
    health: null,
    mana: null,
    stamina: null, 
    grit: null,
    restPoints: null,
  };
  charges = {
    subtract: null,
    fromOriginal: false
  };
  modifications = {
    modifiesCoreFormula: false,
    coreFormulaModification: "",
    overrideTargetDefence: false,
    targetDefenceType: "area",
    hasAdditionalFormula: false,
    additionalFormula: "",
    overrideDamageType: false,
    damageType: "",
    addsNewFormula: false,
    formula: new Formula(),
    addsNewRollRequest: false,
    rollRequest: new RollRequest(),
    addsAgainstStatus: false,
    againstStatus: new AgainstStatus(),
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
    },
    changeManaSpendLimit: 0
  };


  constructor(item) {
    const customCosts = !item ? {} : Object.fromEntries(
      Object.entries(item.system.costs.resources.custom)
        .map(([key, custom]) => { 
          custom.value = null; 
          return [key, custom];
        })
      );
    this.resources.custom = customCosts;
  }

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const enhancement = foundry.utils.mergeObject(new Enhancement(item), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.enhancements.${key}`]: enhancement});
    return key;
  }
} 

export class Formula {
  formula = "";
  type = "";
  category = "damage";
  fail = false;
  failFormula = "";
  each5 = false;
  each5Formula = "";
  dontMerge = false;
  overrideDefence = "";
  perTarget = false;

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const formula = foundry.utils.mergeObject(new Formula(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.formulas.${key}`]: formula});
    return key;
  }
}

export class Conditional {
  name = "New Conditional";
  condition = ""; 
  useFor = "";
  linkWithToggle = false;
  bonus = "";
  flags = {
    ignorePdr: false,
    ignoreEdr: false,
    ignoreMdr: false,
    ignoreResistance: {},
    ignoreImmune: {},
    reduceAd: "",
    reducePd: ""
  };
  effect = null;
  addsNewRollRequest = false;
  rollRequest = new RollRequest();
  addsNewFormula = false;
  formula = new Formula();

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const conditional = foundry.utils.mergeObject(new Conditional(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.conditionals.${key}`]: conditional});
    return key;
  }
}

export class ItemMacro {
  command = "";
  trigger = "";
  disabled = false;
  name = "New Macro";
  title = "";
  global = false;

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const macro = foundry.utils.mergeObject(new ItemMacro(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.macros.${key}`]: macro});
    return key;
  }
}

export class RollRequest {
  category = "save";
  saveKey = "";
  contestedKey = "";
  dcCalculation = "spell";
  dc = 0;
  addMasteryToDC = true;
  respectSizeRules = false;

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const rollRequest = foundry.utils.mergeObject(new RollRequest(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.rollRequests.${key}`]: rollRequest});
    return key;
  }
}

export class AgainstStatus {
  id = "";
  supressFromChatMessage = false;
  untilYourNextTurnStart = false;
  untilYourNextTurnEnd = false;
  untilTargetNextTurnStart = false;
  untilTargetNextTurnEnd = false;
  untilFirstTimeTriggered = false;
  forOneMinute = false;
  repeatedSave = false;
  repeatedSaveKey = "phy";

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const againstStatus = foundry.utils.mergeObject(new AgainstStatus(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.againstStatuses.${key}`]: againstStatus});
    return key;
  }
}