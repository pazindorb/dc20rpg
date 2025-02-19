import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { validateUserOwnership } from "../helpers/compendiumPacks.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";

export class SubclassSelector extends Dialog {

  constructor(actor, clazz, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.collectingData = true;
    this.selectedItem = {
      _id: "",
      img: "icons/svg/combat.svg",
      name: "Subclass",
    }
    if (clazz) this._collectSubclasses(clazz);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/subclass-selector.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 820,
      height: 600
    });
  }

  async _collectSubclasses(clazz) {
    if (!clazz) {
      this.subclasses = [];
      this.collectingData = false;
      this.render();
    }

    const matching = [];
    for (const pack of game.packs) {
      if (!validateUserOwnership(pack)) continue;

      if (pack.documentName === "Item") {
        const items = await pack.getDocuments();
        items.filter(item => item.type === "subclass")
              .filter(item => item.system.forClass.classSpecialId === clazz.system.classSpecialId)
              .forEach(item => matching.push(item))
      }
    }
    
    this.subclasses = matching;
    this.collectingData = false;
    this.render();
  }

  async getData() {
    const selectedItem = this.selectedItem;
    if (selectedItem._id === "") {
      selectedItem.descriptionHTML = "<p>Select Item</p>";
    }
    else {
      selectedItem.descriptionHTML = await TextEditor.enrichHTML(selectedItem.system.description, {secrets:true});
    }

    return {
      collectingData: this.collectingData,
      collectedItems: this.subclasses,
      selectedItem: this.selectedItem,
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".select-subclass").click(ev => this._onFinish(ev));
    html.find(".select-row").click(ev => this._onSelectRow(datasetOf(ev).index));
  }

  _onSelectRow(index) {
    this.selectedItem = this.subclasses[index];
    this.render();
  }

  async _onFinish(event) {
    event.preventDefault();
    if (this.selectedItem._id !== "") {
      const subclass = await createItemOnActor(this.actor, this.selectedItem);
      this.promiseResolve(subclass);
    }
    this.close();
  }

  static async create(actor, clazz, dialogData = {}, options = {}) {
    const prompt = new SubclassSelector(actor, clazz, dialogData, options);
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

export async function openSubclassSelector(actor, clazz) {
  return await SubclassSelector.create(actor, clazz, {title: "Pick Your Subclass"});
}