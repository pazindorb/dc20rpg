import { effectEventsFilters, reenableEventsOn, runEventsFor, runInstantEvents } from "../helpers/actors/events.mjs";
import { runTemporaryMacro } from "../helpers/macros.mjs";
import { evaluateDicelessFormula } from "../helpers/rolls.mjs";
import { gmCreate, gmDelete, gmUpdate } from "../helpers/sockets.mjs";
import { DC20ChatMessage } from "../sidebar/chat/chat-message.mjs";

/**
 * Extend the base ActiveEffect class to implement system-specific logic.
 */
export default class DC20RpgActiveEffect extends foundry.documents.ActiveEffect {

  get isLinkedToItemToggle() {
    if (!this.transfer) return false;
    const item = this.getSourceItem();
    if (!item) return false;
    const effectConfig = item.system.effectsConfig;
    if (!effectConfig) return false;
    return item.toggleable && effectConfig.linkWithToggle;
  }

  get canModifyItemToggle() {
    if (!this.isLinkedToItemToggle) return false;
    const item = this.getSourceItem();
    return item.system.effectsConfig.toggleItem;
  }

  get stateChangeLocked() {
    return !this.canModifyItemToggle || this.system.requireEquip;
  }

  get isCondition() {
    return this.system.condition;
  }

  get isStatus() {
    return !!this.system.statusId;
  }

  get hasManualEvent() {
    for (const change of this.system.changes) {
      if (change.key === "system.events") {
        if (change.value.includes('"trigger": "manual"') || change.value.includes('"reenable": "turnStart"')) return true;
      } 
    }
    return false;
  }

  //======================================
  //=           STATIC HELPERS           =
  //======================================
  static enhanceEffectData(effectData, options={}) {
    const actor = options.actor;
    if (!actor) return;

    this.#replaceKeywords(effectData, actor);
    this.#injectFormula(effectData, actor);
    delete effectData.start; 
    if (options.sustain) {
      this.#linkWithSustain(effectData, actor, options.itemId);
    }
  }

