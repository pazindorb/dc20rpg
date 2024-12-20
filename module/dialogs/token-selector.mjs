import { datasetOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class TokenSelector extends Dialog {

  constructor(tokens, dialogData = {}, options = {}) {
    super(dialogData, options);
    Object.values(tokens).forEach(token => token.selectedToken = true);
    this.tokens = tokens;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/token-selector.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return {
      tokens: this.tokens
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.confirm-selection').click(ev => this._onConfirm(datasetOf(ev)));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find('.ping-token').click(ev => this._onPingToken(datasetOf(ev).id));
  }

  _onActivable(path) {
    let value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render(true);
  }

  _onPingToken(id) {
    const token = this.tokens[id];
    if (token) canvas.ping({x: token.center.x, y: token.center.y});
  }

  async _onConfirm() {
    const selectedTokens = {};
    Object.entries(this.tokens).forEach(([id, token]) => {
      if (token.selectedToken) selectedTokens[id] = token;
    });
    this.promiseResolve(selectedTokens);
    this.close();
  }

  static async create(tokens, dialogData = {}, options = {}) {
    const dialog = new TokenSelector(tokens, dialogData, options);
    return new Promise((resolve) => {
      dialog.promiseResolve = resolve;
      dialog.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve({});
    super.close(options);
  }
}

export async function getTokenSelector(tokens) {
  return await TokenSelector.create(tokens, {title: "Token Selector"});
}