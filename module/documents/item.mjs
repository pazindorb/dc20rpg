import { addItemToActorInterceptor, modifiyItemOnActorInterceptor, removeItemFromActorInterceptor } from "../helpers/actors/itemsOnActor.mjs";
import { itemMeetsUseConditions } from "../helpers/conditionals.mjs";
import { toggleCheck } from "../helpers/items/itemConfig.mjs";
import { createTemporaryMacro, runTemporaryItemMacro } from "../helpers/macros.mjs";
import { generateKey, translateLabels } from "../helpers/utils.mjs";
import { makeCalculations } from "./item/item-calculations.mjs";
import { initFlags } from "./item/item-flags.mjs";
import { prepareRollData } from "./item/item-rollData.mjs";

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class DC20RpgItem extends Item {
  static enhLoopCounter = 0;

  get itemKey() {
    return this.system.itemKey;
  }

  get checkKey() {
    const actionType = this.system.actionType;
    if (actionType === "attack") return this.system.attackFormula.checkType.substr(0, 3);
    if (actionType === "check") return this.system.check.checkKey;
    return null;
  }

  get allEffects() {
    const effects = [];
    for (const effect of this.effects) {
      effects.push(effect);
    }
    return effects;
  }

  get allEnhancements() {
    let enhancements = new Map();
    if (!this.system.enhancements) return enhancements;

    // Collect enhancements from that specific item
    for (const [key, enh] of Object.entries(this.system.enhancements)) {
      enh.sourceItemId = this.id;
      enh.sourceItemName = this.name;
      enh.sourceItemImg = this.img;
      enhancements.set(key, enh);
    }

    const parent = this.actor;
    if (!parent) return enhancements;

    // We need to deal with case where items call each other in a infinite loop
    // We expect 10 to be deep enough to collect all the coppied enhancements
    let firstCall = false;
    if (DC20RpgItem.enhLoopCounter === 0) firstCall = true;
    if (DC20RpgItem.enhLoopCounter > 10) return enhancements;
    DC20RpgItem.enhLoopCounter++;

    // Collect copied enhancements
    for (const itemWithCopyEnh of parent.itemsWithEnhancementsToCopy) {
      if (itemWithCopyEnh.itemId === this.id) continue;
      if (itemMeetsUseConditions(itemWithCopyEnh.copyFor, this)) {
        const item = parent.items.get(itemWithCopyEnh.itemId);
        if (this.id === item.system.usesWeapon?.weaponId) continue; //Infinite loop when it happends
        if (item && item.system.copyEnhancements?.copy && toggleCheck(item, item.system.copyEnhancements?.linkWithToggle)) {
          enhancements = new Map([...enhancements, ...item.allEnhancements]);
        }
      }
    }

    // Collet from used weapon
    const usesWeapon = this.system.usesWeapon;
    if (usesWeapon?.weaponAttack) {
      const weapon = parent.items.get(usesWeapon.weaponId);
      if (weapon) {
        enhancements = new Map([...enhancements, ...weapon.allEnhancements]);
      }
    }

    if (firstCall) DC20RpgItem.enhLoopCounter = 0;
    return enhancements;
  }

  get activeEnhancements() {
    const active = new Map();
    for (const [key, enh] of this.allEnhancements.entries()) {
      if (enh.number > 0) active.set(key, enh);
    }
    return active
  }

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  prepareBaseData() {
    super.prepareBaseData();
    initFlags(this);
  }
 
  prepareDerivedData() {
    makeCalculations(this);
    translateLabels(this);
    this.prepared = true; // Mark item as prepared
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
  getRollData() {
    const data = {...super.getRollData()}
    return prepareRollData(this, data);
  }

  async swapMultiFaceted() {
    const multiFaceted = this.system.properties?.multiFaceted;
    if (!multiFaceted || !multiFaceted.active) return;

    const damageFormula = this.system.formulas.weaponDamage;
    if (!damageFormula) {
      ui.notifications.error("Original damage formula cannot be found. You have to recreate this item to fix that problem");
      return;
    }

    if (multiFaceted.selected === "first") multiFaceted.selected = "second";
    else multiFaceted.selected = "first";
    const selected = multiFaceted.selected;

    multiFaceted.labelKey = multiFaceted.weaponStyle[selected];
    const weaponStyle = multiFaceted.weaponStyle[selected];
    damageFormula.type = multiFaceted.damageType[selected];

    const updateData = {
      system: {
        weaponStyle: weaponStyle,
        properties: {
          multiFaceted: multiFaceted
        },
        formulas: {
          weaponDamage: damageFormula
        }
      }
    }
    await this.update(updateData);
  }

  async update(data={}, operation={}) {
    try {
      await super.update(data, operation);
    } catch (error) {
      if (error.message.includes("does not exist!")) {
        ui.notifications.clear()
      }
      else throw error;
    }
  }

  getEffectWithName(effectName) {
    return this.effects.getName(effectName);
  }

  async _onCreate(data, options, userId) {
    const onCreateReturn = super._onCreate(data, options, userId);
    if (userId === game.user.id && this.actor) {
      await runTemporaryItemMacro(this, "onCreate", this.actor);
      addItemToActorInterceptor(this, this.actor);
    }
    return onCreateReturn;
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id && this.actor) {
      modifiyItemOnActorInterceptor(this, changed, this.actor);
    }
  }

  async _preDelete(options, user) {
    if (this.actor) {
      await runTemporaryItemMacro(this, "preDelete", this.actor);
      removeItemFromActorInterceptor(this, this.actor);
    }
    return await super._preDelete(options, user);
  }

  toDragData() {
    const dragData = super.toDragData();
    if (this.actor) {
      dragData.actorType = this.actor.type;
    }
    return dragData;
  }

  //=========================
  //        FORMULAS        =
  //=========================
  /**
   * Creates new non-core Formula object on this item.
   * Both formula and formulaKey parameters are optional and if not provided will be generated automatically.
   */
  createFormula(formula={}, formulaKey) {
    const newFormula = foundry.utils.mergeObject(this.getFormulaObjectExample(), formula);
    const key = formulaKey ? formulaKey : generateKey();
    this.update({[`system.formulas.${key}`]: newFormula});
  }

  removeFormula(key) {
    this.update({ [`system.formulas.-=${key}`]: null });
  }

  /**
   * Returns example Formula object that can be modified and used for creating new macros.
   */
  getFormulaObjectExample() {
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

  //==========================
  //       ROLL REQUEST      =
  //==========================
  /**
   * Creates new Roll Request object on this item.
   * Both rollRequest and rollRequestKey parameters are optional and if not provided will be generated automatically.
   */
  createRollRequest(rollRequest={}, rollRequestKey) {
    const request = foundry.utils.mergeObject(this.getRollRequestObjectExample(), rollRequest);
    const key = rollRequestKey ? rollRequestKey : generateKey();
    this.update({[`system.rollRequests.${key}`]: request});
  }

  removeRollRequest(key) {
    this.update({ [`system.rollRequests.-=${key}`]: null });
  }

  /**
   * Returns example Roll Request object that can be modified and used for creating new macros.
   */
  getRollRequestObjectExample() {
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

  //============================
  //       AGAINST STATUS      =
  //============================
  /**
   * Creates new Against Status object on this item.
   * Both againstStatus and againstStatusKey parameters are optional and if not provided will be generated automatically.
   */
  createAgainstStatus(againstStatus={}, againstStatusKey) {
    const against = foundry.utils.mergeObject(this.getAgainstStatusObjectExample(), againstStatus);
    const key = againstStatusKey ? againstStatusKey : generateKey();
    this.update({[`system.againstStatuses.${key}`]: against});
  }

  removeAgainstStatus(key) {
    this.update({ [`system.againstStatuses.-=${key}`]: null });
  }

  /**
   * Returns example Against Status object that can be modified and used for creating new macros.
   */
  getAgainstStatusObjectExample() {
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

  //==========================
  //       ENHANCEMENTS      =
  //==========================
  /**
   * Creates new Enhancement object on this item.
   * Both enhancement and enhancementKey parameters are optional and if not provided will be generated automatically.
   */
  createNewEnhancement(enhancement={}, enhancementKey) {
    const enh = foundry.utils.mergeObject(this.getEnhancementObjectExample(), enhancement);
    const key = enhancementKey ? enhancementKey : generateKey();
    this.update({[`system.enhancements.${key}`]: enh});
  }

  removeEnhancement(key) {
    this.update({[`system.enhancements.-=${key}`]: null });
  }

  /**
   * Returns example enhancement object that can be modified and used for creating new enhancements.
   */
  getEnhancementObjectExample() {
    const customCosts = Object.fromEntries(
      Object.entries(this.system.costs.resources.custom)
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
      consume: false,
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
      formula: this.getFormulaObjectExample(),
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

  //============================
  //        CONDITIONALS       =
  //============================
  /**
   * Creates new conditional object on this item.
   * Both conditional and conditionalKey parameters are optional and if not provided will be generated automatically.
   */
  createNewConditional(conditional={}, conditionalKey) {
    const cond = foundry.utils.mergeObject(this.getConditionalObjectExample(), conditional);
    const key = conditionalKey ? conditionalKey : generateKey();
    this.update({[`system.conditionals.${key}`]: cond});
  }

  removeConditional(key) {
    this.update({[`system.conditionals.-=${key}`]: null});
  }

  /**
   * Returns example conditional object that can be modified and used for creating new conditionals.
   */
  getConditionalObjectExample() {
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
      formula: this.getFormulaObjectExample(),
    };
  }

  //==========================
  //        ITEM MACRO       =
  //==========================
  /**
   * Creates new Item Macro object on this item.
   * Both macroObject and macroKey parameters are optional and if not provided will be generated automatically.
   */
  createNewItemMacro(macroObject={}, macroKey) {
    const macro = foundry.utils.mergeObject(this.getMacroObjectExample(), macroObject);
    const key = macroKey ? macroKey : generateKey();
    this.update({[`system.macros.${key}`]: macro});
  }

  editItemMacro(key) {
    const command = this.system.macros[key]?.command;
    if (!command === undefined) return;
    const macro = createTemporaryMacro(command, this, {item: this, key: key});
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
  }

  removeItemMacro(key) {
    this.update({[`system.macros.-=${key}`]: null});
  }

  /**
   * Returns example macro object that can be modified and used for creating new macros.
   */
  getMacroObjectExample() {
    return {
      command: "",
      trigger: "",
      disabled: false,
      name: "New Macro",
      title: "",
      global: false,
    };
  }

  async callMacro(trigger, additionalFields, preventGlobalCall) {
    await runTemporaryItemMacro(this, trigger, this.actor, additionalFields, preventGlobalCall);
  }

  hasMacroForTrigger(trigger) {
    const macros = this.system.macros;
    if (!macros) return false;
    
    for (const macro of Object.values(macros)) {
      if (macro.trigger === trigger && !macro.disabled) return true;
    }
    return false;
  }

  async updateShortInfo(text) {
    return await this.update({["system.shortInfo"]: text});
  }

  //==========================
  //       TOGGLE ITEM       =
  //==========================
  async toggle(options={forceOn: false, forceOff: false}) {
    if (!this.system?.toggle?.toggleable) return;

    let newState = !this.system.toggle.toggledOn;
    if (options.forceOn) newState = true;
    else if (options.forceOff) newState = false;
    await this.update({["system.toggle.toggledOn"]: newState});
  }

  async equip(options={forceEquip: false, forceUneqip: false}) {
    if (!this.system?.statuses?.hasOwnProperty("equipped")) return;
    
    let newState = !this.system?.statuses?.equipped;
    if (options.forceEquip) newState = true;
    else if (options.forceUneqip) newState = false;
    await this.update({["system.statuses.equipped"]: newState});
  }
}
