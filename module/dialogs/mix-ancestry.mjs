import { mixAncestry } from "../helpers/actors/itemsOnActor.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

export class MixAncestryDialog extends DC20Dialog {

  constructor(options = {}) {
    super(options);
    this.ancestry1 = "";
    this.ancestry2 = "";
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/mix-ancestry-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Ancestry Mixer";
    initialized.window.icon = "fa-solid fa-network-wired";
    initialized.position.width = 420;

    initialized.actions.mix = this._onMix;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.ancestry1 = this.ancestry1;
    context.ancestry2 = this.ancestry2;
    context.canMix = this.ancestry1 && this.ancestry2;
    context.ancestries = CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.ancestry;
    return context;
  }

  async _onMix(event) {
    event.preventDefault();
    const first = await fromUuid(this.ancestry1);
    const second = await fromUuid(this.ancestry2);
    const ancestryData = mixAncestry(first, second);
    
    if (ancestryData) {
      this.promiseResolve(ancestryData);
      this.close();
    }
  }

  static async create(options = {}) {
    const dialog = new MixAncestryDialog(options);
    return new Promise((resolve) => {
      dialog.promiseResolve = resolve;
      dialog.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}

export async function createMixAncestryDialog(options = {}) {
  return await MixAncestryDialog.create(options);
}