import { holdAction } from "../helpers/actors/actions.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import { prepareItemFormulas } from "../sheets/actor-sheet/items.mjs";
import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { getValueFromPath } from "../helpers/utils.mjs";
import { runItemDRMCheck, runSheetDRMCheck } from "./dynamicRollModifier.mjs";
import { DC20Roll } from "./rollApi.mjs";
import { DRMDialog } from "./drmDialog.mjs";
import { sheetRollDataFrom } from "./rollHelper.mjs";
import { AreaPlacer } from "../subsystems/area/areaPlacer.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";

export class RollDialog extends DC20Dialog {

  static async open(actor, data={}, options={}) {
    if (options.sendToActorOwners) {
      const owners = getIdsOfActiveActorOwners(actor, false);
      if (owners.length > 0 && !owners.find(ownerId => game.user.id === ownerId)) options.users = owners;
    }

    // Send to other users
    if (options.users) {
      const payload = {
        actorId: actor.id, 
        options: options,
        isToken: actor.isToken
      };

      if (data.documentName === "Item") {
        payload.itemId = data.id;
        payload.isItem = true;
      }
      else {
        payload.data = data;
        payload.isItem = false;
      }

      if (actor.isToken) {
        payload.tokenId = actor.token.id;
      }

      const validationData = {emmiterId: game.user.id, actorId: actor.id};
      const rollResult = responseListener("ROLL_DIALOG_RESTULT", validationData);
      emitSystemEvent("OPEN_ROLL_DIALOG", payload);
      const response = await rollResult;
      return response;
    }

    else {
      return await RollDialog.create(actor, data, options);
    }
  }

