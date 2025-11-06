import { datasetOf, valueOf } from "../../../helpers/listenerEvents.mjs";
import { createTemporaryMacro } from "../../../helpers/macros.mjs";
import { generateKey, getValueFromPath, setValueForPath } from "../../../helpers/utils.mjs";
import { updateAdvancement } from "./advancement-util.mjs";
import { createNewAdvancement } from "./advancements.mjs";

/**
 * Configuration of advancements on item
 */
export class AdvancementConfiguration extends Dialog {

  constructor(item, key, dialogData={}, options={}) {
    super(dialogData, options);
    this.item = item;
    this.key = key;
    this.advancement = foundry.utils.deepClone(item.system.advancements[this.key]);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/character-progress/advancement-config-dialog.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 750,
      height: 550,
      resizable: true,
      draggable: true,
    });
  }

  async getData() {
    const advancement = this.advancement;
    if (!advancement.items) advancement.items = {};

    // Collect items that are part of advancement
    Object.values(advancement.items).forEach(async record => {
      const item = await fromUuid(record.uuid);
      record.img = item.img;
      record.name = item.name;

      if (record.mandatory) record.selected = true;
    });

    return {
      ...advancement,
      source: this.item.type,
      compendiumTypes: CONFIG.DC20RPG.DROPDOWN_DATA.advancementItemTypes
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
    html.find(".numeric-input-nullable").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev), true));
    html.find(".repeat-at").change(ev => this._onRepeatedAt(datasetOf(ev).index, valueOf(ev)));
    html.find('.macro-edit').click(ev => this._onEditMacro());

    // Item manipulation
    html.find('.item-delete').click(ev => this._onItemDelete(datasetOf(ev).key)); 

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  _onSave(event) {
    event.preventDefault();
    // We are not updating the copy so we want to grab macro from original advancement
    const originalMacro = this.item.system.advancements[this.key].macro; 
    this.advancement.macro = originalMacro;
    this.advancement.key = this.key;
    updateAdvancement(this.item, this.advancement);
    this.close();
  }
  _onActivable(pathToValue) {
    let value = getValueFromPath(this.advancement, pathToValue);
    setValueForPath(this.advancement, pathToValue, !value);
    this.render();
  }
  _onValueChange(path, value) {
    setValueForPath(this.advancement, path, value);
    this.render();
  }
  _onNumericValueChange(path, value, nullable) {
    let numericValue = parseInt(value);
    if (nullable && isNaN(numericValue)) numericValue = null;
    setValueForPath(this.advancement, path, numericValue);
    this.render();
  }

  _onRepeatedAt(index, value) {
    if (value === "") value = 0;
    const numericValue = parseInt(value);
    this.advancement.repeatAt[index] = numericValue;
    this.render();
  }

  async _onEditMacro() {
    // We are not updating the copy so we want to grab macro from original advancement
    const originalMacro = this.item.system.advancements[this.key].macro; 
    const advancement = this.advancement;
    const macro = await createTemporaryMacro(originalMacro, this.item, {item: this.item, advKey: this.key, advancement: advancement});
    macro.canUserExecute = (user) => false;
    macro.sheet.render(true);
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    if (!["feature", "technique", "infusion", "spell", "weapon", "equipment"].includes(item.type)) return;

    // Can be counted towards known spell/techniques
    const canBeCounted = ["technique", "infusion", "spell"].includes(item.type);

    // Get item
    this.advancement.items[item.id] = {
      uuid: droppedObject.uuid,
      createdItemId: "",
      selected: false,
      pointValue: item.system.choicePointCost !== undefined ? item.system.choicePointCost : 1,
      mandatory: false,
      canBeCounted: canBeCounted,
      ignoreKnown: false,
    };
    this.render();
  }

  _onItemDelete(itemKey) {
    delete this.advancement.items[itemKey];
    this.item.update({[`system.advancements.${this.key}.items.-=${itemKey}`] : null});
    this.render();
  }

  setPosition(position) {
    super.setPosition(position);

    this.element.css({
      "min-height": "200px",
      "min-width": "450px",
    })
  }
}

/**
 * Creates AdvancementConfiguration dialog for given item. 
 */
export async function configureAdvancementDialog(item, advancementKey) {
  if (!advancementKey || !!!item.system.advancements[advancementKey]) {
    advancementKey = generateKey();
    let advancement = createNewAdvancement();
    advancement.key = advancementKey;
    await updateAdvancement(item, advancement); 
  }
  const dialog = new AdvancementConfiguration(item, advancementKey, {title: `Configure Advancement`});
  dialog.render(true);
}