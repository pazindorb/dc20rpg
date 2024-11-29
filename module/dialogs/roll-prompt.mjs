import { collectExpectedUsageCost, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { getItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { rollForInitiative, rollFromItem, rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { reloadWeapon } from "../helpers/items/itemConfig.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { advForApChange, runItemRollLevelCheck, runSheetRollLevelCheck } from "../helpers/rollLevel.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { enhTooltip, hideTooltip, itemTooltip } from "../helpers/tooltip.mjs";
import { changeActivableProperty, mapToObject, toggleUpOrDown } from "../helpers/utils.mjs";
import { prepareItemFormulas } from "../sheets/actor-sheet/items.mjs";

/**
 * Dialog window for rolling saves and check requested by the DM.
 */
export class RollPromptDialog extends Dialog {

  constructor(actor, data, quickRoll, dialogData = {}, options = {}) {
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

    if (quickRoll) {
      this._onRoll();
    }
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

    prepareItemFormulas(this.item, this.actor);
    const [expectedCosts, expectedCharges, chargesFromOtherItems] = collectExpectedUsageCost(this.actor, this.item);
    if (expectedCosts.actionPoint === 0) expectedCosts.actionPoint = undefined;
    return {
      rollDetails: itemRollDetails,
      item: this.item,
      itemRoll: this.itemRoll,
      expectedCosts: expectedCosts,
      expectedCharges: expectedCharges,
      chargesFromOtherItems: chargesFromOtherItems,
      otherItemUse: this._prepareOtherItemUse(),
      enhancements: mapToObject(this.item.allEnhancements)
    };
  }

  _prepareOtherItemUse() {
    const otherItemUse = this.item.system?.costs?.otherItem;
    const otherItem = this.actor.items.get(otherItemUse.itemId);
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
    html.find(".activable").click(async ev => {  
      await changeActivableProperty(datasetOf(ev).path, this.actor);
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
    if(event) event.preventDefault();
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

  static async create(actor, data, quickRoll, dialogData = {}, options = {}) {
    const prompt = new RollPromptDialog(actor, data, quickRoll, dialogData, options);
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
export async function promptRoll(actor, details, quickRoll=false) {
  return await RollPromptDialog.create(actor, details, quickRoll, {title: `Roll ${details.label}`});
}

/**
 * Asks player triggering action to roll item.
 */
export async function promptItemRoll(actor, item, quickRoll=false) {
  const quick = quickRoll || item.system.quickRoll;
  return await RollPromptDialog.create(actor, item, quick, {title: `Roll ${item.name}`})
}

/**
 * Asks actor owners to roll. If there are multiple owners only first response will be considered.
 * If there is no active actor owner DM will make that roll.
 */
export async function promptRollToOtherPlayer(actor, details, waitForRoll = true, quickRoll=false) {

  // If there is no active actor owner DM will make a roll
  if (_noUserToRoll(actor)) {
    if (waitForRoll) {
      return await promptRoll(actor, details, quickRoll);
    }
    else {
      promptRoll(actor, details, quickRoll);
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