  static async create(actor, data={}, options={}) {
    if (data.documentName === "Item") {
      await runTemporaryItemMacro(data, "onRollPrompt", actor, {dialogOptions: options});
      options.quickRoll = options.quickRoll || data.system.quickRoll;
    }
    
    const prompt = new RollDialog(actor, data, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      if (!options.quickRoll) prompt.render(true);
    });
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/roll-dialog.hbs",
      scrollable: [".scrollable"]
    }
  };

  // For now removed, maybe will come back
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if (!game.user.isGM && this.itemRoll) {
      buttons.unshift({
        label: "GM Help",
        class: "ask-gm-for-help",
        icon: "fas fa-handshake-angle",
        tooltip: "Ask GM for Help",
        onclick: () => this._onAskForHelp()
      });
    }
    return buttons;
  }

  _onAskForHelp() {
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.info("No GM currently active");
      return;
    }

    emitSystemEvent("askGmForHelp", {
      actorId: this.actor._id,
      itemId: this.item._id,
      gmUserId: gm._id
    });
  }

  //==========================================
  //=              CONSTRUCTOR               =
  //==========================================
  constructor(actor, data={}, options={}) {
    super(options);
    // We want to clear postRollEffectAction when we open new roll prompt
    game.dc20rpg.postRollEffectAction = new Map();

    this.actor = actor;
    if (data.documentName === "Item") {
      this.itemRoll = true;
      this.item = data;
      this.updateObject = this.item;

      this._prepareAttackRange();
      this._prepareHeldAction();
      const areas = this.item.system.areas || {};
      this.hasAreas = Object.keys(areas).length > 0;
    }
    else {
      this.itemRoll = false;
      this.sheetRollData = sheetRollDataFrom(data, this.actor);
      this.updateObject = this.actor;
    }
    this.quickRoll = !!options.quickRoll;
    this.messageMode = options.messageMode || options.rollMode || game.settings.get("core", "messageMode");
    this.initialRollMenuValue = options.initialRollMenuValue;
    this.promiseResolve = null;
    this.autoDRMCheck = game.settings.get("dc20rpg", "autoDRMCheck");
    this.forceTargets = game.settings.get("dc20rpg", "forceTargets");
    this.modifyFormula = options.customFormula || false;
    this._autoDRMCheck();
  }

  _autoDRMCheck() {
    if (this.autoDRMCheck) {
      this._DRMCheck(false); // it deals with quick roll as well
    }
    else {
      this.DRMChecked = false;
      if (this.quickRoll) this._onRoll();
    }
  }

  async _prepareAttackRange() {
    let rangeType = ""; 
    const system = this.item.system;
    if (system.actionType === "attack") rangeType = system.attack.rangeType;
    this.item.system.rollMenu.rangeType = rangeType;
    await this.item.update({["system.rollMenu.rangeType"]: rangeType});
  }

  async _prepareHeldAction() {
    const actionHeld = this.actor.flags.dc20rpg.actionHeld;
    const rollsHeldAction = actionHeld?.rollsHeldAction;
    if (!rollsHeldAction) return;

    // Update enhancements
    const allEnhancements = this.item.enhancements.all;
    for (const [enhKey, enhNumber] of Object.entries(actionHeld.enhancements)) {
      const itemId = allEnhancements.get(enhKey).sourceItemId;
      const itemToUpdate = this.actor.items.get(itemId);
      if (itemToUpdate) await itemToUpdate.update({[`system.enhancements.${enhKey}.number`]: enhNumber});
    }

    // Update roll menu
    await this.item.update({["system.rollMenu"]: {
      apCost: actionHeld.apForAdv,
      adv: actionHeld.apForAdv
    }});
    this.render();
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Roll";
    initialized.window.icon = "fa-light fa-dice-d20";
    initialized.window.resizable = true;
    initialized.classes.push("fixed-600-size");
    initialized.position.width = 600;

    initialized.actions.holdAction = this._onHoldAction;
    initialized.actions.roll = this._onRoll;

    initialized.actions.drm = this._onDRMCheck;
    initialized.actions.rangeChange = this._onRangeChange;
    initialized.actions.modifyFormula = this._onModifyFormula;

    initialized.actions.multiFaceted = this._onMultiFaceted;
    initialized.actions.reloadWeapon = this._onWeaponReload;

    initialized.actions.placeAreas = this._onPlaceAreas;

    return initialized;
  }

  //==========================================
  //=                CONTEXT                 =
  //==========================================
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // COMMON DATA
    this._prepareCoreFormula();
    context.coreFormula = this.coreFormula;
    context.modifyFormula = this.modifyFormula;
    context.header = {
      img: this.updateObject.img,
      name: this.sheetRollData?.rollTitle || this.updateObject.name,
      description: this.sheetRollData?.description
    }
    context.rollsHeldAction = this.actor.flags.dc20rpg.actionHeld?.rollsHeldAction;
    context.rollMenu = this.updateObject.system.rollMenu;
    context.helpOptions = {
      "+ d8": "d8",
      "+ d6": "d6",
      "+ d4": "d4",
      "+ d10": "d10",
      "+ d12": "d12",
      "- d8": "-d8",
      "- d6": "-d6",
      "- d4": "-d4",
      "- d10": "-d10",
      "- d12": "-d12",
      "+ 2": "+2",
      "+ 5": "+5",
      "- 2": "-2",
      "- 5": "-5"
    };
    context.disableRollLevel = context.rollMenu.autoFail || context.rollMenu.autoCrit;
    context.DRMChecked = this.DRMChecked;
    context.messageModes = {
      public: "Public Roll",
      gm: "GM Roll",
      blind: "Blind Roll",
      self: "Self Roll"
    };
    context.messageMode = this.messageMode;
    if (context.rollMenu) {
      switch (context.rollMenu.rangeType) {
        case "melee": context.rangeIcon = "fa-sword"; break;
        case "ranged": context.rangeIcon = "fa-bow-arrow"; break;
        case "area": context.rangeIcon = "fa-bullseye"; break;
      }
    }

    // ITEM ROLL
    if (this.item) {
      prepareItemFormulas(this.item, this.actor);
      context.usesWeapon = this.item.system.usesWeapon?.weaponAttack;
      context.multiCheck = this.item.system.check?.multiCheck?.active;
      context.usesAmmo = !!this.item.ammo;
      context.multiFaceted = !!this.item.multiFaceted;
      context.reloadable = !!this.item.reloadable;

      context.item = this.item;
      context.enhancements = this._prepareEnhancements(this.item.enhancements.all, this.item);
      context.hasDetails = context.usesWeapon || context.multiCheck || context.usesAmmo || context.multiFaceted;
      context.hasAreas = this.hasAreas;

      if (context.usesAmmo) context.ammoSelection = this.item.ammo.options();
      if (context.usesWeapon) context.weaponSelection = this.actor.getAllItemsWithType(["weapon"], [], true);
      if (context.reloadable) {
        context.reloaded = this.item.reloadable.isLoaded(true);
      }

      context.expectedCost = this.item.use?.useCostDisplayData();
      context.canSubtractCost = context.rollMenu.free || this.item.use?.canSubtractCost();
      context.rollLabel = `Roll Item: ${this.item.name}`;
      context.canSpendGrit = false;
      context.hasModifications = true;
    }

    // SHEET ROLL
    else {
      context.expectedCost = this.sheetRollData.useCostDisplayData();
      context.canSubtractCost = context.rollMenu.free || this.sheetRollData.canSubtractCost();
      context.enhancements = this._prepareEnhancements(this.sheetRollData.enhancements);
      context.canSpendGrit = this.sheetRollData.type === "save";
      context.hasModifications = false;
      context.rollLabel = `Roll: ${this.sheetRollData.label}`;
    }

    context.manaSpendLimit = this._getManaSpendLimit(context.expectedCost);
    context.staminaSpendLimit = this._getStaminaSpendLimit(context.expectedCost);
    return context;
  }

  _getManaSpendLimit(expectedCost) {
    const manaSpendLimit = this.actor.system.details.manaSpendLimit;
    if (!manaSpendLimit) return {};

    const mana = expectedCost?.resources?.mana?.amount;
    const msl = manaSpendLimit.value + this._enhancementMslChanges();
    const amount = msl === manaSpendLimit.value ? msl : `${msl}*`;
    const modified = msl !== manaSpendLimit.value;
    const exceeds = mana > 0 && mana > msl;

    return {
      amount: amount,
      exceeds: exceeds,
      modified: modified
    }
  }

  _enhancementMslChanges() {
    let limitChange = 0;
    const enhancements = this.itemRoll ? this.item.enhancements.active : this.sheetRollData.enhancements;
    enhancements.values().forEach(enh => {
      if (!enh.active) return;
      const change = enh.modifications.changeManaSpendLimit || 0;
      limitChange += change * enh.number;
    });
    return limitChange;
  }

  _getStaminaSpendLimit(expectedCost) {
    const staminaSpendLimit = this.actor.system.details.staminaSpendLimit;
    if (!staminaSpendLimit) return {};

    const stamina = expectedCost?.resources?.stamina?.amount;
    const ssl = staminaSpendLimit.value + this._enhancementSslChanges();
    const amount = ssl === staminaSpendLimit.value ? ssl : `${ssl}*`;
    const modified = ssl !== staminaSpendLimit.value;
    const exceeds = stamina > 0 && stamina > ssl;

    return {
      amount: amount,
      exceeds: exceeds,
      modified: modified
    }
  }

  _enhancementSslChanges() {
    let limitChange = 0;
    const enhancements = this.itemRoll ? this.item.enhancements.active : this.sheetRollData.enhancements;
    enhancements.values().forEach(enh => {
      if (!enh.active) return;
      const change = enh.modifications.changeStaminaSpendLimit || 0;
      limitChange += change * enh.number;
    });
    return limitChange;
  }
 
  _getDataForSheetRoll() {
    return {
      rollDetails: this.sheetRollData,
      ...this.actor,
      DRMChecked: this.DRMChecked
    };
  }

  _prepareEnhancements(enhancements, item) {
    const prepared = {};
    for (const [key, enh] of enhancements.entries()) {
      prepared[key] = {...enh};
      if (item) {
        prepared[key].useCost = item.use.enhancementCostDisplayData(key);
      }
      else {
        const itm = this.actor.items.get(enh.sourceItemId);
        if (itm) prepared[key].useCost = itm.use.enhancementCostDisplayData(key);
      }
    }
    return prepared;
  }

  _prepareCoreFormula() {
    if (this.modifyFormula) return;

    const rollMenu = this.updateObject.system.rollMenu;
    const helpDice = rollMenu.helpDiceFormula();
    const modifier = rollMenu.coreFormula.modifier.replace(/\s\s+/g, ' '); // Get rid of extra space
    const source = rollMenu.coreFormula.source;
    const rollLevel = rollMenu.adv - rollMenu.dis;

    const coreFormula = [];
    if (this.itemRoll) {
      const flatModifier = this.item.system?.rollConfig?.flatModifier;
      const d20Roll = DC20Roll.prepareItemCoreRollDetails(this.updateObject, {rollLevel: rollLevel, flatModifier: flatModifier});
      if (d20Roll.roll) coreFormula.push({value: d20Roll.roll, source: "Base Core Formula"});
    }
    else {
      const d20Roll = this.sheetRollData.type === "save" ? DC20Roll.prepareSaveDetails(this.sheetRollData.checkKey, {rollLevel: rollLevel}) : DC20Roll.prepareCheckDetails(this.sheetRollData.checkKey, {rollLevel: rollLevel});
      let custom = this.sheetRollData.customFormula;
      if (custom) {
        if (rollLevel !== 0) {
          const value = Math.abs(rollLevel) + 1;
          const type = rollLevel > 0 ? "kh" : "kl";
          const dice = `${value}d20${type}`;
          custom = custom.replace("d20", dice);
        }
      }
      if (custom) coreFormula.push({value: custom, source: "Custom Core Formula"})
      else if (d20Roll.roll) coreFormula.push({value: d20Roll.roll , source: "Base Core Formula"})
    }
    if (modifier) coreFormula.push({value: modifier, source: source});
    if (helpDice) coreFormula.push({value: helpDice, source: "Help Dice"});
    this.coreFormula = coreFormula;
  }

  //==========================================
  //=                ACTIONS                 =
  //==========================================
  _getItem(itemId) {
    let item = this.item;
    if (itemId !== this.item?._id) item = this.actor.items.get(itemId);
    return item;
  }

  async _onRangeChange() {
    const ranges = ["melee", "ranged", "area"];
    const current = this.item.system.rollMenu.rangeType;
    const index = ranges.indexOf(current);
    const newRange = ranges[index + 1] || ranges[0];
    await this.item.update({["system.rollMenu.rangeType"]: newRange});
    if (this.autoDRMCheck) this._DRMCheck(false);
    else this.render();
  }

  _onHoldAction(event) {
    event.preventDefault();
    if (!this.itemRoll) return;
    holdAction(this.item, this.actor);
    this.promiseResolve(null);
    this.close();
  }

  async _onRoll(event) {
    if (event) event.preventDefault();
    const canProceed = await this.#canProceed();
    if (!canProceed) return this.render(true);

    const formula = this.modifyFormula || this.coreFormula.map(obj => obj.value).join(" ");
    const source = this.modifyFormula ? "Custom Formula" : this.coreFormula.map(obj => obj.source).join(" + ");
    const coreFormula = {
      formula: formula,
      source: source,
    }

    const roll = this.itemRoll 
                  ? await DC20Roll.rollItem(coreFormula, this.item, {messageMode: this.messageMode})
                  : await DC20Roll.rollFormula(coreFormula, this.sheetRollData, this.actor, {messageMode: this.messageMode});
    
    const preventClose = roll === undefined && !this.quickRoll;
    if (preventClose) return this.render();
    this.promiseResolve(roll);
    this.close();
  }

  async #canProceed() {
    return await this.#validateTargets();
  }

  async #validateTargets() {
    if (!this.item) return true;
    if (!this.forceTargets) return true;
    const config = this.item.system.target;
    if (!config) return true;

    const targets = game.user.targets;
    if (config.type === "self") {
      const myToken = this.actor.getActiveTokens()[0];
      if (!myToken) return true;

      if (!targets.has(myToken)) {
        const message = "This item configures the 'Target' as 'Self'. You haven't selected yourself as a target. Do you want to select yourself now? Remember that after changing targets, you should run a DRM check again.";
        const confirmed = await SimplePopup.open("confirm", {header: "Target Confirmation", information: [message], confirmLabel: "Select Self", denyLabel: "Keep current selection"});
        if (confirmed) {
          canvas.tokens.setTargets([myToken.id], {mode: "replace"});
          return false;
        }
      }
    }
    if (["ally", "enemy", "creature"].includes(config.type)) {
      if (targets.size === 0) {
        ui.notifications.warn("You must select a Target before making this roll. Remember that after changing targets, you should run a DRM check again.")
        return false;
      }
    }

    // TODO: Should we add check if number of targets > count? - In that case enhancements should modify it
    return true;
  }

  async _onDRMCheck(event) {
    event.preventDefault();
    this._DRMCheck(true);
  }

  async _onWeaponReload() {
    await this.item.reloadable.reload();
    this.render();
  }

  async _DRMCheck(display) {
    let drmRunningPopup = null;
    if (display) {
      drmRunningPopup = new SimplePopup("info", {hideButtons: true, header: "DRM Check", information: [`Waiting for Dynamic Roll Modifier Check to finish...`]});
      await drmRunningPopup.render(true);
    }

    this.DRMChecked = true;
    let [finalValue, result] = [{}, {}];
    if (this.itemRoll) [finalValue, result] = await runItemDRMCheck(this.item, this.actor, this.initialRollMenuValue);
    else [finalValue, result] = await runSheetDRMCheck(this.sheetRollData, this.actor, this.initialRollMenuValue);
    
    if (drmRunningPopup) drmRunningPopup.close();
    await this._updateRollMenu(finalValue);
    if (this.quickRoll) {
      this._prepareCoreFormula();
      return this._onRoll();
    }

    if (display || finalValue.manualChanges || finalValue.autoCrit || finalValue.autoFail) {
      DRMDialog.open(result);
    }
    this.render()
  }

  async _updateRollMenu(finalValue) {
    await this.updateObject.update({
      ["system.rollMenu.adv"]: finalValue.adv,
      ["system.rollMenu.dis"]: finalValue.dis,
      ["system.rollMenu.autoCrit"]: finalValue.autoCrit,
      ["system.rollMenu.autoFail"]: finalValue.autoFail,
      ["system.rollMenu.coreFormula.modifier"]: finalValue.modifier,
      ["system.rollMenu.coreFormula.source"]: finalValue.label,
    });
  }

  _onPlaceAreas(event, target) {
    event.preventDefault();
    if (!this.hasAreas) return;

    const areas = this.#prepareAreas();
    const options = {targetMode: true};
    const token = this.actor.getActiveTokens()[0];
    if (token) options.tokenId = token.id;
    AreaPlacer.create(areas, options);
  }

  #prepareAreas() {
    const areas = foundry.utils.deepClone(this.item.system.areas);
    const areaKeys = Object.keys(areas);

    this.item.enhancements.active.values().forEach(enh => {
      if (enh.modifications.areaDistance) {
        for (const key of areaKeys) {
          if (areas[key].distance) areas[key].distance += (enh.modifications.areaDistance * enh.number);
        }
      }
      if (enh.modifications.areaWidth) {
        for (const key of areaKeys) {
          if (areas[key].width) areas[key].width += (enh.modifications.areaWidth * enh.number);
        }
      }
    });
    return areas;
  }

  async _onMultiFaceted(event, target) {
    await this.item.multiFaceted.swap();
    this.render();
  }

  _onModifyFormula() {
    if (this.modifyFormula) this.modifyFormula = false;
    else this.modifyFormula = this.coreFormula.map(obj => obj.value).join(" ");
    this.render();
  }

  async _onActivable(path, dataset) {
    await super._onActivable(path, dataset);
    if (path.includes(".rollMenu.") && !(path.includes(".auto") || path.includes(".free"))) {
      if (this.autoDRMCheck) this._DRMCheck(false);
    }
  }
  
  async _onToggle(path, which, max, min, dataset) {
    if (path.includes("system.enhancements")) {
      await this._onToggleEnhancement(path, which, max, min, dataset.itemId, dataset.runDrmCheck === "true");
    }
    else if (["apForAdv", "gritForAdv"].includes(path)) {
      await this._onToggleRollLevel(path, which, max, min);
    }
    else {
      await super._onToggle(path, which, max, min, dataset);
    }
  }

  async _onToggleEnhancement(path, which, max, min, itemId, runDrmCheck) {
    const item = this._getItem(itemId);
    const value = getValueFromPath(item, path);
    if (max == 1) { // we want this kind of toggle to work similar to activale type
      if (value === 1) which = 3;
      if (value === 0) which = 1;
    }

    if (which === 1) {
      await item.update({[path]: Math.min(value + 1, max)});
      this.render();
    }
    if (which === 3) {
      await item.update({[path]: Math.max(value - 1, min)});
      this.render();
    }

    if (this.sheetRollData) this.sheetRollData.refreshEnhancemetns();
    if (this.autoDRMCheck && runDrmCheck) this._DRMCheck(false);
  }

  async _onToggleRollLevel(path, which) {
    const rollMenu = this.updateObject.system.rollMenu;
    if (path.includes("apForAdv")) {
      if (which === 1) await rollMenu.apForAdvUp();
      if (which === 3) await rollMenu.apForAdvDown();
    }
    if (path.includes("gritForAdv")) {
      if (which === 1) await rollMenu.gritForAdvUp();
      if (which === 3) await rollMenu.gritForAdvDown();
    }
    this.render();
  }

  async _onChange(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const value = target.value;

    if (cType === "ammo-select") {
      await this.item.ammo.change(value);
      this.render();
    }
    else if (cType === "modify-formula") {
      this.modifyFormula = value;
      this.render();
    }
    else if (cType === "roll-mode") {
      this.messageMode = value;
      this.render();
    }
    else {
      super._onChange(event);
    }
  }

  /** @override */
  close(options) {
    this.actor.system.rollMenu.clear();
    if (this.item) this.item.system.rollMenu.clear();
    
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    // Set size of .enhancements fieldset
    if (this.element) {
      const fieldset = this.element.querySelector(".enhancements");
      if (!fieldset) return;
      const height = fieldset.getBoundingClientRect().height;
      if (height < 250) fieldset.style.height = `${height}px`;
    }
  }

  render(force=false, options={}) {
    super.render(force, options);

    if (!options.dontEmit) {
      // Emit event to refresh roll prompts
      const payload = {
        itemId: this.item?.id,
        actorId: this.actor?.id
      }
      emitSystemEvent("RollDialogRerendered", payload);
    }
  }
}