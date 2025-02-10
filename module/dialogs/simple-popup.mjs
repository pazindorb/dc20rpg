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
      classes: ["dc20rpg", "dialog", "force-top"]
    });
  }

  getData() {
    if (this.popupType === "info" || this.popupType === "drop") {
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
    html.find('.confirm-input-all').click(ev => this._onConfirmAll(html.find(".input-popup-selector"), datasetOf(ev)));
    html.find('.confirm-input').click(ev => this._onConfirm(html.find(".input-popup-selector").val(), datasetOf(ev)));
    html.find('.confirm-select').click(ev => this._onConfirm(html.find(".select-popup-selector").val(), datasetOf(ev)));
    html.find('.confirm-yes').click(ev => this._onConfirm(true, datasetOf(ev)));
    html.find('.confirm-no').click(ev => this._onConfirm(false, datasetOf(ev)));
    if(this.popupType === "drop") html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  async _onConfirmAll(element) {
    const values = [];
    element.each(function() {values.push($(this).val()); });
    this.promiseResolve(values);
    this.close();
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

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    this.promiseResolve(droppedObject.uuid);
    this.close();
  }
}

export async function getSimplePopup(popupType, data={}) {
  return await SimplePopup.create(popupType, data, {title: "Popup"});
}