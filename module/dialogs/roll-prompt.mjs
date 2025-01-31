import { heldAction } from "../helpers/actors/actions.mjs";
import { collectExpectedUsageCost, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { rollFromItem, rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { getTokensInsideMeasurementTemplate } from "../helpers/actors/tokens.mjs";
import { reloadWeapon } from "../helpers/items/itemConfig.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { runTemporaryItemMacro } from "../helpers/macros.mjs";
import { advForApChange, runItemRollLevelCheck, runSheetRollLevelCheck } from "../helpers/rollLevel.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { enhTooltip, hideTooltip, itemTooltip } from "../helpers/tooltip.mjs";
import { changeActivableProperty, mapToObject, toggleUpOrDown } from "../helpers/utils.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { prepareItemFormulas } from "../sheets/actor-sheet/items.mjs";
import { getSimplePopup } from "./simple-popup.mjs";
import { getTokenSelector } from "./token-selector.mjs";

/**
 * Dialog window for rolling saves and check requested by the DM.
 */
export class RollPromptDialog extends Dialog {

  constructor(actor, data, quickRoll, fromGmHelp, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    // We want to clear effects to remove when we open new roll prompt
    actor.update({["flags.dc20rpg.effectsToRemoveAfterRoll"]: []}); 
    if (data.documentName === "Item") {
      this.itemRoll = true;
      this.item = data;
      this.menuOwner = this.item;
      if (!fromGmHelp) {
        this._prepareAttackRange();
        this._prepareHeldAction();
      } 
      this._prepareMeasurementTemplates();
    }
    else {
      this.itemRoll = false;
      this.details = data;
      this.menuOwner = this.actor;
    }
    this.promiseResolve = null;

    const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
    if (autoRollLevelCheck && !fromGmHelp) {
      this._rollRollLevelCheck(false, quickRoll);
    }
    else {
      this.rollLevelChecked = fromGmHelp;
      if (quickRoll) this._onRoll();
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"],
      width: 500
    });
  }

  /** @override */
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
      ui.notifications.notify("No GM currently active");
      return;
    }

    emitSystemEvent("askGmForHelp", {
      actorId: this.actor._id,
      itemId: this.item._id,
      gmUserId: gm._id
    });
  }

  /** @override */
  get template() {
    const sheetType = this.itemRoll ? "item" : "sheet"
    return `systems/dc20rpg/templates/dialogs/roll-prompt/${sheetType}-roll-prompt.hbs`;
  }

  _prepareMeasurementTemplates() {
    const areas = this.item.system.target?.areas;
    if (!areas) return;
    const measurementTemplates = DC20RpgMeasuredTemplate.mapItemAreasToMeasuredTemplates(areas);
    if (Object.keys(measurementTemplates).length > 0) {
      this.measurementTemplates = measurementTemplates;
    }
  }

  async _prepareAttackRange() {
    let rangeType = false; 
    const system = this.item.system;
    if (system.actionType === "attack") rangeType = system.attackFormula.rangeType;
    this.item.flags.dc20rpg.rollMenu.rangeType = rangeType;
    await this.item.update({["flags.dc20rpg.rollMenu.rangeType"]: rangeType});
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
    await this.item.update({["flags.dc20rpg.rollMenu"]: {
      apCost: actionHeld.apForAdv,
      adv: actionHeld.apForAdv
    }});
    this.render();
  }

  getData() {
    if (this.itemRoll) return this._getDataForItemRoll();
    else return this._getDataForSheetRoll();
  }

  _getDataForSheetRoll() {
    return {
      rollDetails: this.details,
      ...this.actor,
      itemRoll: this.itemRoll,
      rollLevelChecked: this.rollLevelChecked
    };
  }

  _getDataForItemRoll() {
    const itemRollDetails = {
      label: `Roll Item: ${this.item.name}`,
    }

    prepareItemFormulas(this.item, this.actor);
    const [expectedCosts, expectedCharges, chargesFromOtherItems] = collectExpectedUsageCost(this.actor, this.item);
    if (expectedCosts.actionPoint === 0) expectedCosts.actionPoint = undefined;
    const rollsHeldAction = this.actor.flags.dc20rpg.actionHeld?.rollsHeldAction;
    return {
      rollDetails: itemRollDetails,
      item: this.item,
      itemRoll: this.itemRoll,
      expectedCosts: expectedCosts,
      expectedCharges: expectedCharges,
      chargesFromOtherItems: chargesFromOtherItems,
      otherItemUse: this._prepareOtherItemUse(),
      enhancements: mapToObject(this.item.allEnhancements),
      rollsHeldAction: rollsHeldAction,
      rollLevelChecked: this.rollLevelChecked,
      measurementTemplates: this.measurementTemplates
    };
  }

  _prepareOtherItemUse() {
    const otherItemUse = this.item.system?.costs?.otherItem;
    const otherItem = this.actor.items.get(otherItemUse?.itemId);
    if (otherItem && otherItemUse.amountConsumed > 0) {
      const use = {
        name: otherItem.name,
        image: otherItem.img,
        amount: otherItemUse.amountConsumed,
        consumeCharge: otherItemUse.consumeCharge
      }
      return use;
    }
    return null
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.held-action').click(ev => this._onHeldAction(ev))
    html.find('.rollable').click(ev => this._onRoll(ev));
    html.find('.roll-level-check').click(ev => this._onRollLevelCheck(ev));
    html.find('.last-roll-level-check').click(ev => this._displayRollLevelCheckResult());
    html.find('.roll-range').click(() => this._onRangeChange());
    html.find('.ap-for-adv').mousedown(async ev => {
      await advForApChange(this.menuOwner, ev.which);
      this.render();
    });
    html.find('.toggle-numeric').mousedown(async ev => {
      await toggleUpOrDown(datasetOf(ev).path, ev.which, this.menuOwner, 9, 0);
      this.render();
    });
    html.find(".item-activable").click(async ev => {
      await changeActivableProperty(datasetOf(ev).path, this.item);
      this.render();
    });
    html.find(".activable").click(async ev => {
      await changeActivableProperty(datasetOf(ev).path, this.actor);
      this.render();
    });
    html.find('.reload-weapon').click(async () => {
      await reloadWeapon(this.item, this.actor);
      this.render();
    });
    html.find('.enh-use-number').mousedown(async ev => {
      await toggleUpOrDown(datasetOf(ev).path, ev.which, this._getItem(datasetOf(ev).itemId), 9, 0);
      const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
      if (autoRollLevelCheck && datasetOf(ev).runCheck === "true") this._rollRollLevelCheck(false);
      this.render();
    });
    html.find('.enh-tooltip').hover(ev => enhTooltip(this._getItem(datasetOf(ev).itemId), datasetOf(ev).enhKey, ev, html), ev => hideTooltip(ev, html));
    html.find('.item-tooltip').hover(ev => itemTooltip(this._getItem(datasetOf(ev).itemId), false, ev, html), ev => hideTooltip(ev, html));
    html.find('.create-template').click(ev => this._onCreateMeasuredTemplate(datasetOf(ev).key));
    html.find('.add-template-space').click(ev => this._onAddTemplateSpace(datasetOf(ev).key));
    html.find('.reduce-template-space').click(ev => this._onReduceTemplateSpace(datasetOf(ev).key));
  }

  _getItem(itemId) {
    let item = this.item;
    if (itemId !== this.item._id) item = getItemFromActor(itemId, this.actor);
    return item;
  }

  async _onRangeChange() {
    const current = this.item.flags.dc20rpg.rollMenu.rangeType;
    let newRange = current === "melee" ? "ranged" : "melee";
    await this.item.update({["flags.dc20rpg.rollMenu.rangeType"]: newRange});
    const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
    if (autoRollLevelCheck) this._rollRollLevelCheck(false);
    else this.render();
  }

  _onHeldAction(event) {
    event.preventDefault();
    if (!this.itemRoll) return;
    heldAction(this.item, this.actor);
    this.promiseResolve(null);
    this.close();
  }

  async _onRoll(event) {
    if(event) event.preventDefault();
    let roll = null;
    if (this.itemRoll) {
      roll = await rollFromItem(this.item._id, this.actor);
    }

    else if (subtractAP(this.actor, this.details.apCost)) {
      roll = await rollFromSheet(this.actor, this.details);
    }
    this.promiseResolve(roll);
    this.close();
  }

  async _onRollLevelCheck(event) {
    event.preventDefault();
    this._rollRollLevelCheck(true);
  }

  _displayRollLevelCheckResult(result) {
    if (result) return getSimplePopup("info", {information: result, header: "Expected Roll Level"});
    if (this.rollLevelCheckResult) return getSimplePopup("info", {information: this.rollLevelCheckResult, header: "Expected Roll Level"})
  }

  async _rollRollLevelCheck(display, quickRoll) {
    this.rollLevelChecked = true;
    let result = [];
    if (this.itemRoll) result = await runItemRollLevelCheck(this.item, this.actor);
    else result = await runSheetRollLevelCheck(this.details, this.actor);

    if (quickRoll) return this._onRoll();
    
    if (result[result.length -1] === "MANUAL_ACTION_REQUIRED") {
      result.pop();
      display = true; // For manual actions we always want to display this popup
    }

    if (display) this._displayRollLevelCheckResult(result);
    this.rollLevelCheckResult = result;
    this.render()
  }

    async _onCreateMeasuredTemplate(key) {
      const template = this.measurementTemplates[key];
      if (!template) return;
  
      const measuredTemplates = await DC20RpgMeasuredTemplate.createMeasuredTemplates(template, () => this.render());
      let tokens = {};
      for (let i = 0; i < measuredTemplates.length; i++) {
        const collectedTokens = getTokensInsideMeasurementTemplate(measuredTemplates[i]);
        tokens = {
          ...tokens,
          ...collectedTokens
        }
      }
      
      if (Object.keys(tokens).length > 0) tokens = await getTokenSelector(tokens);
      if (Object.keys(tokens).length > 0) {
        const user = game.user;
        if (!user) return;

        user.targets.forEach(target => {
          target.setTarget(false, { user: user });
        });

        for (const token of Object.values(tokens)) {
          token.setTarget(true, { user: user, releaseOthers: false });
        }

        const autoRollLevelCheck = game.settings.get("dc20rpg", "autoRollLevelCheck");
        if (autoRollLevelCheck) this._rollRollLevelCheck(false);
      }
    }
  
    _onAddTemplateSpace(key) {
      const template = this.measurementTemplates[key];
      if (!template) return;
      DC20RpgMeasuredTemplate.changeTemplateSpaces(template, 1);
      this.render()
    }
  
    _onReduceTemplateSpace(key) {
      const template = this.measurementTemplates[key];
      if (!template) return;
      DC20RpgMeasuredTemplate.changeTemplateSpaces(template, -1);
      this.render()
    }

  static async create(actor, data, quickRoll, fromGmHelp, dialogData = {}, options = {}) {
    const prompt = new RollPromptDialog(actor, data, quickRoll, fromGmHelp, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      if (!quickRoll) prompt.render(true); // We dont want to render dialog for auto rolls
    });
  }

  /** @override */
  close(options) {
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
      emitSystemEvent("rollPromptRerendered", payload);
    }
  }
}

