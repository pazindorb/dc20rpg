import { addItemToActorInterceptor, modifiyItemOnActorInterceptor, removeItemFromActorInterceptor } from "../helpers/actors/itemsOnActor.mjs";
import { createTemporaryMacro, runTemporaryItemMacro } from "../helpers/macros.mjs";
import { translateLabels } from "../helpers/utils.mjs";
import { makeCalculations } from "./item/item-calculations.mjs";
import { AgainstStatus, Conditional, Enhancement, Formula, ItemMacro, RollRequest } from "./item/item-creators.mjs";
import { initFlags } from "./item/item-flags.mjs";
import { enrichWithHelpers } from "./item/item-helpers.mjs";
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
    return this.enhancements.all;
  }

  get activeEnhancements() {
    return this.enhancements.active;
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
    enrichWithHelpers(this);
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
    if (this.infusions?.active) {
      for (const infusion of Object.values(this.infusions.active)) {
        await infusion.remove();
      }
    }
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
  async createFormula(formula={}, formulaKey) {
    return await Formula.create(formula, {parent: this, key: formulaKey});
  }
  async removeFormula(key) {
    await this.update({[`system.formulas.-=${key}`]: null});
  }
  getFormulaObjectExample() {
    return new Formula();
  }

  //==========================
  //       ROLL REQUEST      =
  //==========================
  async createRollRequest(rollRequest={}, rollRequestKey) {
    return await RollRequest.create(rollRequest, {parent: this, key: rollRequestKey});
  }
  async removeRollRequest(key) {
    await this.update({[`system.rollRequests.-=${key}`]: null});
  }
  getRollRequestObjectExample() {
    return new RollRequest();
  }

  //============================
  //       AGAINST STATUS      =
  //============================
  async createAgainstStatus(againstStatus={}, againstStatusKey) {
    return await AgainstStatus.create(againstStatus, {parent: this, key: againstStatusKey});
  }
  async removeAgainstStatus(key) {
    await this.update({[`system.againstStatuses.-=${key}`]: null});
  }
  getAgainstStatusObjectExample() {
    return new AgainstStatus();
  }

  //==========================
  //       ENHANCEMENTS      =
  //==========================
  async createNewEnhancement(enhancement={}, enhancementKey) {
    return await Enhancement.create(enhancement, {parent: this, key: enhancementKey});
  }
  async removeEnhancement(key) {
    await this.update({[`system.enhancements.-=${key}`]: null});
  }
  getEnhancementObjectExample() {
    return new Enhancement(this);
  }

  //============================
  //        CONDITIONALS       =
  //============================
  async createNewConditional(conditional={}, conditionalKey) {
    return await Conditional.create(conditional, {parent: this, key: conditionalKey});
  }
  async removeConditional(key) {
    await this.update({[`system.conditionals.-=${key}`]: null});
  }
  getConditionalObjectExample() {
    return new Conditional();
  }

  //==========================
  //        ITEM MACRO       =
  //==========================
  async createNewItemMacro(macroObject={}, macroKey) {
    return await ItemMacro.create(macroObject, {parent: this, key: macroKey});
  }
  async removeItemMacro(key) {
    await this.update({[`system.macros.-=${key}`]: null});
  }
  getMacroObjectExample() {
    return new ItemMacro();
  }

  editItemMacro(key) {
    const command = this.system.macros[key]?.command;
    if (!command === undefined) return;
    const macro = createTemporaryMacro(command, this, {item: this, key: key});
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
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

    // If linked with slot use actor method instead
    const slotLink = options.slot || this.system.statuses.slotLink;
    const slotLinkProvided = slotLink?.category && slotLink?.key;

    // If slot link was not provided we want to identify where this item could go
    if (this.actor && slotLink?.predefined && !slotLinkProvided) {
      const slot = this.actor.equipmentSlots[slotLink.predefined].freeSlot();
      await slot.equip(this);
    }
    else if (this.actor && slotLinkProvided) {
      const slot = this.actor.equipmentSlots[slotLink.category].slots[slotLink.key];
      if (newState) await slot.equip(this);
      else await slot.unequip();
    }
    else {
      // Update equipped stataus
      await this.update({["system.statuses.equipped"]: newState});
    }
  }
}
