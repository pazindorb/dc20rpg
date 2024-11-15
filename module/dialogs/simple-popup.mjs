import { datasetOf } from "../helpers/listenerEvents.mjs";


export class SimplePopup extends Dialog {

  constructor(popupType, data, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.popupType = popupType;
    this.data = data;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/simple-popup.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    if (this.popupType === "info") {
      const information = this.data.information; 
      if (information && information.constructor !== Array) {
        this.data.information = [this.data.information];
      }
    }
    return {
      ...this.data,
      popupType: this.popupType
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.confirm-input').click(ev => this._onConfirm($(".input-popup-selector").val(), datasetOf(ev)));
    html.find('.confirm-select').click(ev => this._onConfirm($(".select-popup-selector").val(), datasetOf(ev)));
    html.find('.confirm-yes').click(ev => this._onConfirm(true, datasetOf(ev)));
    html.find('.confirm-no').click(ev => this._onConfirm(false, datasetOf(ev)));
  }

  async _onConfirm(outome) {
    this.promiseResolve(outome);
    this.close();
  }

  static async create(popupType, data={}, dialogData = {}, options = {}) {
    const prompt = new SimplePopup(popupType, data, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(false);
    super.close(options);
  }
}

export async function getSimplePopup(popupType, data={}) {
  return await SimplePopup.create(popupType, data, {title: "Popup"});
}