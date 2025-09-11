import { DC20Dialog } from "./dc20Dialog.mjs";

export class TokenSelector extends DC20Dialog {

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/token-selector.hbs",
    }
  };

  constructor(tokens, label, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.tokens = tokens;
    this.label = label;
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Token Selector";
    initialized.window.icon = "fa-solid fa-users-viewfinder";
    initialized.position.width = 450;

    initialized.actions.confirm = this._onConfirm;
    initialized.actions.ping = this._onPingToken;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.tokens = this.tokens;
    context.label = this.label;
    return context;
  }

  _onPingToken(event, target) {
    const token = this.tokens[target.dataset.id];
    if (token) canvas.ping({x: token.center.x, y: token.center.y});
  }

  _onConfirm(event) {
    event.preventDefault();
    const selectedTokens = [];
    Object.values(this.tokens).forEach((token) => {
      if (token.selectedToken) selectedTokens.push(token);
    });
    this.promiseResolve(selectedTokens);
    this.close();
  }

  static async open(tokens, label, options={}) {
    const dialog = new TokenSelector(tokens, label, options);
    return new Promise((resolve) => {
      dialog.promiseResolve = resolve;
      dialog.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve([]);
    super.close(options);
  }
}