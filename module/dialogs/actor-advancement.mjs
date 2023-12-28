import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Configuration of advancements on item
 */
export class ActorAdvancement extends Dialog {

  constructor(actor, item, key, advancement, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.item = item;
    this.key = key;
    this.advancement = advancement;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/actor-advancement.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 450,
      height: 450
    });
  }

  async getData() {
    const advancement = this.advancement;

    // Collect items that are part of advancement
    Object.values(advancement.items).forEach(async record => {
      const item = await fromUuid(record.uuid);
      console.log(record.uuid)
      if (!item) {
        
        ui.notifications.error(`Advancement corrupted, cannot find saved items.`);
        return advancement;
      } 
      record.img = item.img;
      record.name = item.name;
      record.description = await TextEditor.enrichHTML(item.system.description, {async: true});
    });

    return advancement;
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".apply").click(async (ev) => await this._onApply(ev));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
  }

  _onActivable(pathToValue) {
    let value = getValueFromPath(this.advancement, pathToValue);
    setValueForPath(this.advancement, pathToValue, !value);
    this.render(true);
  }

  async _onApply(event) {
    event.preventDefault();
    const advancement = this.advancement;

    if (advancement.mustChoose) {
      const choosen = Object.fromEntries(
          Object.entries(advancement.items).filter(([key, item]) => item.selected)
        );
      
      let pointsSpend = 0; 
      Object.values(choosen).forEach(item => pointsSpend += item.pointValue);

      if (pointsSpend !== advancement.pointAmount) {
        ui.notifications.error(`You have to spend exacly ${advancement.pointAmount} Choice Points!`);
        return;
      } 
      else {
        await this._addItemsToActor(choosen, advancement);
        this._markAdvancementAsApplied(advancement);
      }
    }
    else {
      await this._addItemsToActor(advancement.items, advancement);
      this._markAdvancementAsApplied(advancement);
    }

    this.close();
  }

  async _addItemsToActor(items, advancement) {
    let createdItems = {};
    for (const [key, record] of Object.entries(items)) {
      const item = await fromUuid(record.uuid);
      const created = await createItemOnActor(this.actor, item);
      record.createdItemId = created._id;
      createdItems[key] = record;
    }
    advancement.items = createdItems;
  }

  _markAdvancementAsApplied(advancement) {
    advancement.applied = true;
    this.item.update({[`system.advancements.${this.key}`]: advancement})
  }
}

/**
 * Creates AdvancementConfiguration dialog for given item. 
 */
export function actorAdvancementDialog(actor, item, key, advancement) {
  const dialog = new ActorAdvancement(actor, item, key, advancement, {title: `Character Advancements`});
  dialog.render(true);
}