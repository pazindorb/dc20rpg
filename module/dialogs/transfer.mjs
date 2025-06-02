import { updateActor } from "../helpers/actors/actorOperations.mjs";
import { createItemOnActor, deleteItemFromActor } from "../helpers/actors/itemsOnActor.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

export class TransferDialog extends DC20Dialog {

  constructor(fixedTrader, flexibleTraders, options = {}) {
    super(options);
    this.fixedTrader = fixedTrader;
    this.flexibleTraders = Object.fromEntries(flexibleTraders.map(actor => [actor.id, actor.name]));
    this._prepareTrader(this.fixedTrader);
    this.lockFixedTrader = options.lockFixedTrader;
    this.lockFlexibleTrader = options.lockFlexibleTrader;
    this.currencyOnly = options.currencyOnly;
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/transfer-dialog.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Transfer";
    initialized.window.icon = "fa-solid fa-money-bill-transfer";
    initialized.position.width = 520;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.flexibleTraders = this.flexibleTraders;
    context.selectedActor = this.selectedActor;
    context.fixedTrader = this.fixedTrader;
    context.flexibleTrader = this.flexibleTrader;
    context.currencyOnly = this.currencyOnly;
    context.lockFixedTrader = this.lockFixedTrader;
    context.lockFlexibleTrader = this.lockFlexibleTrader;
    return context;
  }

  _prepareTrader(trader) {
    if (!trader) return;

    trader.transfer = {
      currency: {
        cp: { value: 0, max: trader.system.currency.cp },
        sp: { value: 0, max: trader.system.currency.sp },
        gp: { value: 0, max: trader.system.currency.gp },
        pp: { value: 0, max: trader.system.currency.pp },
      },
      items: {}
    }
  }

  _onClickAction(event, target) {
    event.stopPropagation();
    event.preventDefault();

    const action = target.dataset.action;
    switch (action) {
      case "transfer": 
        this._onTransferAction();
        break;
      case "removeItem":
        this._onRemoveItem(target.dataset);
    }
  }

  async _onTransferAction() {
    // Transfer Currency
    const fixed = this.fixedTrader.transfer.currency;
    const flexible = this.flexibleTrader.transfer.currency;
    const currencyToTransfer = {
      cp: fixed.cp.value - flexible.cp.value,
      sp: fixed.sp.value - flexible.sp.value,
      gp: fixed.gp.value - flexible.gp.value,
      pp: fixed.pp.value - flexible.pp.value,
    }
    await currencyTransfer(this.fixedTrader, this.flexibleTrader, currencyToTransfer, false);

    // Transfer Items
    await this._transferItems(this.fixedTrader, this.flexibleTrader);
    await this._transferItems(this.flexibleTrader, this.fixedTrader);
    this.close();
  }

  async _transferItems(from, to) {
    const items = from.transfer.items;
    for (const item of Object.values(items)) {
      await deleteItemFromActor(item.id, from);
      await createItemOnActor(to, item.toObject());
    }
  }

  async _onRemoveItem(dataset) {
    const itemId = dataset.itemId;
    const trader = dataset.trader === "flexible" ? this.flexibleTrader : this.fixedTrader;
    delete trader.transfer.items[itemId];
    this.render();
  }

  /** @override */
  _onChangeString(path, value, dataset) {
    if (path === "selectedActor") {
      delete this.flexibleTrader?.transfer; // Clear current transfer data
      this.flexibleTrader = game.actors.get(value);
      this._prepareTrader(this.flexibleTrader);
      this._prepareTrader(this.fixedTrader);
    }
    super._onChangeString(path, value, dataset);
  }
  
  /** @override */
  _onChangeNumeric(path, value, nullable, dataset) {
    const limit = parseInt(dataset.limit);
    value = parseInt(value);
    if (value > limit) value = limit;
    super._onChangeNumeric(path, value, nullable, dataset);
  }

