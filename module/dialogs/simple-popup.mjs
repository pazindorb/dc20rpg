import { emitSystemEvent, responseListener } from "../helpers/sockets.mjs";
import { getIdsOfActiveActorOwners } from "../helpers/users.mjs";
import { generateKey } from "../helpers/utils.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";


/**
 * Possible type examples:
 * 
 * "popupType": "info"
 * "data": {
 *  "header": String,
 *  "message": String,
 *  "information": Array[String],
 *  "hideButtons": Boolean
 * }
 * @return null
 * 
 * "popupType": "confirm"
 * "data": {
 *  "header": String,
 *  "message": String,
 *  "information": Array[String],
 *  "confirmLabel": String,
 *  "denyLabel": String
 * }
 * @return Boolean
 * 
 * "popupType": "input"
 * "data": {
 *  "header": String,
 *  "message": String,
 *  "information": Array[String],
 *  "inputs": [
 *    {
 *      "type": select/input/checkbox,
 *      "label": String,
 *      "hint": String,
 *      "options": Object[only for select type],
 *      "preselected": String/Boolean/Number
 *    }
 *  ]
 * }
 * @return Array[of output Strings]
 * 
 * "popupType": "drop"
 * "data": {
 *  "header": String,
 *  "message": String,
 *  "information": Array[String],
 * }
 * @return Object[dropped]
 */
export class SimplePopup extends DC20Dialog {

  static async input(message, options={}) {
    const data = {
      message: message,
      inputs: [{type: "input"}]
    }
    const result = await SimplePopup.open("input", data, options);
    return result ? result[0] : null;
  }

  static async select(message, selectOptions, options={}) {
    const data = {
      message: message,
      inputs: [{type: "select", options: selectOptions}],
    }
    const result = await SimplePopup.open("input", data, options);
    return result ? result[0] : null;
  }

  static async confirm(message, options={}) {
    return await SimplePopup.open("confirm", {message: message}, options);
  }

  static async info(header, information, options={}) {
    const data = {
      header: header,
      information: information
    }
    return await SimplePopup.open("info", data, options);
  }

  static async open(popupType, data, options={}) {
    // Collect actor owners
    if (options.actor && !options.users) {
      const owners = getIdsOfActiveActorOwners(options.actor, false);
      if (owners.length > 0 && !owners.find(ownerId => game.user.id === ownerId)) options.users = owners;
    }

    // Send to other users
    if (options.users) {
      const signature = generateKey();
      const payload = {
        popupType: popupType,
        popupData: data,
        popupOptions: options,
        userIds: options.users,
        signature: signature
      };
      const validationData = {emmiterId: game.user.id, signature: signature}
      const simplePopupResult = responseListener("simplePopupResult", validationData);
      emitSystemEvent("simplePopup", payload);
      const response = await simplePopupResult;
      return response;
    }

    // Open Simple Popup
    else {
      return await SimplePopup.create(popupType, data, options);
    }
  }

  static async create(popupType, data={}, options={}) {
    const prompt = new SimplePopup(popupType, data, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  static PARTS = {
    root: {
      template: "systems/dc20rpg/templates/dialogs/simple-popup.hbs",
    }
  };

  constructor(popupType, data, options = {}) {
    super(options);
    this.popupType = popupType;
    this.data = data;
    this._prepareInputs();
    this._prepareButtonLabels();
  }

  _prepareInputs() {
    if (this.popupType !== "input") return;
    for (const input of this.data.inputs) {
      if (input.preselected) input.value = input.preselected;
      else if (input.type === "checkbox") input.value = false;
      else input.value = "";
    }
  }

  _prepareButtonLabels() {
    if (this.popupType === "confirm") {
      this.data.confirmLabel = this.data.confirmLabel || game.i18n.localize("dc20rpg.dialog.popup.yes");
      this.data.denyLabel = this.data.denyLabel || game.i18n.localize("dc20rpg.dialog.popup.no");
    }
    else {
      this.data.confirmLabel = this.data.confirmLabel || game.i18n.localize("dc20rpg.dialog.popup.confirm");
    }
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Popup";
    initialized.window.icon = "fa-solid fa-comment-dots";
    initialized.position.width = 500;
    initialized.classes.push("force-top");

    initialized.actions.confirm = this._onConfirm;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.popupType = this.popupType;
    return {
      ...context,
      ...this.data
    };
  }

  _onConfirm(event, target) {
    event.preventDefault();
    switch (this.popupType) {
      case "input": 
        const values = this.data.inputs.map(input => input.value);
        this.promiseResolve(values);
        break;

      case "confirm": 
        this.promiseResolve(target.dataset.option === "confirm"); 
        break;
    }
    this.close();
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }

  async _onDrop(event) {
    if (this.popupType !== "drop") return;

    const item = await super._onDrop(event);
    if (item?.uuid) {
      this.promiseResolve(item.uuid);
      this.close();
    }
  }
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function getSimplePopup(popupType, popupData={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.getSimplePopup' method is deprecated, and will be removed in the later system version. Use 'DC20.dialog.SimplePopup.open' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await _backwardCompatibleSimplePopup(popupType, popupData);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function sendSimplePopupToUsers(userIds, popupType, popupData={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.sendSimplePopupToUsers' method is deprecated, and will be removed in the later system version. Use 'DC20.dialog.SimplePopup.open' with 'options.users' provided instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await _backwardCompatibleSimplePopup(popupType, popupData, {users: userIds}); 
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function sendSimplePopupToActorOwners(actor, popupType, popupData={}) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.sendSimplePopupToActorOwners' method is deprecated, and will be removed in the later system version. Use 'DC20.dialog.SimplePopup.open' with 'options.actor' provided instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return await _backwardCompatibleSimplePopup(popupType, popupData, {actor: actor});
}

async function _backwardCompatibleSimplePopup(popupType, popupData, options={}) {
  switch (popupType) {
    case "input": 
      if (popupData.rows) {
        return await SimplePopup.open("input", {message: popupData.header, inputs: _rowToInputs(popupData.rows)}, options);
      }
      else {
        return await SimplePopup.input(popupData.header, options);
      }
    case "select": 
      return await SimplePopup.select(popupData.header, popupData.selectOptions, options);
    case "info": 
      return await SimplePopup.info(popupData.header, popupData.information, options);
    case "confirm": 
      return await SimplePopup.confirm(popupData.header, options);
  }
}

function _rowToInputs(rows) {
  return rows.map(row => {
    return {label: row, type: "input"};
  })
}