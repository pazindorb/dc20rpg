import { holdAction } from "../helpers/actors/actions.mjs";
import { getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { getMesuredTemplateEffects } from "../helpers/effects.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { prepareItemFormulas } from "../sheets/actor-sheet/items.mjs";
import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { TokenSelector } from "../dialogs/token-selector.mjs";
import { getValueFromPath } from "../helpers/utils.mjs";
import { runItemDRMCheck, runSheetDRMCheck } from "./dynamicRollModifier.mjs";
import { DC20Roll } from "./rollApi.mjs";
import { DRMDialog } from "./drmDialog.mjs";

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
      const rollResult = responseListener("rollDialogResult", validationData);
      emitSystemEvent("rollDialog", payload);
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
    // We want to clear afterRollEffects when we open new roll prompt
    this.afterRollEffects = [];

    this.actor = actor;
    if (data.documentName === "Item") {
      this.itemRoll = true;
      this.item = data;
      this.updateObject = this.item;

      this._prepareAttackRange();
      this._prepareHeldAction();
      this._prepareMeasurementTemplates();
    }
    else {
      this.itemRoll = false;
      this.details = {...data};
      this.updateObject = this.actor;

      if (this.details.checkKey.length > 4 && !["initiative", "deathSave"].includes(this.details.checkKey)) {
        const skill = actor.skillAndLanguage.skills[this.details.checkKey];
        const label = skill?.label ? `${skill?.label} Check` : "Check";
        this.details.label = label;
        this.details.rollTitle = label;
      }
    }
    this.rollMode = options.rollMode || game.settings.get("core", "rollMode");
    this.initialRollMenuValue = options.initialRollMenuValue;
    this.promiseResolve = null;
    this.autoDRMCheck = game.settings.get("dc20rpg", "autoDRMCheck");
    this.modifyFormula = options.customFormula || false;
    this._autoDRMCheck(options);
  }

  _autoDRMCheck(options) {
    if (this.autoDRMCheck) {
      this._DRMCheck(false, options.quickRoll); // it deals with quick roll as well
    }
    else {
      this.DRMChecked = false;
      if (options.quickRoll) this._onRoll();
    }
  }

  _prepareMeasurementTemplates() {
    const areas = this.item.system.target?.areas;
    if (!areas) this.measurementTemplates = {};
    const measurementTemplates = DC20RpgMeasuredTemplate.mapItemAreasToMeasuredTemplates(areas);
    if (Object.keys(measurementTemplates).length > 0) {
      this.measurementTemplates = measurementTemplates;
    }
    else this.measurementTemplates = {};
  }

  async _prepareAttackRange() {
    let rangeType = ""; 
    const system = this.item.system;
    if (system.actionType === "attack") rangeType = system.attackFormula.rangeType;
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

    initialized.actions.template = this._onCreateMeasuredTemplate;
    initialized.actions.changeSpace = this._onChangeTemplateSpace;

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
      name: this.details?.rollTitle || this.updateObject.name,
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
    context.rollModes = {
      publicroll: "Public Roll",
      gmroll: "GM Roll",
      blindroll: "Blind Roll",
      selfroll: "Self Roll"
    };
    context.rollMode = this.rollMode;
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
      context.enhancements = this._prepareEnhancements();
      context.hasDetails = context.usesWeapon || context.multiCheck || context.usesAmmo || context.multiFaceted;

      context.measurementTemplates = this.measurementTemplates;
      context.hasTemplates = Object.keys(context.measurementTemplates).length > 0;

      if (context.usesAmmo) context.ammoSelection = this.item.ammo.options();
      if (context.usesWeapon) context.weaponSelection = this.actor.getAllItemsWithType(["weapon"], [], true);
      if (context.reloadable) {
        context.reloaded = this.item.reloadable.isLoaded(true);
      }

      context.expectedCost = this.item.use?.useCostDisplayData();
      context.manaSpendLimit = this._getManaSpendLimit(context.expectedCost);
      context.staminaSpendLimit = this._getStaminaSpendLimit(context.expectedCost);
      context.rollLabel = `Roll Item: ${this.item.name}`;

      context.canSpendGrit = false;
      context.hasModifications = true;
    }

    // SHEET ROLL
    else {
      context.canSpendGrit = this.details.type === "save";
      context.hasModifications = false;
      context.rollLabel = `Roll: ${this.details.label}`;
    }

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
    const enhancements = this.item.enhancements.active;
    enhancements.values().forEach(enh => {
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
    const enhancements = this.item.enhancements.active;
    enhancements.values().forEach(enh => {
      const change = enh.modifications.changeStaminaSpendLimit || 0;
      limitChange += change * enh.number;
    });
    return limitChange;
  }
 
  _getDataForSheetRoll() {
    return {
      rollDetails: this.details,
      ...this.actor,
      DRMChecked: this.DRMChecked
    };
  }

  _prepareEnhancements() {
    const enhancements = {};
    for (const [key, enh] of this.item.enhancements.all.entries()) {
      enhancements[key] = {...enh};
      enhancements[key].useCost = this.item.use.enhancementCostDisplayData(key);
    }
    return enhancements;
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
      const d20Roll = DC20Roll.prepareItemCoreRollDetails(this.updateObject, {rollLevel: rollLevel});
      if (d20Roll.roll) coreFormula.push({value: d20Roll.roll, source: "Base Core Formula"});
    }
    else {
      const d20Roll = this.details.type === "save" ? DC20Roll.prepareSaveDetails(this.details.checkKey, {rollLevel: rollLevel}) : DC20Roll.prepareCheckDetails(this.details.checkKey, {rollLevel: rollLevel});
      let custom = this.details.customFormula;
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
    if (itemId !== this.item._id) item = this.actor.items.get(itemId);
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
    if(event) event.preventDefault();
    const formula = this.modifyFormula || this.coreFormula.map(obj => obj.value).join(" ");
    const source = this.modifyFormula ? "Custom Formula" : this.coreFormula.map(obj => obj.source).join(" + ");
    const coreFormula = {
      formula: formula,
      source: source,
    }

    const roll = this.itemRoll 
                  ? await DC20Roll.rollItem(coreFormula, this.item, {rollMode: this.rollMode, afterRollEffects: this.afterRollEffects})
                  : await DC20Roll.rollFormula(coreFormula, this.details, this.actor, {rollMode: this.rollMode, afterRollEffects: this.afterRollEffects});
    this.promiseResolve(roll);
    this.close();
  }

  async _onDRMCheck(event) {
    event.preventDefault();
    this._DRMCheck(true);
  }

  async _onWeaponReload() {
    await this.item.reloadable.reload();
    this.render();
  }

  async _DRMCheck(display, quickRoll) {
    this.DRMChecked = true;
    let [finalValue, result, afterRoll] = [{}, {}, []];
    if (this.itemRoll) [finalValue, result, afterRoll] = await runItemDRMCheck(this.item, this.actor, this.initialRollMenuValue);
    else [finalValue, result, afterRoll] = await runSheetDRMCheck(this.details, this.actor, this.initialRollMenuValue);
    
    await this._updateRollMenu(finalValue);
    this.afterRollEffects = afterRoll;
    if (quickRoll) {
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

  async _onCreateMeasuredTemplate(event, target) {
    const key = target.dataset.key;
    const template = this.measurementTemplates[key];
    if (!template) return;

    const applyEffects = getMesuredTemplateEffects(this.item, [], this.actor);
    const itemData = {
      itemId: this.item.id, 
      actorId: this.actor.id, 
      tokenId: this.actor.token?.id, 
      applyEffects: applyEffects, 
      itemImg: this.item.img, 
      itemName: this.item.name
    };
    const measuredTemplates = await DC20RpgMeasuredTemplate.createMeasuredTemplates(template, () => this.render(), itemData);

    // We will skip Target Selector if we are using selector for applying effects
    if (applyEffects.applyFor === "selector") return;

    let tokens = {};
    for (let i = 0; i < measuredTemplates.length; i++) {
      const collectedTokens = getTokensInsideMeasurementTemplate(measuredTemplates[i]);
      tokens = {
        ...tokens,
        ...collectedTokens
      }
    }
    
    if (Object.keys(tokens).length > 0) tokens = await TokenSelector.open(tokens, "Select Targets");
    if (tokens.length > 0) {
      const user = game.user;
      if (!user) return;

      user.targets.forEach(target => {
        target.setTarget(false, { user: user });
      });

      for (const token of tokens) {
        token.setTarget(true, { user: user, releaseOthers: false });
      }

      if (this.autoDRMCheck) this._DRMCheck(false);
    }
  }

  _onChangeTemplateSpace(event, target) {
    const key = target.dataset.key;
    const direction = target.dataset.direction;
    const template = this.measurementTemplates[key];
    if (!template) return;
    if (direction === "up") DC20RpgMeasuredTemplate.changeTemplateSpaces(template, 1); // TODO: Rework to be a template method
    if (direction === "down") DC20RpgMeasuredTemplate.changeTemplateSpaces(template, -1); // TODO: Rework to be a template method
    this.render();
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

    if (which === 1) {
      await item.update({[path]: Math.min(value + 1, max)});
      this.render();
    }
    if (which === 3) {
      await item.update({[path]: Math.max(value - 1, min)});
      this.render();
    }

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
      this.rollMode = value;
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