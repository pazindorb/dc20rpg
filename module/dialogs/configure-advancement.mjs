import { createNewAdvancement } from "../helpers/advancements.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { generateKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Configuration of advancements on item
 */
export class AdvancementConfiguration extends Dialog {

  constructor(item, key, newAdv, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.item = item;
    this.key = key;

    if(newAdv) this.advancement = createNewAdvancement();
    else this.advancement = foundry.utils.deepClone(item.system.advancements[this.key]);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/configure-advancement.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 650,
      height: 550
    });
  }

  async getData() {
    const advancement = this.advancement;

    // Collect items that are part of advancement
    Object.values(advancement.items).forEach(async record => {
      const item = await fromUuid(record.uuid);
      record.img = item.img;
      record.name = item.name;

      if (record.mandatory) record.selected = true;
    });

    return {
      ...advancement,
      source: this.item.type
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".save").click((ev) => this._onSave(ev));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));

    // Item manipulation
    html.find('.item-delete').click(ev => this._onItemDelete(datasetOf(ev).key)); 

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  _onSave(event) {
    event.preventDefault();
    this.item.update({[`system.advancements.${this.key}`] : this.advancement});
    this.close();
  }
  _onActivable(pathToValue) {
    let value = getValueFromPath(this.advancement, pathToValue);
    setValueForPath(this.advancement, pathToValue, !value);
    this.render(true);
  }
  _onValueChange(path, value) {
    setValueForPath(this.advancement, path, value);
    this.render(true);
  }
  _onNumericValueChange(path, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.advancement, path, numericValue);
    this.render(true);
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    if (!["feature", "technique", "spell", "weapon", "equipment"].includes(item.type)) return;

    // Can be counted towards known spell/techniques
    const canBeCounted = ["technique", "spell"].includes(item.type);

    // Get item
    this.advancement.items[item.id] = {
      uuid: droppedObject.uuid,
      createdItemId: "",
      selected: false,
      pointValue: 1,
      mandatory: false,
      canBeCounted: canBeCounted,
      ignoreKnown: false,
    };
    this.render(true);
  }

  _onItemDelete(itemKey) {
    delete this.advancement.items[itemKey];
    this.item.update({[`system.advancements.${this.key}.items.-=${itemKey}`] : null});
    this.render(true);
  }
}

/**
 * Creates AdvancementConfiguration dialog for given item. 
 */
export function configureAdvancementDialog(item, advancementKey) {
  let newAdv = false;
  if (!advancementKey) {
    newAdv = true;
    const advancements = item.system.advancements;
    do {
      advancementKey = generateKey();
    } while (advancements[advancementKey]);
  }
  const dialog = new AdvancementConfiguration(item, advancementKey, newAdv, {title: `Configure Advancement`});
  dialog.render(true);
}