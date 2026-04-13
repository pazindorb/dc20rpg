import { generateKey } from "../../helpers/utils.mjs";

export class Enhancement {
  name = "New Enhancement";
  number = 0;
  defaultState = 0;
  repeatable = true;
  preventModification = false;
  description = "";
  hide = false;
  copyToSheetRoll = {};
  resources = {
    ap: null,
    health: null,
    mana: null,
    stamina: null, 
    grit: null,
    restPoints: null,
  };
  altCostMax = 0;
  altCost = 0;
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
    specificFormulaKey: "",
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
    changeManaSpendLimit: 0,
    changeStaminaSpendLimit: 0,
    changeDuration: false,
    duration: {
      value: null,
      type: "",
      timeUnit: ""
    },

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
  label = "";
  category = "damage";
  fail = false;
  failFormula = "";
  dontModifyFailFormula = false;
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

export class TargetModifier {
  name = "New Target Modifier";
  condition = ""; 
  useFor = "";
  linkWithToggle = false;
  bonus = "";
  flags = {
    ignorePdr: false,
    ignoreEdr: false,
    ignoreMdr: false,
    ignoreResistance: {},
    ignoreImmune: {}
  };
  effect = null;
  addsNewRollRequest = false;
  rollRequest = new RollRequest();
  addsNewFormula = false;
  formula = new Formula();
  addsAgainstStatus = false;
  againstStatus = new AgainstStatus();
  
  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const targetModifier = foundry.utils.mergeObject(new TargetModifier(), data);
    const key = options.key ? options.key : generateKey();
    await item.update({[`system.targetModifiers.${key}`]: targetModifier});
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
  stacks = 1;
  supressFromChatMessage = false;
  untilYourNextTurnStart = false;
  untilYourNextTurnEnd = false;
  untilTargetNextTurnStart = false;
  untilTargetNextTurnEnd = false;
  untilFirstTimeTriggered = false;
  forOneMinute = false;
  forXRounds = null;
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