import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";

export class ConfirmationPopUpDialog extends Dialog {

  constructor(question, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.question = question;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/confirmation-popup-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return {
      question: this.question
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.yes').click(ev => this._onClose(ev, true));
    html.find('.no').click(ev => this._onClose(ev, false));
  }

  async _onRoll(event) {
    event.preventDefault();
    const roll = await rollFromSheet(this.actor, this.details);
    this.promiseResolve(roll);
    this.close();
  }

  async _onClose(event, outome) {
    event.preventDefault();
    this.promiseResolve(outome);
    this.close();
  }

  static async create(actor, details, dialogData = {}, options = {}) {
    const prompt = new ConfirmationPopUpDialog(actor, details, dialogData, options);
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

export async function getConfirmationPopup(question) {
  return await ConfirmationPopUpDialog.create(question, {title: `Confirmation Dialog`});
}