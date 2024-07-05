import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { overrideScalingValue } from "../helpers/items/scalingItems.mjs";
import { hideTooltip, itemTooltip } from "../helpers/tooltip.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Configuration of advancements on item
 */
export class ActorAdvancement extends Dialog {

  constructor(actor, advForItems, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.oldSystem = foundry.utils.deepClone(actor.system);
    this.advForItems = advForItems;
    this.showScaling = false;
    this.prepareData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/actor-advancement.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 650,
      height: 550
    });
  }

  prepareData() {
    const current = Object.values(this.advForItems)[0];
    if (!current) {this.showScaling = true; return;}
    
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
    this.advIndex = 0;
  }

  hasNext() {
    const nextAdvancement = this.advancementsForCurrentItem[this.advIndex + 1];
    if (nextAdvancement) return true;
    
    const nextItem =  Object.values(this.advForItems)[this.itemIndex + 1];
    if (nextItem) return true;
    else return false;
  }

  next() {
    const nextAdvancement = this.advancementsForCurrentItem[this.advIndex + 1];
    if (nextAdvancement) {
      this.currentAdvancement = nextAdvancement[1];
      this.currentAdvancementKey = nextAdvancement[0];
      this.advIndex++;
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
    this.advIndex = 0;
  }

  //=====================================
  //              Get Data              =  
  //=====================================
  async getData() {
    if (this.showScaling) return await this._getDataForScalingValues();
    else return await this._getDataForAdvancements();
  }

  async _getDataForScalingValues() {
    // We need to update actor to make sure that we will wait for
    // all advancements to be applied before we can show updates to player.
    // I know it is dumb but it is simplest solution i managed to figure out.
    const counter = this.actor.flags.dc20rpg.advancementCounter + 1;
    await this.actor.update({[`flags.dc20rpg.advancementCounter`]: counter});
    
    const scalingValues = [];

    // Go over core resources and collect changes
    const resources = this.actor.system.resources;
    const oldResources = this.oldSystem.resources;
    Object.entries(resources).forEach(([key, resource]) => {
      if (key === "custom") {}
      else if (resource.max !== oldResources[key].max) {
        scalingValues.push({
          label: game.i18n.localize(`dc20rpg.resource.${key}`),
          previous: oldResources[key].max,
          current: resource.max
        });
      }
    });

    // Go over custom resources
    Object.entries(resources.custom).forEach(([key, custom]) => {    
      if (custom.max !== oldResources.custom[key]?.max) {
        scalingValues.push({
          label: custom.name,
          previous: oldResources.custom[key]?.max || 0,
          current: custom.max
        });
      }
    });

    // Go over attribute points
    const attrPoints = this.actor.system.attributePoints;
    const oldAttrPoints = this.oldSystem.attributePoints;
    if (attrPoints.max !== oldAttrPoints.max) {
      scalingValues.push({
        label: game.i18n.localize("dc20rpg.attribute.points"),
        previous: oldAttrPoints.max,
        current: attrPoints.max
      });
    }

    // Go over skill points
    const skillPoints = this.actor.system.skillPoints;
    const oldSkillPoints = this.oldSystem.skillPoints;
    Object.entries(skillPoints).forEach(([key, skill]) => {    
      if (skill.max !== oldSkillPoints[key].max) {
        scalingValues.push({
          label: game.i18n.localize(`dc20rpg.${key}.points`),
          previous: oldSkillPoints[key].max,
          current: skill.max
        });
      }
    });

    // Go over known spells/techniques and collect changes
    const known = this.actor.system.known;
    const oldKnown = this.oldSystem.known;
    Object.entries(known).forEach(([key, know]) => {    
      if (know.max !== oldKnown[key].max) {
        scalingValues.push({
          label: game.i18n.localize(`dc20rpg.known.${key}`),
          previous: oldKnown[key].max,
          current: know.max
        });
      }
    });

    return {
      showScaling: true,
      scaling: scalingValues
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

    // Take care of Talent Mastery
    if (advancement.talent && advancement.martialTalent === undefined) advancement.martialTalent = true;

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
    html.find('.finish').click(ev => this._onFinish(ev));
    html.find('.item-delete').click(ev => this._onItemDelete(datasetOf(ev).key)); 
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));

    // Tooltip
    html.find('.item-tooltip').hover(ev => itemTooltip(this._itemFromAdvancement(datasetOf(ev).itemKey), false, ev, html), ev => hideTooltip(ev, html));
  }

  _onFinish(event) {
    event.preventDefault();
    this.close();
    return;
  }

  _onActivable(pathToValue) {
    let value = getValueFromPath(this.currentAdvancement, pathToValue);
    setValueForPath(this.currentAdvancement, pathToValue, !value);
    this.render(true);
  }

  _onNumericValueChange(pathToValue, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.currentAdvancement, pathToValue, numericValue);
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
        this._applyTalentMastery(advancement);
        this._markAdvancementAsApplied(advancement);
      }
    }
    else {
      await this._addItemsToActor(advancement.items, advancement);
      this._applyTalentMastery(advancement);
      this._markAdvancementAsApplied(advancement);
    }

    if (this.hasNext()) {
      this.next();
      this.render(true);
    }
    else {
      this.showScaling = true;
      this.render(true);
    }
  }

  async _addItemsToActor(items, advancement) {
    let createdItems = {};
    for (const [key, record] of Object.entries(items)) {
      const item = await fromUuid(record.uuid);
      const created = await createItemOnActor(this.actor, item);
      if (record.ignoreKnown) created.update({["system.knownLimit"]: false});
      record.createdItemId = created._id;
      createdItems[key] = record;
    }
    advancement.items = createdItems;
  }

  _applyTalentMastery(advancement) {
    if (!advancement.talent || advancement.martialTalent === undefined) return;

    const index = advancement.level -1;
    let mastery = '';
    if (advancement.martialTalent) mastery = "martial";
    else mastery = "spellcaster";
    overrideScalingValue(this.currentItem, index, mastery);
  }

  _markAdvancementAsApplied(advancement) {
    advancement.applied = true;
    this.currentItem.update({[`system.advancements.${this.currentAdvancementKey}`]: advancement})
  }

  async _onDrop(event) {
    event.preventDefault();
    if (!this.advancementsForCurrentItem) return;
    const currentAdvancement = this.advancementsForCurrentItem[this.advIndex][1];
    if (!(currentAdvancement.talent || currentAdvancement.allowToAddItems)) return;

    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    if (!["feature", "technique", "spell", "weapon", "equipment"].includes(item.type)) return;

    // Can be countent towards known spell/techniques
    const canBeCounted = ["technique", "spell"].includes(item.type);

    // Get item
    currentAdvancement.items[item.id] = {
      uuid: droppedObject.uuid,
      createdItemId: "",
      selected: true,
      pointValue: 1,
      mandatory: false,
      removable: true,
      canBeCounted: canBeCounted,
      ignoreKnown: false,
    };
    this.render(true);
  }

  _onItemDelete(itemKey) {
    const currentAdvancement = this.advancementsForCurrentItem[this.advIndex][1];
    const currentAdvKey = this.advancementsForCurrentItem[this.advIndex][0];
    delete currentAdvancement.items[itemKey];
    this.currentItem.update({[`system.advancements.${currentAdvKey}.items.-=${itemKey}`] : null});
    this.render(true);
  }

  _itemFromAdvancement(itemKey) {
    const currentAdvancement = this.advancementsForCurrentItem[this.advIndex][1];
    const uuid = currentAdvancement.items[itemKey].uuid;
    const item = fromUuidSync(uuid);
    return item;
  }
}

/**
 * Creates and returns ActorAdvancement dialog. 
 */
export function actorAdvancementDialog(actor, advForItems) {
  const dialog = new ActorAdvancement(actor, advForItems, {title: `Character Advancements`});
  dialog.render(true);
}