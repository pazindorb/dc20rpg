import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { prepareActionRollDetails } from "../helpers/actors/actions.mjs";
import { collectExpectedUsageCost, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { rollForInitiative, rollFromItem, rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { reloadWeapon } from "../helpers/items/itemConfig.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { advForApChange, runItemRollLevelCheck, runSheetRollLevelCheck } from "../helpers/rollLevel.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { enhTooltip, hideTooltip, itemTooltip } from "../helpers/tooltip.mjs";
import { changeActivableProperty, toggleUpOrDown } from "../helpers/utils.mjs";
import { prepareItemFormulasAndEnhancements } from "../sheets/actor-sheet/items.mjs";

/**
 * Dialog window for rolling saves and check requested by the DM.
 */
export class RollPromptDialog extends Dialog {

  constructor(actor, data, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    if (data.documentName === "Item") {
      this.itemRoll = true;
      this.item = data;
      this.menuOwner = this.item;
    }
    else {
      this.itemRoll = false;
      this.details = data;
      this.menuOwner = this.actor;
    }
    this.promiseResolve = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"],
      width: 500
    });
  }

    /** @override */
    get template() {
      const sheetType = this.itemRoll ? "item" : "sheet"
      return `systems/dc20rpg/templates/dialogs/roll-prompt/${sheetType}-roll-prompt.hbs`;
    }

  getData() {
    if (this.itemRoll) return this._getDataForItemRoll();
    else return this._getDataForSheetRoll();
  }

  _getDataForSheetRoll() {
    return {
      rollDetails: this.details,
      ...this.actor,
      itemRoll: this.itemRoll
    };
  }

  _getDataForItemRoll() {
    const itemRollDetails = {
      label: `Roll Item: ${this.item.name}`,
    }

    prepareItemFormulasAndEnhancements(this.item, this.actor);
    const [expectedCosts, expectedCharges] = collectExpectedUsageCost(this.actor, this.item);
    if (expectedCosts.actionPoint === 0) expectedCosts.actionPoint = undefined;
    return {
      rollDetails: itemRollDetails,
      item: this.item,
      itemRoll: this.itemRoll,
      expectedCosts: expectedCosts,
      expectedCharges: expectedCharges
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.rollable').click(ev => this._onRoll(ev));
    html.find('.roll-level-check').click(ev => this._onRollLevelCheck(ev));
    html.find('.ap-for-adv').mousedown(async ev => {
      await advForApChange(this.menuOwner, ev.which);
      this.render(true);
    });
    html.find('.toggle-numeric').mousedown(async ev => {
      await toggleUpOrDown(datasetOf(ev).path, ev.which, this.menuOwner, 9, 0);
      this.render(true);
    });
    html.find(".item-activable").click(async ev => {
      await changeActivableProperty(datasetOf(ev).path, this.item);
      this.render(true);
    });
    html.find('.reload-weapon').click(async () => {
      await reloadWeapon(this.item, this.actor);
      this.render(true);
    });
    html.find('.enh-use-number').mousedown(async ev => {
      await toggleUpOrDown(datasetOf(ev).path, ev.which, this._getItem(datasetOf(ev).itemId), 9, 0)
      this.render(true);
    });
    html.find('.enh-tooltip').hover(ev => enhTooltip(this._getItem(datasetOf(ev).itemId), datasetOf(ev).enhKey, ev, html), ev => hideTooltip(ev, html));
    html.find('.item-tooltip').hover(ev => itemTooltip(this._getItem(datasetOf(ev).itemId), false, ev, html), ev => hideTooltip(ev, html));
  }

  _getItem(itemId) {
    let item = this.item;
    if (itemId !== this.item._id) item = getItemFromActor(itemId, this.actor);
    return item;
  }

  async _onRoll(event) {
    event.preventDefault();
    let roll = null;
    if (this.itemRoll) {
      roll = await rollFromItem(this.item._id, this.actor);
    }

    else if (subtractAP(this.actor, this.details.apCost)) {
      if (this.actor.flags.dc20rpg.rollMenu.initiative) rollForInitiative(this.actor, this.details);
      else roll = await rollFromSheet(this.actor, this.details); 
    }
    this.promiseResolve(roll);
    this.close();
  }

  async _onRollLevelCheck(event) {
    event.preventDefault();
    if (this.itemRoll) await runItemRollLevelCheck(this.item, this.actor);
    else await runSheetRollLevelCheck(this.details, this.actor);
    this.render(true);
  }

  static async create(actor, data, dialogData = {}, options = {}) {
    const prompt = new RollPromptDialog(actor, data, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}

/**
 * Asks player triggering action to roll.
 */
export async function promptRoll(actor, details) {
  return await RollPromptDialog.create(actor, details, {title: `Roll ${details.label}`});
}

export async function promptActionRoll(actor, actionKey) { 
  const details = prepareActionRollDetails(actionKey);
  details.image = actor.img;

  if (details.applyEffect) {
    const effect = details.applyEffect;
    effect.origin= actor.uuid,
    actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }

  if (details.roll) {
    return await promptRoll(actor, details);
  }
  else {
    if (!subtractAP(actor, details.apCost)) return;
    sendDescriptionToChat(actor, {
      rollTitle: details.label,
      image: actor.img,
      description: details.description,
      fullEffect: details.fullEffect
    });
  }
}

/**
 * Asks player triggering action to roll item.
 */
export async function promptItemRoll(actor, item) {
  return await RollPromptDialog.create(actor, item, {title: `Roll ${item.name}`})
}

/**
 * Asks actor owners to roll. If there are multiple owners only first response will be considered.
 * If there is no active actor owner DM will make that roll.
 */
export async function promptRollToOtherPlayer(actor, details, waitForRoll = true) {

  // If there is no active actor owner DM will make a roll
  if (_noUserToRoll(actor)) {
    if (waitForRoll) {
      return await promptRoll(actor, details);
    }
    else {
      promptRoll(actor, details);
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
    const rollPromise = responseListener("rollPromptResult", game.user.id);
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