  async _onDrop(event) {
    if (this.currencyOnly) return;
    
    const dropped = await super._onDrop(event);
    if (dropped.type !== "Item") return;
    const item = await Item.fromDropData(dropped);
    if (!item) return;

    if (item.uuid.includes(this.fixedTrader.uuid)) {
      this.fixedTrader.transfer.items[item.id] = item;
    }
    else if (item.uuid.includes(this.flexibleTrader.uuid)) {
      this.flexibleTrader.transfer.items[item.id] = item;
    }
    this.render();
  }

  close() {
    // Clear transfer data
    delete this.fixedTrader?.transfer;
    delete this.flexibleTrader?.transfer;
    super.close();
  }
}

/**
 * Opens Transfer Dialog popup.
 */
export function createTransferDialog(fixedTrader, flexibleTraders, options={}) {
  new TransferDialog(fixedTrader, flexibleTraders, options).render(true);
}

export function calculateItemsCost(items, priceMultiplier=1) {
  const cost = {cp: 0, sp: 0, gp: 0, pp: 0};
  for (const item of items) {
    const price = item.system.price;
    const quantity = item.system.quantity;
    const finalCost = quantity * price.value * priceMultiplier;

    if (Number.isInteger(finalCost)) cost[price.currency] += finalCost;
    else {
      let currency = {cp: 0, sp: 0, gp: 0, pp: 0};
      currency[price.currency] = finalCost;
      const costInGold = _exchangeToGold(_exchangeToCopper(currency));
      cost.cp = costInGold.cp;
      cost.sp = costInGold.sp;
      cost.gp = costInGold.gp;
      cost.pp = costInGold.pp;
    }
  }
  return cost;
}

export async function currencyTransfer(from, to, currency, allowExchange) {
  if (_canSubtractCurrency(from.system.currency, currency)) {
    await _moveCurrency(from, to, currency);
    return true;
  }
  if (!allowExchange) return false;

  const fromCopper = _exchangeToCopper(from.system.currency);
  const transferCopper = _exchangeToCopper(currency);
  if (_canSubtractCurrency(fromCopper, transferCopper)) {
    from.system.currency = fromCopper;
    currency = transferCopper;
    await _moveCurrency(from, to, currency, true);
    return true;
  }
  return false;
}

function _canSubtractCurrency(current, subtracted) {
  if ((current.cp - subtracted.cp) < 0) return false;
  if ((current.sp - subtracted.sp) < 0) return false;
  if ((current.gp - subtracted.gp) < 0) return false;
  if ((current.pp - subtracted.pp) < 0) return false;
  return true;
}

function _exchangeToCopper(currency) {
  let newCopper = 0;
  newCopper += currency.cp;
  newCopper += currency.sp * 10;
  newCopper += currency.gp * 100;
  newCopper += currency.pp * 1000;
  return {
    cp: Math.round(newCopper), // Get rid of money bellow 1 copper
    sp: 0,
    gp: 0,
    pp: 0
  }
}

function _exchangeToGold(currency) {
  const copper = currency.cp;
  const newGold = Math.floor(copper/100);
  let rest = copper % 100;
  const newSilver = Math.floor(rest/10);
  const newCopper = rest % 10;

  return {
    cp: newCopper,
    sp: newSilver,
    gp: newGold,
    pp: currency.pp
  }
}

async function _moveCurrency(from, to, currency, exchangeToGold) {
  let fromWallet = from.system.currency;
  const toWallet = to.system.currency;

  if (exchangeToGold) {
    fromWallet = _exchangeToGold(fromWallet);
    currency = _exchangeToGold(currency);
  }

  fromWallet.cp -= currency.cp;
  fromWallet.sp -= currency.sp;
  fromWallet.gp -= currency.gp;
  fromWallet.pp -= currency.pp;
  toWallet.cp += currency.cp;
  toWallet.sp += currency.sp;
  toWallet.gp += currency.gp;
  toWallet.pp += currency.pp;

  await updateActor(from, {["system.currency"]: fromWallet});
  await updateActor(to, {["system.currency"]: toWallet}); 
}