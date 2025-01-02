import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { overrideScalingValue } from "../helpers/items/scalingItems.mjs";
import { hideTooltip, itemTooltip } from "../helpers/tooltip.mjs";
import { changeActivableProperty, generateKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";
import { createNewAdvancement } from "../helpers/advancements.mjs";
import { convertSkillPoints, getSkillMasteryLimit, manipulateAttribute, toggleLanguageMastery, toggleSkillMastery } from "../helpers/actors/attrAndSkills.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { createCompendiumBrowser } from "./compendium-browser.mjs";

/**
 * Configuration of advancements on item
 */
export class ActorAdvancement extends Dialog {

  constructor(actor, advForItems, oldSystem, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.oldSystem = oldSystem;
    this.advForItems = advForItems;
    this.showScaling = false;
    this.knownAdded = false;
    this.spendPoints = false;
    this.classItem = null;
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
    if (this.currentItem.type === "class") {
      // We want to store some data in class if it is present
      this.classItem = this.currentItem;
    }    
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
    // else if (this.spendPoints) return await this._getDataForSpendPoints();
    else return await this._getDataForAdvancements();
  }

  async _getDataForScalingValues() {
    await this._refreshActor();
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

    // Go over skills and mark ones that reach max mastery level
    const skills = this.actor.system.skills;
    const trades = this.actor.system.tradeSkills;
    const languages = this.actor.system.languages;

    for (const [key, skill] of Object.entries(skills)) {
      skill.masteryLimit = getSkillMasteryLimit(this.actor, "skills");
    }
    for (const [key, trade] of Object.entries(trades)) {
      trade.masteryLimit = getSkillMasteryLimit(this.actor, "trade");
    }
    for (const [key, lang] of Object.entries(languages)) {
      lang.masteryLimit = 2;
    }

    return {
      showScaling: true,
      scalingValues: scalingValues,
      ...this.actor.system,
    }
  }

  async _getDataForSpendPoints() {
    return {
      ...this.actor.system,
      spendPoints: true,
      applyingAdvancement: this.applyingAdvancement
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
      record.description = await TextEditor.enrichHTML(item.system.description, {secrets:true});
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
      },
      applyingAdvancement: this.applyingAdvancement
    }
  }

  //===========================================
  //           Activate Listerners            =  
  //===========================================
   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".apply").click(ev => this._onApply(ev));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find('.finish').click(ev => this._onFinish(ev));
    html.find('.item-delete').click(ev => this._onItemDelete(datasetOf(ev).key)); 
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".talent-mastery-selector").click(ev => this._onTalentMasteryChange(datasetOf(ev).mastery))
    html.find(".next").click(ev => this._onNext(ev));
    html.find('.open-compendium').click(ev => {
      const itemType = datasetOf(ev).itemType;
      const selected = datasetOf(ev).selected;
      if (itemType === "any") createCompendiumBrowser("advancement", false, this, selected);
      else createCompendiumBrowser(itemType, true, this, selected);
    });

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));

    // Spend Points
    html.find(".add-attr").click(ev => this._onAttrChange(datasetOf(ev).key, true));
    html.find(".sub-attr").click(ev => this._onAttrChange(datasetOf(ev).key, false));
    html.find('.save-mastery').click(ev => this._onSaveMastery(datasetOf(ev).key));
    html.find(".skill-point-converter").click(async ev => {
      await convertSkillPoints(this.actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate);
      this.render();
    });
    html.find(".skill-mastery-toggle").mousedown(async ev => {
       await toggleSkillMastery(datasetOf(ev).type, datasetOf(ev).path, ev.which, this.actor);
       this.render();
    });
    html.find(".language-mastery-toggle").mousedown(async ev => {
      await toggleLanguageMastery(datasetOf(ev).path, ev.which, this.actor);
      this.render();
   });

    // Tooltip
    html.find('.item-tooltip').hover(ev => itemTooltip(this._itemFromAdvancement(datasetOf(ev).itemKey), false, ev, html), ev => hideTooltip(ev, html));
  }

  async _onAttrChange(key, add) {
    await manipulateAttribute(key, this.actor, !add);
    this.render();
  }

  async _onSaveMastery(key) {
    await changeActivableProperty(`system.attributes.${key}.saveMastery`, this.actor);
    this.render();
  }

  _onFinish(event) {
    event.preventDefault();
    this.close();
    return;
  }

  _onNext(event) {
    event.preventDefault();
    this.showScaling = true;
    this.render();
  }

  _onActivable(pathToValue) {
    let value = getValueFromPath(this.currentAdvancement, pathToValue);
    setValueForPath(this.currentAdvancement, pathToValue, !value);
    this.render();
  }

  _onValueChange(path, value) {
    setValueForPath(this.updateData, path, value);
    this.render();
  }

  _onNumericValueChange(pathToValue, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.currentAdvancement, pathToValue, numericValue);
    this.render();
  }

  _onTalentMasteryChange(mastery) {
    this.currentAdvancement.mastery = mastery;
    this.render();
  }

  async _onApply(event) {
    event.preventDefault();
    if (this.applyingAdvancement) return; // When there was a lag user could apply advancement multiple times
    this.applyingAdvancement = true;
    const advancement = this.currentAdvancement;

    if (advancement.mustChoose) {
      if (advancement.pointsLeft < 0) {
        ui.notifications.error(`You spent too many Choice Points!`);
        this.applyingAdvancement = false;
        this.render();
        return;
      } 
      else if (advancement.pointsLeft > 0) {
        ui.notifications.error(`You spent not enough Choice Points!`);
        this.applyingAdvancement = false;
        this.render();
        return;
      }
      else {
        const talentMasteryApplied = await this._applyTalentMastery(advancement);
        if (!talentMasteryApplied) {
          this.applyingAdvancement = false;
          this.render();
          return;
        }

        this.render(); // We want to render "Applying Advancement" overlay
        if (advancement.repeatable) await this._addNextRepeatableAdvancement(advancement);
        const selectedItems = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));
        await this._addItemsToActor(selectedItems, advancement);
        this._markAdvancementAsApplied(advancement);
      }
    }
    else {
      const talentMasteryApplied = await this._applyTalentMastery(advancement);
      if (!talentMasteryApplied) {
        this.applyingAdvancement = false;
        return;
      }
      
      this.render(); // We want to render "Applying Advancement" overlay
      await this._addItemsToActor(advancement.items, advancement);
      this._markAdvancementAsApplied(advancement);
    }

    // If current item is a martial class we need to check if martial expansion should be added
    if (this.currentItem.system.martial) await this._addMartialExpansion();

    if (this.hasNext()) {
      this.next();
      this.applyingAdvancement = false;
      this.render();
    }
    else {
      // Check what should I do
      const step = await this._prepareNextStep();
      if (step === "known") this.next();
      if (step === "points") this.showScaling = true;

      this.applyingAdvancement = false;
      this.render();
    }
  }

  async _addNextRepeatableAdvancement(oldAdv) {
    let nextLevel = null;
    // Collect next level where advancement should appear
    for (let i = oldAdv.level + 1; i <= 20; i++) {
      const choicePoints = oldAdv.repeatAt[i];
      if (choicePoints > 0) {
        nextLevel = {
          level: i,
          pointAmount: choicePoints
        }
        break;
      }
    }
    if (nextLevel === null) return;

    // If next level advancement was already created before we want to replace it, if not we will create new one
    const advKey = oldAdv.cloneKey || generateKey();
    const newAdv = foundry.utils.deepClone(oldAdv);
    newAdv.pointAmount = nextLevel.pointAmount;
    newAdv.level = nextLevel.level;
    newAdv.additionalAdvancement = false;
    newAdv.cloneKey = null;

    // Remove already added items
    const filteredItems = Object.fromEntries(
      Object.entries(newAdv.items).filter(([key, item]) => !item.selected)
    );

    const oldAdvKey = this.advancementsForCurrentItem[this.advIndex][0];
    oldAdv.cloneKey = advKey;
    newAdv.items = filteredItems;

    // We want to clear item list before we add new ones
    if(oldAdv.cloneKey) await this.currentItem.update({[`system.advancements.${advKey}.-=items`]: null});
    await this.currentItem.update({
      [`system.advancements.${advKey}`]: newAdv,
      [`system.advancements.${oldAdvKey}`]: oldAdv,
    });
  }

  async _addItemsToActor(items, advancement) {
    let createdItems = {};
    for (const [key, record] of Object.entries(items)) {
      const item = await fromUuid(record.uuid);
      const created = await createItemOnActor(this.actor, item);
      if (record.ignoreKnown) created.update({["system.knownLimit"]: false});
      if (created.system.hasAdvancement) await this._addAdditionalAdvancement(created.system.advancements.default);
      record.createdItemId = created._id;
      createdItems[key] = record;
    }
    advancement.items = createdItems;
  }

  async _addAdditionalAdvancement(advancement, addToClass, advKey) {
    if (!advKey) advKey = generateKey();
    advancement.additionalAdvancement = true;

    if (addToClass && this.classItem) {
      advancement.level = this.classItem.system.level;
      await this.classItem.update({[`system.advancements.${advKey}`]: advancement});
      if (!this.advForItems["classRepeat"]) {
        this.advForItems["classRepeat"] = {
          item: this.classItem,
          advancements: {}
        }
      }
      this.advForItems["classRepeat"].advancements[advKey] = advancement;
    }
    else {
      advancement.level = this.currentAdvancement.level;
      await this.currentItem.update({[`system.advancements.${advKey}`]: advancement});
      this.advancementsForCurrentItem.push([advKey, advancement]);
    }
  }

  async _addMartialExpansion() {
    if (this.currentItem.system.maneuversProvided) return; // Attack Maneuver were already provided
    const martialExpansion = await fromUuid(DC20RPG.martialExpansion);
    if (!martialExpansion) {
      ui.notifications.warn("Martial Expansion Item cannot be found")
      return;
    }
    
    const advancement = Object.values(martialExpansion.system.advancements)[0];
    advancement.customTitle = advancement.name;
    await this._addAdditionalAdvancement(advancement, true, "martialExpansion");
    await this.currentItem.update({["system.maneuversProvided"]: true});
  }

  async _applyTalentMastery(advancement) {
    if (!advancement.talent) return true;

    const index = advancement.level -1;
    switch(advancement.mastery) {
      case "martial":
        await this._addMartialExpansion();
        overrideScalingValue(this.currentItem, index, "martial");
        return true;
      case "spellcaster":
        overrideScalingValue(this.currentItem, index, "spellcaster");
        return true;
      default:
        ui.notifications.error("Choose Spellcaster or Martial mastery depending on your chosen talent")
        return false;
    }
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
      pointValue: item.system.choicePointCost || 1,
      mandatory: false,
      removable: true,
      canBeCounted: canBeCounted,
      ignoreKnown: false,
    };
    this.render();
  }

  _onItemDelete(itemKey) {
    const currentAdvancement = this.advancementsForCurrentItem[this.advIndex][1];
    const currentAdvKey = this.advancementsForCurrentItem[this.advIndex][0];
    delete currentAdvancement.items[itemKey];
    this.currentItem.update({[`system.advancements.${currentAdvKey}.items.-=${itemKey}`] : null});
    this.render();
  }

  _itemFromAdvancement(itemKey) {
    const currentAdvancement = this.advancementsForCurrentItem[this.advIndex][1];
    const uuid = currentAdvancement.items[itemKey].uuid;
    const item = fromUuidSync(uuid);
    return item;
  }

  async _prepareNextStep() {
    if (await this._prepareKnown()) return "known";
    return "points";
  }

  async _prepareKnown() {
    if (this.knownAdded) return false; // We already added advancements for known spells/techniques
    
    let anyKnownAdded = false;
    await this._refreshActor();

    const knowns = this.actor.system.known;
    for (const [key, known] of Object.entries(knowns)) {
      const newKnownAmount = known.max - known.current;
      if (newKnownAmount > 0) {
        const adv = createNewAdvancement();
        adv.name = game.i18n.localize(`dc20rpg.known.${key}`);
        adv.allowToAddItems = true;
        adv.pointAmount = newKnownAmount;
        adv.mustChoose = true;
        adv.customTitle = `Add New ${adv.name}`;
        this._prepCompendiumBrowser(adv, key);
        await this._addAdditionalAdvancement(adv, true);
        anyKnownAdded = true;
      }
    }
    this.knownAdded = true;
    return anyKnownAdded;
  }

  _prepCompendiumBrowser(adv, key) {
    switch(key) {
      case "cantrips":
        adv.compendium = "spell";
        adv.preFilters = '{"spellType": "cantrip"}'
        break;
      case "spells":
        adv.compendium = "spell";
        adv.preFilters = '{"spellType": "spell"}'
        break;
      case "maneuvers":
        adv.compendium = "technique";
        adv.preFilters = '{"techniqueType": "maneuver"}'
        break;
      case "techniques":
        adv.compendium = "technique";
        adv.preFilters = '{"techniqueType": "technique"}'
        break;
    }
  }

  async _refreshActor() {
    // We need to update actor to make sure that we will wait for
    // all advancements to be applied before we can show updates to player.
    // I know it is dumb but it is simplest solution i managed to figure out.
    const counter = this.actor.flags.dc20rpg.advancementCounter + 1;
    await this.actor.update({[`flags.dc20rpg.advancementCounter`]: counter});
  }
}

/**
 * Creates and returns ActorAdvancement dialog. 
 */
export function actorAdvancementDialog(actor, advForItems, oldSystem) {
  const dialog = new ActorAdvancement(actor, advForItems, oldSystem, {title: `Character Advancements`});
  dialog.render(true);
}