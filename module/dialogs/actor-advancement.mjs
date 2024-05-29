import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Configuration of advancements on item
 */
export class ActorAdvancement extends Dialog {

  constructor(actor, advForItems, scalingValues, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.advForItems = advForItems;
    this.scalingValues = scalingValues;
    this.showScaling = true;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/actor-advancement.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 550,
      height: 550
    });
  }

  prepareData() {
    const current = Object.values(this.advForItems)[0];
    if (!current) {this.close(); return;}
    
    const currentItem = current.item;
    if (!currentItem) {this.close(); return;}

    const advancementsForCurrentItem =  Object.entries(current.advancements);
    const currentAdvancement = advancementsForCurrentItem[0];
    if (!currentAdvancement) {this.close(); return;}

    // Set first item
    this.currentItem = currentItem;
    this.itemIndex = 0;
    
    // Set first advancement
    this.advancementsForCurrentItem = advancementsForCurrentItem;
    this.currentAdvancement = currentAdvancement[1];
    this.currentAdvancementKey = currentAdvancement[0];
    this.advIntex = 0;

  }

  hasNext() {
    const nextAdvancement = this.advancementsForCurrentItem[this.advIntex + 1];
    if (nextAdvancement) return true;
    
    const nextItem =  Object.values(this.advForItems)[this.itemIndex + 1];
    if (nextItem) return true;
    else return false;
  }

  next() {
    const nextAdvancement = this.advancementsForCurrentItem[this.advIntex + 1];
    if (nextAdvancement) {
      this.currentAdvancement = nextAdvancement[1];
      this.currentAdvancementKey = nextAdvancement[0];
      this.advIntex++;
      return;
    }
    
    const next = Object.values(this.advForItems)[this.itemIndex + 1];
    if (!next) {
      ui.notifications.error("Advancement cannot be progressed any further");
      this.close();
      return;
    }

    const nextItem = next.item;
    if (!nextItem) {
      ui.notifications.error("Advancement cannot be progressed any further");
      this.close();
      return;
    }

    const advancementsForItem = Object.entries(next.advancements);
    const currentAdvancement = advancementsForItem[0];

    if (!currentAdvancement) {
      ui.notifications.error("Advancement cannot be progressed any further");
      this.close();
      return;
    }

    // Go to next item
    this.currentItem = nextItem;
    this.itemIndex++;

    // Reset advancements
    this.advancementsForCurrentItem = advancementsForItem;
    this.currentAdvancement = currentAdvancement[1];
    this.currentAdvancementKey = currentAdvancement[0];
    this.advIntex = 0;
    
  }

  //=====================================
  //              Get Data              =  
  //=====================================
  async getData() {
    if (this.showScaling) return await this._getDataForScalingValues();
    else return await this._getDataForAdvancements();

  }

  async _getDataForScalingValues() {
    return {
      showScaling: true,
      scaling: this.scalingValues,
      title: {
        text: `You gain next level!`,
        img: "icons/svg/upgrade.svg"
      }
    }
  }

  async _getDataForAdvancements() {
    const advancement = this.currentAdvancement;

    // Collect items that are part of advancement
    Object.values(advancement.items).forEach(async record => {
      const item = await fromUuid(record.uuid);
      if (!item) {
        ui.notifications.error(`Advancement corrupted, cannot find saved items.`);
        return advancement;
      } 
      record.img = item.img;
      record.name = item.name;
      record.description = await TextEditor.enrichHTML(item.system.description);
    });

    // Determine how many points left to spend
    if (advancement.mustChoose) {
      const choosen = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));
      
      let pointsSpend = 0; 
      Object.values(choosen).forEach(item => pointsSpend += item.pointValue);
      advancement.pointsLeft = advancement.pointAmount - pointsSpend;
    }

    return {
      ...advancement,
      title: {
        text: `You gain next level in ${this.currentItem.name}!`,
        img: this.currentItem.img
      }
    }
  }

  //===========================================
  //           Activate Listerners            =  
  //===========================================
   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".apply").click(async (ev) => await this._onApply(ev));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find('.next').click(ev => this._onNext(ev));
  }

  _onNext(event) {
    event.preventDefault();
    this.showScaling = false;
    if (Object.keys(this.advForItems).length === 0) {
      this.close();
      return;
    }
    this.prepareData();
    this.render(true);
  }

  _onActivable(pathToValue) {
    let value = getValueFromPath(this.currentAdvancement, pathToValue);
    setValueForPath(this.currentAdvancement, pathToValue, !value);
    this.render(true);
  }

  async _onApply(event) {
    event.preventDefault();
    const advancement = this.currentAdvancement;

    if (advancement.mustChoose) {
      if (advancement.pointsLeft < 0) {
        ui.notifications.error(`You spent too many Choice Points!`);
        return;
      } 
      else if (advancement.pointsLeft > 0) {
        ui.notifications.error(`You spent not enough Choice Points!`);
        return;
      }
      else {
        const selectedItems = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));
        await this._addItemsToActor(selectedItems, advancement);
        this._markAdvancementAsApplied(advancement);
      }
    }
    else {
      await this._addItemsToActor(advancement.items, advancement);
      this._markAdvancementAsApplied(advancement);
    }

    if (this.hasNext()) {
      this.next();
      this.render(true);
    }
    else this.close();
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
    this.currentItem.update({[`system.advancements.${this.currentAdvancementKey}`]: advancement})
  }
}

/**
 * Creates and returns ActorAdvancement dialog. 
 */
export function actorAdvancementDialog(actor, advForItems, scalingValues) {
  const dialog = new ActorAdvancement(actor, advForItems, scalingValues, {title: `Character Advancements`});
  dialog.render(true);
}