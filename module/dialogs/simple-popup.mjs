import { datasetOf } from "../helpers/listenerEvents.mjs";
import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import { generateKey } from "../helpers/utils.mjs";


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
    if (this.promiseResolve) this.promiseResolve(null);
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

/**
 * Creates simple dialog for player that triggers it. Calling method can await for results of that dialog.
 * There are few popupType options to use when creating that dialog, deppending on the type data object might differ:
 * - "info" - data = {header: String, information: Array[String]} - display some information to the caller
 * - "select" - data = {header: String, selectOptions: Object} - caller can select one of the options that will be returned by dialog
 * - "input" - data = {header: String} - caller can provide text that will be returned by dialog
 * - "confirm" - data = {header: String} - caller can confirm or deny, result will be returned by dialog
 */
export async function getSimplePopup(popupType, popupData={}) {
  return await SimplePopup.create(popupType, popupData, {title: "Popup"});
}

/**
 * Creates simple dialog for players with specific userIds[Array]. It will wait only for the first answer.
 * For more information take a look at getSimplePopup documentation
 */
export async function sendSimplePopupToUsers(userIds, popupType, popupData={}) {
  const signature = generateKey();
  const payload = {
    popupType: popupType,
    popupData: popupData,
    userIds: userIds,
    signature: signature
  };
  const validationData = {emmiterId: game.user.id, signature: signature}
  const simplePopupResult = responseListener("simplePopupResult", validationData);
  emitSystemEvent("simplePopup", payload);
  const response = await simplePopupResult;
  return response;
}

export async function sendSimplePopupToActorOwners(actor, popupType, popupData={}) {
  const actorOwners = getIdsOfActiveActorOwners(actor, false);
  if (actorOwners.length > 0) {
    if (actorOwners.find(ownerId => game.user.id === ownerId)) return await getSimplePopup(popupType, popupData);
    return await sendSimplePopupToUsers(actorOwners, popupType, popupData);
  }
  return await getSimplePopup(popupType, popupData);
}