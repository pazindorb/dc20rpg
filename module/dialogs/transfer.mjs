import { getActorsForUser } from "../helpers/users.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

export class TransferDialog extends DC20Dialog {

  constructor(fixedTrader, lockFixedTrader, options = {}) {
    super(options);
    this.fixedTrader = fixedTrader;
    this._prepareCurrency(this.fixedTrader);
    this.lockFixedTrader = lockFixedTrader;
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

    context.actors = this._collectMyActors();
    context.selectedActor = this.selectedActor;
    context.fixedTrader = this.fixedTrader;
    context.lockFixedTrader = this.lockFixedTrader;
    context.flexibleTrader = this.flexibleTrader;

    return context;
  }

  _collectMyActors() {
    const actors = getActorsForUser(true);
    return Object.fromEntries(actors.map(actor => [actor.id, actor.name]));
  }

  _prepareCurrency(trader) {
    if (!trader) return;
    trader.currency = {
      cp: {
        value: 0,
        max: trader.system.currency.cp
      },
      sp: {
        value: 0,
        max: trader.system.currency.sp
      },
      gp: {
        value: 0,
        max: trader.system.currency.gp
      },
      pp: {
        value: 0,
        max: trader.system.currency.pp
      },
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
    }
  }

  async _onTransferAction() {
    const fixedTraderCurrency = this._currencyAfterTransfer(this.fixedTrader, this.flexibleTrader);
    const flexibleTraderCurrency = this._currencyAfterTransfer(this.flexibleTrader, this.fixedTrader);
    
    await this.fixedTrader.update({["system.currency"]: fixedTraderCurrency});
    await this.flexibleTrader.update({["system.currency"]: flexibleTraderCurrency});

    delete this.fixedTrader.currency; // Clean trader object;
    delete this.flexibleTrader.currency; // Clean trader object;
    this.close();
  }

  _currencyAfterTransfer(from, to) {
    return {
      cp: from.currency.cp.max - from.currency.cp.value + to.currency.cp.value,
      sp: from.currency.sp.max - from.currency.sp.value + to.currency.sp.value,
      gp: from.currency.gp.max - from.currency.gp.value + to.currency.gp.value,
      pp: from.currency.pp.max - from.currency.pp.value + to.currency.pp.value,
    }
  }

  /** @override */
  _onChangeString(path, value, dataset) {
    if (path === "selectedActor") {
      this.flexibleTrader = game.actors.get(value);
      this._prepareCurrency(this.flexibleTrader);
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
}

/**
 * Opens Transfer Dialog popup.
 */
export function createTransferDialog(fixedTrader, lockFixedTrader) {
  new TransferDialog(fixedTrader, lockFixedTrader).render(true);
}