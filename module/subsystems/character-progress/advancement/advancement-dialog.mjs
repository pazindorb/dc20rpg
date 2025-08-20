
import { datasetOf, valueOf } from "../../../helpers/listenerEvents.mjs";
import { hideTooltip, itemTooltip, journalTooltip, textTooltip } from "../../../helpers/tooltip.mjs";
import { getValueFromPath, setValueForPath } from "../../../helpers/utils.mjs";
import { convertSkillPoints, getSkillMasteryLimit, manipulateAttribute, manualSkillExpertiseToggle, toggleLanguageMastery, toggleSkillMastery } from "../../../helpers/actors/attrAndSkills.mjs";
import { createItemBrowser } from "../../../dialogs/compendium-browser/item-browser.mjs";
import { collectItemsForType, filterDocuments, getDefaultItemFilters } from "../../../dialogs/compendium-browser/browser-utils.mjs";
import { addAdditionalAdvancement, addNewSpellTechniqueAdvancements, applyAdvancement, canApplyAdvancement, collectScalingValues, collectSubclassesForClass, markItemRequirements, removeAdvancement, revertAdvancement, shouldLearnNewSpellsOrTechniques } from "./advancement-util.mjs";
import { SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { createItemOnActor } from "../../../helpers/actors/itemsOnActor.mjs";
import { collectAdvancementsFromItem } from "./advancements.mjs";


/**
 * Configuration of advancements on item
 */
export class ActorAdvancement extends Dialog {

  constructor(actor, advancements, oldSystemData, openSubclassSelector, dialogData = {}, options = {}) {
    super(dialogData, options);

    this.knownApplied = false;
    this.showFinal = false;
    this.spendPoints = false;
    
    this.actor = actor;
    this.advancements = advancements;
    this.oldSystemData = oldSystemData;
    this.tips = [];
    
    this.suggestionsOpen = false;
    this.itemSuggestions = [];
    if (openSubclassSelector) this._selectSubclass();
    else this._prepareData();
  }

  get currentItem() {
    return this.currentAdvancement?.parentItem;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/character-progress/advancement-dialog.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 1200,
      height: 800,
      resizable: true,
      draggable: true,
    });
  }

  async _selectSubclass() {
    const subclasses = await collectSubclassesForClass(this.actor.system.details.class.classKey);
    if (subclasses.length === 0) return this._prepareData();
    this.selectSubclass = subclasses;
    this.render();
  }

  _prepareData() {
    if (this.selectSubclass) return;
    const currentAdvancement = this.advancements[0];
    if (!currentAdvancement) {this.showFinal = true; return;}

    this.currentAdvancement = currentAdvancement;
    this.index = 0;
    this._prepareItemSuggestions();
  }

  hasNext() {
    const nextAdvancement = this.advancements[this.index + 1];
    if (nextAdvancement) return true;
    else return false;
  }

  hasPrevious() {
    const previousAdvancement = this.advancements[this.index - 1];
    if (previousAdvancement) return true;
    else return false;
  }

  next() {
    const nextAdvancement = this.advancements[this.index + 1];
    if (nextAdvancement) {
      this.index++;
      this.currentAdvancement = nextAdvancement;
      this._prepareItemSuggestions();
    }
  }

  //=====================================
  //              Get Data              =  
  //=====================================
  async getData() {
    const scalingValues = await collectScalingValues(this.actor, this.oldSystemData);
    const advancementProgress = await this._getAdvancementProgress();
    const skillPoints = {
      attributePoints: this.actor.system.attributePoints,
      skillPoints: this.actor.system.skillPoints,
    }
    const multiclass = this._getLevelMulticlassOption();
    const talentFilterTypes = {
      general: "General Talent",
      class: "Class Talent",
      ...multiclass
    }
    const multiclassTooltip = {
      key: Object.keys(multiclass)[0],
      header: Object.values(multiclass)[0]
    }
    const advancementData = await this._getCurrentAdvancementData();
    const showItemSuggestions = this._shouldShowItemSuggestions(advancementData);
    if (!showItemSuggestions) this.suggestionsOpen = false;

    return {
      suggestionsOpen: this.suggestionsOpen,
      suggestions: this._filterSuggestedItems(),
      showItemSuggestions: showItemSuggestions,
      talentFilterTypes: talentFilterTypes,
      featureSourceItems: this._prepareFeatureSourceItems(multiclass),
      multiclassTooltip: multiclassTooltip,
      applyingAdvancement: this.applyingAdvancement,
      revertingEnhancement: this.revertingEnhancement,
      tips: this.tips,
      hasTips: this.tips.length > 0,
      actor: this.actor,
      showFinal: this.showFinal,
      advancementSelection: !this.showFinal && !this.selectSubclass,
      canRevert: this.hasPrevious(),
      scalingValues: scalingValues,
      points: skillPoints,
      selectSubclass: this.selectSubclass,
      advancement: advancementData,
      advancementProgress: advancementProgress,
      foldProgress: advancementProgress.length > 7,
      ...this._prepareSkills()
    }
  }

  _getLevelMulticlassOption() {
    const actorLevel = this.actor.system.details.level;
    if (actorLevel >= 17) return {legendary: "Legendary Multiclass"}
    if (actorLevel >= 13) return {grandmaster: "Grandmaster Multiclass"}
    if (actorLevel >= 10) return {master: "Master Multiclass"}
    if (actorLevel >= 7) return {expert: "Expert Multiclass"}
    if (actorLevel >= 4) return {adept: "Adept Multiclass"}
    return {basic: "Multiclass"}
  }

  _shouldShowItemSuggestions(advancementData) {
    if (!advancementData.allowToAddItems) return false;
    const itemLimit = advancementData.addItemsOptions?.itemLimit;
    if (!itemLimit) return true;
    return advancementData.removableItemsAdded < itemLimit;
  }

  _prepareFeatureSourceItems(multiclass) {
    if (this.currentItem?.type === "class") {
      const multiclassType = Object.keys(multiclass);
      if (["basic", "adept"].includes(multiclassType[0])) return CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class;
      
      let list = {} 
      Object.entries(CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class).forEach(([key, label]) => {
        list[key] = `[Class] ${label}`;
      });
      Object.entries(CONFIG.DC20RPG.UNIQUE_ITEM_IDS.subclass).forEach(([key, label]) => {
        list[key] = `[Subclass] ${label}`;
      });
      return list;
    }
    if (this.currentAdvancement?.addItemsOptions?.ancestryFilter) {
      this.currentAdvancement.ancestryFilter = true;
      return CONFIG.DC20RPG.UNIQUE_ITEM_IDS.ancestry;
    }
    return null;
  }

  async _getCurrentAdvancementData() {
    const advancement = this.currentAdvancement;
    if (!advancement) return {};

    // Prepare missing filters 
    if (advancement.hideOwned === undefined) advancement.hideOwned = true;

    let removableItemsAdded = 0;
    // Collect items that are part of advancement
    const records = Object.values(advancement.items) || [];
    for(const record of records) {
      const item = await fromUuid(record.uuid);
      if (!item) {
        ui.notifications.error(`Advancement corrupted, cannot find saved items.`);
        return advancement;
      } 
      record.img = item.img;
      record.name = item.name;
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      record.description = await TextEditor.enrichHTML(item.system.description, {secrets:true, autoLink:true});
      if (record.removable) removableItemsAdded++;
    }

    // Determine how many points left to spend
    if (advancement.mustChoose) {
      const choosen = Object.fromEntries(Object.entries(advancement.items).filter(([key, item]) => item.selected));
      
      let pointsSpend = 0; 
      Object.values(choosen).forEach(item => pointsSpend += item.pointValue);
      advancement.pointsLeft = advancement.pointAmount - pointsSpend;
    }
    advancement.removableItemsAdded = removableItemsAdded;
    return advancement;
  }

  _prepareSkills() {
    // Go over skills and mark ones that reach max mastery level
    const skills = this.actor.system.skills;
    const trades = this.actor.system.tradeSkills;
    const languages = this.actor.system.languages;
    const attributes = this.actor.system.attributes;

    for (const [key, skill] of Object.entries(skills)) {
      skill.masteryLimit = getSkillMasteryLimit(this.actor, key);
      skill.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.skillMasteryLabel[skill.mastery];
    }
    for (const [key, trade] of Object.entries(trades)) {
      trade.masteryLimit = getSkillMasteryLimit(this.actor, key);
      trade.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.skillMasteryLabel[trade.mastery];
    }
    for (const [key, lang] of Object.entries(languages)) {
      lang.masteryLimit = 2;
      lang.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.languageMasteryLabel[lang.mastery];
    }
    const maxPrime = 3 + Math.floor(this.actor.system.details.level/5);
    for (const [key, attr] of Object.entries(attributes)) {
      attr.maxPrime = maxPrime === attr.value;
    }

    return {
      skills: skills,
      tradeSkills: trades,
      languages: languages,
      attributes: attributes,
    }
  }

  async _getAdvancementProgress() {
    const progress = [];

    // Add advancements to progress
    const advancements = this.advancements;
    for (let i = 0; i < advancements.length; i++) {
      const advancement = advancements[i];
      progress.push({
        img: advancement.img || advancement.parentItem.img,
        label: advancement.name,
        active: !this.showFinal && i === this.index
      });
    }

    // Add spell/techniques selector (before those were added already)
    if (!this.knownApplied) {
      const shouldLearn = await shouldLearnNewSpellsOrTechniques(this.actor, true);
      for (const known of shouldLearn) {
        progress.push({
          img: CONFIG.DC20RPG.ICONS[known],
          label: game.i18n.localize(`dc20rpg.known.${known}`),
          active: false
        });
      }
    }

    // Add Attribute + Skills
    progress.push({
      img: CONFIG.DC20RPG.ICONS.attributes,
      label: "Attributes & Skills",
      active: this.showFinal
    });

    return progress;
  }

  //===========================================
  //             Item Suggestions             =  
  //===========================================
  async _prepareItemSuggestions() {
    const advancement = this.currentAdvancement;
    if (!advancement.allowToAddItems) return;

    this.collectingSuggestedItems = true;
    let type = advancement.addItemsOptions?.itemType;
    const preFilters = advancement.addItemsOptions?.preFilters || "";
    if (!type || type === "any") type = "feature";
    this.itemSuggestions = await collectItemsForType(type);
    this.currentAdvancement.filters = getDefaultItemFilters(preFilters);
    this.currentAdvancement.talentFilterType = this.currentAdvancement.talentFilterType || "general";
    this.collectingSuggestedItems = false;
  }

  _filterSuggestedItems() {
    const advancement = this.currentAdvancement;
    if (!advancement) return [];

    const currentItem = this.currentItem;
    if (!currentItem) return [];

    const talentFilter = advancement.addItemsOptions?.talentFilter;
    const hideOwned = advancement.hideOwned;

    const filters = this._prepareItemSuggestionsFilters();
    if (currentItem.type === "class" && talentFilter && advancement.talentFilterType) {
      filters.push({
        check: (item) => this._talentFilterMethod(item)
      })
    }
    if (currentItem.type === "ancestry") {
      filters.push({
        check: (item) => this._featureSource(item, advancement.featureSourceItem)
      })
    }
    // Stamina/Flavor feature Filter
    filters.push({check: (item) => !item.system.staminaFeature && !item.system.flavorFeature});

    // Name Filter
    filters.push({
      check: (item) => {
        const value = advancement.itemNameFilter;
        if (!value) return true;
        return item.name.toLowerCase().includes(value.toLowerCase());
      }
    })
    
    let filtered = filterDocuments(this.itemSuggestions, filters);
    if (hideOwned) filtered = filtered.filter(item => this.actor.items.getName(item.name) === undefined);

    markItemRequirements(filtered, advancement.talentFilterType, this.actor);
    if (advancement.hideRequirementMissing) return filtered.filter(item => !item.requirementMissing)
    else return filtered;
  }

  _talentFilterMethod(item) {
    const advancement = this.currentAdvancement;
    const type = advancement.talentFilterType;
    switch (type) {
      case "general": 
        return this._featureType(item, "talent") && this._minLevel(item, advancement.level);
      case "class":
        return (this._featureType(item, "class") || this._featureType(item, "subclass")) && this._minLevel(item, advancement.level) && this._featureSource(item, this.currentItem.system.itemKey);
      case "basic":
        return this._featureType(item, "class") && this._minLevel(item, 1) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      case "adept":
        return this._featureType(item, "class") && this._minLevel(item, 2) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      case "expert":
        return (this._featureType(item, "class") || this._featureType(item, "subclass")) && this._minLevel(item, 5) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      case "master":
        return (this._featureType(item, "class") || this._featureType(item, "subclass")) && this._minLevel(item, 6) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      case "grandmaster":
        return (this._featureType(item, "class") || this._featureType(item, "subclass")) && this._minLevel(item, 8) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      case "legendary":
        return (this._featureType(item, "class") || this._featureType(item, "subclass")) && this._minLevel(item, 9) && this._featureSource(item, advancement.featureSourceItem) && this._notCurrentItem(item);
      default:
        return false;
    }
  }

  _featureType(item, expected) {
    return item.system.featureType === expected;
  }

  _minLevel(item, expected) {
    return item.system.requirements.level <= expected;
  }

  _featureSource(item, originName) {
    if (!originName) return true;
    const featureOrigin = item.system.featureSourceItem;
    if (!featureOrigin) return false;

    const origin = featureOrigin.toLowerCase().trim();
    const expectedName = originName.toLowerCase().trim();
    if (origin.includes(expectedName)) return true;
    return false;
  }

  _notCurrentItem(item) {
    const featureOrigin = item.system.featureOrigin;
    if (!featureOrigin) return false;

    const origin = featureOrigin.toLowerCase().trim();
    const currentName = this.currentItem.name.toLowerCase().trim();
    if (origin.includes(currentName)) return false;
    return true;
  }

  _prepareItemSuggestionsFilters() {
    const itemType = this.currentAdvancement.addItemsOptions?.itemType;
    if (!itemType) return [];
    
    const filterObject = this.currentAdvancement.filters;
    if (!filterObject) return [];
    const filters = [
      filterObject.name,
      filterObject.compendium,
      filterObject.sourceName,
      ...Object.values(filterObject[itemType])
    ];
    return filters;
  }

  //===========================================
  //           Activate Listerners            =  
  //===========================================
   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));

    html.find(".apply").click(ev => this._onApply(ev));
    html.find(".revert").click(ev => this._onRevert(ev));
    html.find('.finish').click(ev => this._onFinish(ev));
    html.find(".skip").click(ev => this._onSkip(ev))
    html.find(".select-subclass").click(ev => this._onSelectSubclass(datasetOf(ev).uuid))
    html.find('.item-delete').click(ev => this._onItemDelete(datasetOf(ev).key)); 
    html.find(".path-selector").click(ev => this._onPathMasteryChange(datasetOf(ev).type));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));

    // Spend Points
    html.find(".add-attr").click(ev => this._onAttrChange(datasetOf(ev).key, true));
    html.find(".sub-attr").click(ev => this._onAttrChange(datasetOf(ev).key, false));
    html.find(".skill-point-converter").click(async ev => {await convertSkillPoints(this.actor, datasetOf(ev).from, datasetOf(ev).to, datasetOf(ev).operation, datasetOf(ev).rate); this.render();});
    html.find(".skill-mastery-toggle").mousedown(async ev => {await toggleSkillMastery(datasetOf(ev).type, datasetOf(ev).key, ev.which, this.actor); this.render();});
    html.find(".expertise-toggle").click(async ev => {await manualSkillExpertiseToggle(datasetOf(ev).key, this.actor, datasetOf(ev).type); this.render();});
    html.find(".language-mastery-toggle").mousedown(async ev => {await toggleLanguageMastery(datasetOf(ev).path, ev.which, this.actor); this.render();});

    // Tooltips
    html.find('.item-tooltip').hover(async ev => {
      const item = datasetOf(ev).source === "advancement" ? await this._itemFromAdvancement(datasetOf(ev).itemKey) : await this._itemFromUuid(datasetOf(ev).itemKey);
      itemTooltip(item, ev, html, {position: this._getTooltipPosition(html)});
    },
    ev => hideTooltip(ev, html));
    html.find('.journal-tooltip').hover(ev => {
      const type = datasetOf(ev).type;
      const tooltipList = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.advancementToolitps;
      journalTooltip(tooltipList[type], datasetOf(ev).header, datasetOf(ev).img, ev, html, {position: this._getTooltipPosition(html)})
    },
    ev => hideTooltip(ev, html));
    html.find('.text-tooltip').hover(ev => textTooltip(`<p>${datasetOf(ev).text}</p>`, `[Tip] ${datasetOf(ev).header}`, datasetOf(ev).img, ev, html, {position: this._getTooltipPosition(html)}), ev => hideTooltip(ev, html));

    html.find('.open-compendium-browser').click(() => {
      const itemType = this.currentAdvancement.addItemsOptions.itemType;
      const preFilters = this.currentAdvancement.addItemsOptions.preFilters;
      if (!itemType || itemType === "any") createItemBrowser("advancement", false, this, preFilters);
      else createItemBrowser(itemType, true, this, preFilters);
    });
    html.find('.open-item-suggestions').click(() => this._onOpenSuggestions());
    html.find('.close-item-suggestions').click(() => {this.suggestionsOpen = false; this.render()});
    html.find('.add-edit-item').mousedown(async ev => {
      if (ev.which === 1) this._onItemAdd(datasetOf(ev).uuid);
      else await this._itemFromUuid(datasetOf(ev).uuid).sheet.render(true);
    })
  }

  async _onOpenSuggestions() {
    if (this.collectingSuggestedItems) {
      const dialog =  new SimplePopup("non-closable", {header: "Collecting Suggestions", message: "Collecting Suggested Items... Please wait it might take a while"}, {title: "Popup"});
      await dialog._render(true);

      await new Promise((resolve) => {
        let counter = 0;
        const checkInterval = setInterval(() => {
          if (counter > 40) { // Max 20 seconds waiting time
            ui.notifications.warn("Waiting time exceeded");
            clearInterval(checkInterval);
            resolve();
          }
          if (!this.collectingSuggestedItems) {
            clearInterval(checkInterval);
            resolve();
          }
          counter++;
        }, 500); // Check every 500ms
      });
    
      dialog.close();
    }
    this.suggestionsOpen = true; 
    this.render();
  }

  async _onAttrChange(key, add) {
    await manipulateAttribute(key, this.actor, !add);
    this.render();
  }

  async _onFinish(event) {
    event.preventDefault();
    // Add new resource values
    const scalingValues = await collectScalingValues(this.actor, this.oldSystemData);
    for (const scaling of scalingValues) {
      const resourceKey = scaling.resourceKey;
      if (!resourceKey) continue;
      if (scaling.previous === scaling.current) continue;

      const toAdd = scaling.current - scaling.previous;
      this.actor.resources[resourceKey].regain(toAdd);
    }
    
    this.close();
    return;
  }

  _onSkip(event) {
    event.preventDefault();
    this.selectSubclass = null;
    this._prepareData();
    this.render();
  }

  async _onSelectSubclass(subclassUuid) {
    if (this.applyingAdvancement) return; // When there was a lag user could apply advancement multiple times
    this.applyingAdvancement = true;
    await game.settings.set("dc20rpg", "suppressAdvancements", true);
    
    const subclass = await fromUuid(subclassUuid);
    const createdSubclass = await createItemOnActor(this.actor, subclass.toObject());
    const fromItem = collectAdvancementsFromItem(3, createdSubclass);
    this.advancements.push(...fromItem);

    this.applyingAdvancement = false;
    this.selectSubclass = null;
    this._prepareData();
    this.render();
  }

  _onActivable(pathToValue) {
    let value = getValueFromPath(this.currentAdvancement, pathToValue);
    setValueForPath(this.currentAdvancement, pathToValue, !value);
    this.render();
  }

  _onValueChange(pathToValue, value) {
    setValueForPath(this.currentAdvancement, pathToValue, value);
    this.render();
  }

  _onNumericValueChange(pathToValue, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.currentAdvancement, pathToValue, numericValue);
    this.render();
  }

  _onPathMasteryChange(mastery) {
    this.currentAdvancement.mastery = mastery;
    this.render();
  }

  async _onApply(event) {
    event.preventDefault();
    if (this.applyingAdvancement) return; // When there was a lag user could apply advancement multiple times
    this.applyingAdvancement = true;

    if (!canApplyAdvancement(this.currentAdvancement)) {
      this.applyingAdvancement = false;
      return;
    }
    await this.render();

    const [extraAdvancements, itemTips] = await applyAdvancement(this.currentAdvancement, this.actor, this.currentItem);
    if (this.currentAdvancement.tip) this.tips.push({
      name: this.currentAdvancement.name || this.currentItem.name,
      img: this.currentAdvancement.img || this.currentItem.img, 
      tip: this.currentAdvancement.tip
    });
    if (itemTips.length > 0) {
      this.tips.push(...itemTips);
    }
    
    // Add Extra advancements
    for (const extra of extraAdvancements) {
      await addAdditionalAdvancement(extra, this.currentItem, this.advancements, this.index + 1);
    }

    // Go to next advancement
    if (this.hasNext()) {
      this.next();
    }
    else {
      const toLearn = await shouldLearnNewSpellsOrTechniques(this.actor);
      if (toLearn.length === 0 || this.knownApplied) this.showFinal = true;
      else {
        const addedAdvancements = await addNewSpellTechniqueAdvancements(this.actor, this.currentItem, this.advancements, this.currentAdvancement.level);
        this.knownApplied = true;
        if (addedAdvancements.length > 0) this.next();
      }
    }

    // Render dialog
    this.applyingAdvancement = false;
    this.suggestionsOpen = false;
    this.render();
  }

  async _onRevert(event) {
    event.preventDefault();
    if (this.revertingEnhancement) return; 
    if (!this.hasPrevious()) return;

    this.revertingEnhancement = true;
    await this.render();

    const previousAdvancement = this.advancements[this.index - 1];
    await revertAdvancement(this.actor, previousAdvancement, this.advancements);
 
    // Remove All "Known" advancements but only if previous is not one of them
    if (this.knownApplied && this.currentAdvancement.known && !previousAdvancement.known) {
      const knownAdvancements = this.advancements.filter(adv => adv.known);
      for (const adv of knownAdvancements) {
        await removeAdvancement(this.actor, adv, this.advancements);
      }
      this.knownApplied = false;
    }

    this.index--;
    this.currentAdvancement = previousAdvancement;
    this._prepareItemSuggestions();
    this.revertingEnhancement = false;
    this.render();
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    await this._onItemAdd(droppedObject.uuid);
  }

  async _onItemAdd(itemUuid) {
    const advancement = this.currentAdvancement;
    if (!advancement.allowToAddItems) return;

    const item = await fromUuid(itemUuid);
    if (!["feature", "technique", "spell", "weapon", "equipment", "consumable"].includes(item.type)) return;

    // Can be countent towards known spell/techniques
    const canBeCounted = ["technique", "spell"].includes(item.type);

    // Get item
    advancement.items[item.id] = {
      uuid: itemUuid,
      createdItemId: "",
      selected: true,
      pointValue: item.system.choicePointCost !== undefined ? item.system.choicePointCost : 1,
      mandatory: false,
      removable: true,
      canBeCounted: canBeCounted,
      ignoreKnown: false,
    };
    this.render();
  }

  _onItemDelete(itemKey) {
    const advancement = this.currentAdvancement;
    delete advancement.items[itemKey];
    this.currentItem.update({[`system.advancements.${advancement.key}.items.-=${itemKey}`] : null});
    this.render();
  }

  async _itemFromAdvancement(itemKey) {
    const advancement = this.currentAdvancement;
    const uuid = advancement.items[itemKey].uuid;
    const item = await fromUuid(uuid);
    return item;
  }

  async _itemFromUuid(uuid) {
    const item = await fromUuid(uuid);
    return item;
  }

  setPosition(position) {
    super.setPosition(position);

    this.element.css({
      "min-height": "600px",
      "min-width": "800px",
    })
    this.element.find("#advancement-dialog").css({
      height: this.element.height() -30,
    });
  }

  _getTooltipPosition(html) {
    let position = null;
    const left = html.find(".left-column");
    if (left[0]) {
      position = {
        width: left.width() - 25,
        height: left.height() - 20,
      };
    }
    return position;
  }

  async _render(...args) {
    let scrollPosition = 0;

    let selector = this.element.find('.middle-column');
    if (selector.length > 0) {
      scrollPosition = selector[0].scrollTop;
    }
    
    await super._render(...args);
    
    // Refresh selector
    selector = this.element.find('.middle-column');
    if (selector.length > 0) {
      selector[0].scrollTop = scrollPosition;
    }
  }

  close(options) {
    super.close(options);
    game.settings.set("dc20rpg", "suppressAdvancements", false);
  }
}

/**
 * Creates and returns ActorAdvancement dialog. 
 */
export function actorAdvancementDialog(actor, advancements, oldSystemData, openSubclassSelector) {
  const dialog = new ActorAdvancement(actor, advancements, oldSystemData, openSubclassSelector, {title: `You Become Stronger`});
  dialog.render(true);
}