  static #replaceKeywords(effect, actor) {
    const saveDC = actor.system.saveDC.value;
    const against = Math.max(saveDC.spell, saveDC.martial);
    for (let i = 0; i < effect.system.changes.length; i++) {
      let changeValue = effect.system.changes[i].value;
      if (typeof changeValue === "string" && changeValue.includes("#SPEAKER_ID#")) {
        changeValue = changeValue.replaceAll("#SPEAKER_ID#", actor.id);
      }
      if (typeof changeValue === "string" && changeValue.includes("#SAVE_DC#")) {
        changeValue = changeValue.replaceAll("#SAVE_DC#", against);
      }
      effect.system.changes[i].value = changeValue;
    }
  }

  static #linkWithSustain(effect, actor, itemId) {
    effect.system.sustained = {
      itemId: itemId,
      actorUuid: actor.uuid,
      isSustained: true
    }
  }

  static #injectFormula(effect, actor) {
    const rollData = actor.getRollData();

    for (const change of effect.system.changes) {
      const value = change.value;
      
      // formulas start with "<#" and end with "#>"
      if (typeof value === "string" && value.includes("<#") && value.includes("#>")) {
        // We want to calculate that formula and repleace it with value calculated
        const formulaRegex = /<#(.*?)#>/g;
        const formulasFound = value.match(formulaRegex);

        formulasFound.forEach(formula => {
          const formulaString = formula.slice(2,-2); // We need to remove <# and #>
          const calculated = evaluateDicelessFormula(formulaString, rollData);
          change.value = change.value.replace(formula, calculated.total); // Replace formula with calculated value
        })
      }
    }
  }

  //======================================
  //=            PREPARE DATA            =
  //======================================
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  //======================================
  //=              METHODS               =
  //======================================
  async disable({force=false}={}) {
    if (this.disabled) return;

    if (this.isLinkedToItemToggle && !force) {
      if (this.canModifyItemToggle) {
        // We just toggle the item, it will handle enabling/disabling the effect
        return await this.item.toggle({forceOff: true}); 
      }
      else {
        ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
        return;
      }
    }

    // Cannot modify effects that requre attunement/equippment
    if (this.system.requireEquip && !force) {
      ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
      return;
    }

    await this.gmUpdate({disabled: true});
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("effectDisabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectDisabled: this});
      await reenableEventsOn("effectDisabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectDisabled: this});
    }
  }

  async enable({dontUpdateTimer, force=false}={}) {
    if (!this.disabled) return;
    if (this.isLinkedToItemToggle && !force) {
      if (this.canModifyItemToggle) {
        // We just toggle the item, it will handle enabling/disabling the effect
        return await this.item.toggle({forceOn: true}); 
      }
      else {
        ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
        return;
      }
    }

    // Cannot modify effects that requre attunement/equippment
    if (this.system.requireEquip && !force) {
      ui.notifications.error(`Effect '${this.name}' is linked to the item named '${this.getSourceItem().name}'. You need to change the state of the connected item`);
      return;
    }

    const updateData = {disabled: false};
    // Check If we should use round counter
    const duration = this.system.duration;
    if (duration?.resetWhenEnabled && !dontUpdateTimer) {
      updateData.start = this.constructor.getEffectStart();
    }
    await this.gmUpdate(updateData);
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("effectEnabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectEnabled: this}); 
      await reenableEventsOn("effectEnabled", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {effectEnabled: this}); 
    }
  }

  /**@override */
  static applyChange(targetDoc, change, options) {
    this.#injectEffectIdToChange(change);
    super.applyChange(targetDoc, change, options);
  }

  static #injectEffectIdToChange(change) {
    const effect = change.effect;
    if (!effect) return;

    // We want to inject effect id only for events and roll levels
    if (change.key.includes("system.events") || change.key.includes("system.dynamicRollModifier") || change.key.includes("system.globalFormulaModifiers")) {
      change.value = `"effectId": "${effect.id}", ` + change.value;
    }
  }

  /**
   * Returns item that is the source of that effect. If item isn't the source it will return null;
   */
  getSourceItem() {
    if (this.parent.documentName === "Item") {
      return this.parent;
    }
    return null;
  }
  
  getOwningActor() {
    if (this.parent.documentName === "Item") {
      return this.parent.actor;
    }
    if (this.parent.documentName === "Actor") {
      return this.parent;
    }
    return null;
  }

  async runManualEvent() {
    const actor = this.getOwningActor();
    if (actor) {
      await runEventsFor("manual", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey, this.id));
      await reenableEventsOn("manual", actor, effectEventsFilters(this.name, this.statuses, this.system.effectKey, this.id)); 
    }
  }

  //======================================
  //=           CRUD OPERATIONS          =
  //======================================
  static async gmCreate(data={}, operation={}) {
    return await gmCreate(data, operation, this);
  }

  async gmUpdate(data={}, operation={}) {
    return await gmUpdate(data, operation, this);
  }

  async gmDelete(operation={}) {
    return await gmDelete(operation, this);
  }

  toObject(source=true) {
    const data = super.toObject(source);
    for (const field in data.duration) {
      if (data.duration[field] === Infinity) data.duration[field] = null;
    }
    return data;
  }

  // If we are removing a status from effect we need to run check 
  async _preUpdate(changed, options, user) {
    super._preUpdate(changed, options, user);
  }

  async _preCreate(data, options, user) {
    if (this.parent.documentName === "Actor") {
      await runEventsFor("effectApplied", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {createdEffect: this}); 
      await reenableEventsOn("effectApplied", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {createdEffect: this}); 
      if (this.preventCreation) return false;
      this.updateSource({start: {...this.constructor.getEffectStart(), ...data.start}});
    }
    super._preCreate(data, options, user);
  }

  async _preDelete(options, user) {
    if (this.parent.documentName === "Actor") {
      await runEventsFor("effectRemoved", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {removedEffect: this}); 
      await reenableEventsOn("effectRemoved", this.parent, effectEventsFilters(this.name, this.statuses, this.system.effectKey), {removedEffect: this}); 
      if (this.preventRemoval) return false;
    }
    return await super._preDelete(options, user);
  }

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if (userId === game.user.id) {
      if (this.parent.documentName === "Actor") {
        runInstantEvents(this, this.parent);
      }
      this._shouldAddToSustainList(data.system.sustained);
    }
    if (data.system.refreshTarget) {
      DC20ChatMessage.refreshTarget(this.getOwningActor().targetHash);
    }
  }

  async _shouldAddToSustainList(sustained) {
    if (!sustained.isSustained) return;
    const actor = await fromUuid(sustained.actorUuid);
    if (actor) actor.addEffectToSustain(sustained.itemId, this.uuid);
  }

  async runMacro(additionalFields) {
    const command = this.system.macro;
    if (!command) return;
    const actor = this.getOwningActor();
    if (!actor) return;
    return await runTemporaryMacro(command, this, {actor: actor, effect: this, ...additionalFields});
  }
}