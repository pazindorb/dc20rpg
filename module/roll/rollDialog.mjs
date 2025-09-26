import { holdAction } from "../helpers/actors/actions.mjs";
import { collectWeaponsFromActor, getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { rollFromItem, rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { getMesuredTemplateEffects } from "../helpers/effects.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { runItemRollLevelCheck, runSheetRollLevelCheck } from "../helpers/rollLevel.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { prepareItemFormulas } from "../sheets/actor-sheet/items.mjs";
import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { TokenSelector } from "../dialogs/token-selector.mjs";
import { getValueFromPath } from "../helpers/utils.mjs";

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
      await runTemporaryItemMacro(data, "onRollDialog", actor);
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
    // We want to clear effectsToRemove when we open new roll prompt
    actor.update({["flags.dc20rpg.effectsToRemoveAfterRoll"]: []}); 

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

      if (this.details.checkKey.length > 4) {
        const skill = actor.skillAndLanguage.skills[this.details.checkKey];
        const label = skill?.label ? `${skill?.label} Check` : "Check";
        this.details.label = label;
        this.details.rollTitle = label;
      }
    }
    this.rollMode = options.rollMode || game.settings.get("core", "rollMode");
    this.startingRollMenuValues = options.startingRollMenuValues;
    this.promiseResolve = null;
    this._autoRollLevelCheck(options);
  }

  _autoRollLevelCheck(options) {
    const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
    if (autoRollLevelCheck) {
      this._rollLevelCheck(false, options.quickRoll); // it deals with quick roll as well
    }
    else {
      this.rollLevelChecked = false;
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
    const allEnhancements = this.item.allEnhancements;
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
    initialized.position.width = 600;

    initialized.actions.holdAction = this._onHoldAction;
    initialized.actions.roll = this._onRoll;

    initialized.actions.rollLevel = this._onRollLevelCheck;
    initialized.actions.rangeChange = this._onRangeChange;

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
    context.header = {
      img: this.updateObject.img,
      name: this.details?.rollTitle || this.updateObject.name,
    }
    context.rollsHeldAction = this.actor.flags.dc20rpg.actionHeld?.rollsHeldAction;
    context.rollMenu = this.updateObject.system.rollMenu;
    context.helpDiceOptions = {
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
    };
    context.disableRollLevel = context.rollMenu.autoFail || context.rollMenu.autoCrit;
    context.rollLevelChecked = this.rollLevelChecked;
    context.rollModes = {
      publicroll: "Public Roll",
      gmroll: "GM Roll",
      blindroll: "Blind Roll",
      selfroll: "Self Roll"
    };
    context.rollMode = this.rollMode;

    // ITEM ROLL
    if (this.item) {
      prepareItemFormulas(this.item, this.actor);
      context.usesWeapon = this.item.system.usesWeapon?.weaponAttack;
      context.multiCheck = this.item.system.check.multiCheck.active;
      context.usesAmmo = !!this.item.ammo;
      context.multiFaceted = !!this.item.multiFaceted;
      context.reloadable = !!this.item.reloadable;

      context.item = this.item;
      context.enhancements = this._prepareEnhancements();
      context.hasDetails = context.usesWeapon || context.multiCheck || context.usesAmmo || context.multiFaceted;

      context.measurementTemplates = this.measurementTemplates;
      context.hasTemplates = Object.keys(context.measurementTemplates).length > 0;

      if (context.usesAmmo) context.ammoSelection = this.item.ammo.options();
      if (context.usesWeapon) context.weaponSelection = collectWeaponsFromActor(this.actor);
      if (context.reloadable) {
        context.reloaded = this.item.reloadable.isLoaded(true);
      }

      context.expectedCost = this.item.use.useCostDisplayData();
      context.manaSpendLimit = this._getManaSpendLimit(context.expectedCost);
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
    const amount = msl === manaSpendLimit.value ? msl : `${manaSpendLimit.value} (${msl})`;
    const exceeds = mana > 0 && mana > msl;

    return {
      amount: amount,
      exceeds: exceeds
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
 
  _getDataForSheetRoll() {
    return {
      rollDetails: this.details,
      ...this.actor,
      rollLevelChecked: this.rollLevelChecked
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

  //==========================================
  //=                ACTIONS                 =
  //==========================================
  /** @override */
  _onHover(event) {
    const itemId = event.target.dataset.itemId;
    if (!itemId) return;
    super._onHover(event);
  }

  _getItem(itemId) {
    let item = this.item;
    if (itemId !== this.item._id) item = getItemFromActor(itemId, this.actor);
    return item;
  }

  async _onRangeChange() {
    const current = this.item.system.rollMenu.rangeType;
    let newRange = current === "melee" ? "ranged" : "melee";
    await this.item.update({["system.rollMenu.rangeType"]: newRange});
    const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
    if (autoRollLevelCheck) this._rollLevelCheck(false);
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
    let roll = null;
    const rollMenu = this.updateObject.system.rollMenu;
    if (this.itemRoll) {
      roll = await rollFromItem(this.item._id, this.actor, true, this.rollMode);
    }
    else {
      this.details.costs = [];
      if (rollMenu.apCost) this.details.costs.push({key: "ap", value: rollMenu.apCost});
      if (rollMenu.gritCost) this.details.costs.push({key: "grit", value: rollMenu.gritCost});      
      roll = await rollFromSheet(this.actor, this.details, this.rollMode);
    }
    this.promiseResolve(roll);
    this.close();
  }

  async _onRollLevelCheck(event) {
    event.preventDefault();
    this._rollLevelCheck(true);
  }

  _onDisplayRollLevelCheckResult(result=this.rollLevelCheckResult) {
    SimplePopup.info("Expected Roll Level", result);
  }

  async _onWeaponReload() {
    await this.item.reloadable.reload();
    this.render();
  }

  async _rollLevelCheck(display, quickRoll) {
    this.rollLevelChecked = true;
    let result = [];
    if (this.itemRoll) result = await runItemRollLevelCheck(this.item, this.actor, this.startingRollMenuValues);
    else result = await runSheetRollLevelCheck(this.details, this.actor, this.startingRollMenuValues);

    if (quickRoll) return this._onRoll();
    
    if (result[result.length -1] === "FORCE_DISPLAY") {
      result.pop();
      display = true; // For manual actions we always want to display this popup
    }

    if (display) this._onDisplayRollLevelCheckResult(result);
    this.rollLevelCheckResult = result;
    this.render()
  }

  async _onCreateMeasuredTemplate(event, target) {
    const key = target.dataset.key;
    const template = this.measurementTemplates[key];
    if (!template) return;

    const applyEffects = getMesuredTemplateEffects(this.item);
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

      const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
      if (autoRollLevelCheck) this._rollLevelCheck(false);
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
  
  async _onToggle(path, which, max, min, dataset) {
    if (path.includes("system.enhancements")) {
      await this._onToggleEnhancement(path, which, max, min, dataset.itemId, dataset.runCheck === "true");
    }
    else if (["apForAdv", "gritForAdv"].includes(path)) {
      await this._onToggleRollLevel(path, which, max, min);
    }
    else {
      await super._onToggle(path, which, max, min, dataset);
    }
  }

  async _onToggleEnhancement(path, which, max, min, itemId, runCheck) {
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

    const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
    if (autoRollLevelCheck && runCheck) this._rollLevelCheck(false);
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

/** @deprecated since v0.9.8 until 0.10.0 */
export async function promptRoll(actor, details, quickRoll=false) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.promptRoll' method is deprecated and will be removed in the later system version. Use 'DC20.dialog.RollDialog.open' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await RollDialog.open(actor, details, {quickRoll: quickRoll});
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function promptItemRoll(actor, item, quickRoll=false) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.promptItemRoll' method is deprecated and will be removed in the later system version. Use 'DC20.dialog.RollDialog.open' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await RollDialog.open(actor, item, {quickRoll: quickRoll});
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function promptRollToOtherPlayer(actor, details, waitForRoll=true, quickRoll=false) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.promptItemRoll' method is deprecated and will be removed in the later system version. Use 'DC20.dialog.RollDialog.open' with 'options.sendToActorOwners' provided instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await RollDialog.open(actor, details, {sendToActorOwners: true, quickRoll: quickRoll});
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function promptItemRollToOtherPlayer(actor, item, waitForRoll=true, quickRoll=false) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.promptItemRollToOtherPlayer' method is deprecated and will be removed in the later system version. Use 'DC20.dialog.RollDialog.open' with 'options.sendToActorOwners' provided instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await RollDialog.open(actor, item, {sendToActorOwners: true, quickRoll: quickRoll});
}