import { mixAncestry, openItemCompendium } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";

export class MixAncestryDialog extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.ancestryCollection = {};
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  /** @override */
  get template() {
    return "systems/dc20rpg/templates/dialogs/mix-ancestry-dialog.hbs";
  }

  getData() {
    return {
      ancestryCollection: this.ancestryCollection,
      canMix: Object.keys(this.ancestryCollection).length === 2
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".mix").click(ev => this._onMix(ev));
    html.find(".remove-item").click(ev => this._onItemRemoval(datasetOf(ev).id));
    html.find('.open-compendium').click(ev => openItemCompendium("ancestry"));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  async _onMix(event) {
    event.preventDefault();
    const [first, second] = Object.values(this.ancestryCollection);
    const ancestryData = mixAncestry(first, second);
    
    if (ancestryData) {
      this.promiseResolve(ancestryData);
      this.close();
    }
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    if (item.type !== "ancestry") return;

    if (Object.keys(this.ancestryCollection).length >= 2) return; // For now we only want to merge two ancestries, no more
    this.ancestryCollection[item.id] = item;
    this.render(true);
  }

  _onItemRemoval(id) {
    delete this.ancestryCollection[id];
    this.render(true);
  }

  static async create(dialogData = {}, options = {}) {
    const dialog = new MixAncestryDialog(dialogData, options);
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

export async function createMixAncestryDialog() {
  return await MixAncestryDialog.create({title: "Mix Ancestry"});
}