/**
 * Asks player triggering action to roll.
 */
export async function promptRoll(actor, details, quickRoll=false, fromGmHelp=false) {
  return await RollPromptDialog.create(actor, details, quickRoll, fromGmHelp, {title: `Roll ${details.label}`});
}

/**
 * Asks player triggering action to roll item.
 */
export async function promptItemRoll(actor, item, quickRoll=false, fromGmHelp=false) {
  await runTemporaryItemMacro(item, "onRollPrompt", actor);
  const quick = quickRoll || item.system.quickRoll;
  return await RollPromptDialog.create(actor, item, quick, fromGmHelp, {title: `Roll ${item.name}`})
}

/**
 * Asks actor owners to roll. If there are multiple owners only first response will be considered.
 * If there is no active actor owner DM will make that roll.
 */
export async function promptRollToOtherPlayer(actor, details, waitForRoll = true, quickRoll=false) {

  // If there is no active actor owner DM will make a roll
  if (_noUserToRoll(actor)) {
    if (waitForRoll) {
      return await promptRoll(actor, details, quickRoll, false);
    }
    else {
      promptRoll(actor, details, quickRoll, false);
      return;
    }
  }

  const payload = {
    actorId: actor.id,
    details: details,
    isToken: actor.isToken
  };
  if (actor.isToken) payload.tokenId = actor.token.id;

  if (waitForRoll) {
    const validationData = {emmiterId: game.user.id, actorId: actor.id}
    const rollPromise = responseListener("rollPromptResult", validationData);
    emitSystemEvent("rollPrompt", payload);
    const roll = await rollPromise;
    return roll;
  }
  else {
    emitSystemEvent("rollPrompt", payload);
    return;
  }
}

function _noUserToRoll(actor) {
  const owners = Object.entries(actor.ownership)
    .filter(([ownerId, ownType]) => ownerId !== game.user.id)
    .filter(([ownerId, ownType]) => ownerId !== "default")
    .filter(([ownerId, ownType]) => ownType === 3)

  let noUserToRoll = true;
  owners.forEach(ownership => {
    const ownerId = ownership[0];
    const owner = game.users.get(ownerId);
    if (owner && owner.active) noUserToRoll = false;
  })
  return noUserToRoll;
}