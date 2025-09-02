import { createItemOnActor, runAdvancements } from "../../../helpers/actors/itemsOnActor.mjs";
import { datasetOf, valueOf } from "../../../helpers/listenerEvents.mjs";
import { responseListener } from "../../../helpers/sockets.mjs";
import { generateKey, setValueForPath } from "../../../helpers/utils.mjs";
import { createItemBrowser } from "../../../dialogs/compendium-browser/item-browser.mjs";
import { createMixAncestryDialog } from "../../../dialogs/mix-ancestry.mjs";
import { hideTooltip, itemTooltip } from "../../../helpers/tooltip.mjs";
import { openItemCreator } from "../../../dialogs/item-creator.mjs";

export class CharacterCreationWizard extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actorData = {
      name: "",
      img: "icons/svg/mystery-man.svg",
      attributes: {
        mig: {
          value: -2,
          mastery: false,
          label: "Might"
        },
        agi: {
          value: -2,
          mastery: false,
          label: "Agility"
        },
        cha: {
          value: -2,
          mastery: false,
          label: "Charisma"
        },
        int: {
          value: -2,
          mastery: false,
          label: "Inteligence"
        }
      },
      attrPoints: {
        pointsLeft: 12,
        manual: false,
      },
      class: {
        _id: "",
        name: "Class",
        img: "icons/svg/mystery-man.svg"
      },
      ancestry: {
        _id: "",
        name: "Ancestry",
        img: "icons/svg/angel.svg"
      },
      background: {
        _id: "",
        name: "Background",
        img: "icons/svg/village.svg"
      },
      startingEquipment: {}
    };
    this.step = 0;
    this.fromCompendium = {};
    this._collectFutureData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/character-progress/character-creation-wizard.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 1200,
      height: 800,
      resizable: true,
      draggable: true,
    });
  }

  async getData() {
    switch(this.step) {
      case 0: return this._basic();
      case 1: return await this._uniqueItems("ancestry");
      case 2: return await this._uniqueItems("background")
      case 3: return await this._uniqueItems("class");
      case 4: return this._equipment();
    }
  }

  _basic() {
    const disableNext = this.actorData.name === "" || !(this.actorData.attrPoints.manual || this.actorData.attrPoints.pointsLeft === 0);
    return {
      disableNext: disableNext,
      actorData: this.actorData,
      currentStep: this.step,
    }
  }

  _equipment() {
    return {
      startingEquipment: this.actorData.startingEquipment,
      actorData: this.actorData,
      currentStep: this.step,
      createActorRequestSend: this.createActorRequestSend
    }
  }

  async _uniqueItems(itemType) {
    // Check, maybe we already collected that item type
    let collectedItems = [];
    if (this.fromCompendium[itemType] !== undefined) {
      collectedItems = this.fromCompendium[itemType];
    }
    else {
      collectedItems = await this._collectItemsFor(itemType);
      this.fromCompendium[itemType] = collectedItems;
    }
    const selectedItem = this.actorData[itemType];

    let shouldDisable = false;
    if (selectedItem._id === "") {
      shouldDisable = true;
      selectedItem.descriptionHTML = "<p>Select Item</p>";
    }
    else {
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      selectedItem.descriptionHTML = await TextEditor.enrichHTML(selectedItem.system.description, {secrets:true, autoLink:true});
    }

    return {
      disableNext: shouldDisable,
      actorData: this.actorData,
      currentStep: this.step,
      itemType: itemType,
      collectedItems: collectedItems,
      selectedItem: selectedItem
    }
  }

  async _collectFutureData() {
    const classes = [];
    const ancestries = [];
    const backgrounds = [];

    const hideItems = game.dc20rpg.compendiumBrowser.hideItems;
    for (const pack of game.packs) {
      if (pack.documentName === "Item") {
        const packageType = pack.metadata.packageType;
        const items = await pack.getDocuments();
        items.filter(item => ["ancestry", "background", "class"].includes(item.type))
          .forEach(item => {
            if (packageType === "system" && hideItems.has(item.id)) return;
            if (item.type === "ancestry") ancestries.push(item);
            if (item.type === "background") backgrounds.push(item);
            if (item.type === "class") classes.push(item);
          })
      }
    }
    this._sort(ancestries);
    this._sort(backgrounds);
    this._sort(classes);
    this.fromCompendium["ancestry"] = ancestries;
    this.fromCompendium["background"] = backgrounds;
    this.fromCompendium["class"] = classes;
  }

  _sort(array) {
    array.sort(function(a, b) {
      const textA = a.name.toUpperCase();
      const textB = b.name.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  async _collectItemsFor(itemType) {
    const collected = [];
    for (const pack of game.packs) {
      if (pack.documentName === "Item") {
        const items = await pack.getDocuments();
        const found = items.filter(item => item.type === itemType);
        collected.push(...found);
      }
    }
    return collected;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".image-picker").click(() => this._onImagePicker());
    html.find(".input-text").change(ev => {
      setValueForPath(this, datasetOf(ev).path, valueOf(ev))
      this.render();
    });
    html.find(".input").change(ev => {
      setValueForPath(this, datasetOf(ev).path, parseInt(valueOf(ev)))
      this.render();
    });
    html.find(".input-numeric").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".manual-switch").click(ev => this._onManualSwitch())
    html.find(".add-attr").click(ev => this._onAttrChange(datasetOf(ev).key, true));
    html.find(".sub-attr").click(ev => this._onAttrChange(datasetOf(ev).key, false));

    html.find(".select-row").click(ev => this._onSelectRow(datasetOf(ev).index, datasetOf(ev).type));
    html.find('.open-compendium').click(ev => this._onOpenCompendium(ev));
    html.find('.open-item-creator').click(ev => this._onItemCreator(ev));
    html.find(".remove-item").click(ev => this._onItemRemoval(datasetOf(ev).storageKey));

    html.find(".next").click(ev => this._onNext(ev));
    html.find(".back").click(ev => this._onBack(ev));
    html.find(".create-actor").click(ev => this._onActorCreate(ev));
    html.find('.ancestry-mix').click(async () => {
      const ancestryData = await createMixAncestryDialog();
      if (!ancestryData) return;
      ancestryData._id = generateKey();
      ancestryData.merged = true;
      this.fromCompendium["ancestry"].unshift(ancestryData);
      this.render();
    });
    html.find('.content-link').hover(async ev => itemTooltip(await this._itemFromUuid(datasetOf(ev).uuid), ev, html, {position: this._getTooltipPosition(html)}), ev => hideTooltip(ev, html));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
    html[0].addEventListener('drop', async ev => await this._onDrop(ev));
  }

  _onImagePicker() {
    new FilePicker({
      type: "image",
      displayMode: "tiles",
      callback: (path) => {
        if (!path) return;
        this.actorData.img = path;
        this.render();
      }
    }).render();
  }

  _onManualSwitch() {
    const willBeManual = !this.actorData.attrPoints.manual;
    this.actorData.attrPoints.manual = willBeManual;

    if (!willBeManual) {
      this.actorData.attributes.mig.value = -2; 
      this.actorData.attributes.agi.value = -2;
      this.actorData.attributes.cha.value = -2;
      this.actorData.attributes.int.value = -2;
      this.actorData.attrPoints.pointsLeft = 12;
    }
    this.render();
  }

  _onAttrChange(key, add) {
    const current = this.actorData.attributes[key].value;
    if (add && (current < 3) && (this.actorData.attrPoints.pointsLeft > 0)) {
      this.actorData.attributes[key].value = current + 1;
      this.actorData.attrPoints.pointsLeft--;
    }
    else if (!add && (current > -2)){
      this.actorData.attributes[key].value = current - 1;
      this.actorData.attrPoints.pointsLeft++;
    }
    this.render();
  }

  _onSelectRow(index, itemType) {
    const items = this.fromCompendium[itemType];
    this.actorData[itemType] = items[index];

    if (itemType === "class") {
      this.actorData.startingEquipment = foundry.utils.deepClone(this.actorData["class"].system.startingEquipment);
    }
    this.render();
  }

  _onNumericValueChange(pathToValue, value) {
    const numericValue = parseInt(value);
    setValueForPath(this, pathToValue, numericValue);
    this.render();
  }

  _onBack(event) {
    event.preventDefault();
    this.step--;
    this.render();
  }

  _onNext(event) {
    event.preventDefault();
    this.step++;
    this.render();
  }

  async _onActorCreate(event) {
    event.preventDefault();

    // We dont want advancement window to appear after every unique item added
    await game.settings.set("dc20rpg", "suppressAdvancements", true);
    // Create actor
    const actor = await this._createActor();
    if (!actor) {
      await game.settings.set("dc20rpg", "suppressAdvancements", false);
      return;
    }

    // Add items to actor
    await createItemOnActor(actor, this.actorData.ancestry);
    await createItemOnActor(actor, this.actorData.background);
    await createItemOnActor(actor, this.actorData.class);

    for (const equipment of Object.values(this.actorData.startingEquipment)) {
      const itemData = equipment.itemData;
      if (itemData?.name) await createItemOnActor(actor, itemData);
    }

    // Refresh actor resources
    actor.resources.iterate().forEach(resource => resource.regain("max"));

    this.close();
    await game.settings.set("dc20rpg", "suppressAdvancements", false);

    await actor.sheet.render(true, { focus: false });
    // Sometimes we need to force advancement window to appear
    if (actor.system.details.class.id !== "") runAdvancements(actor, 1);
  }

  async _createActor() {
    const actorData = this._prepareActorData();
    if (Actor.canUserCreate(game.user)) return await Actor.create(actorData);

    const activeGM = game.users.activeGM;
    if (!activeGM) {
      ui.notifications.error("You have no permissions to create a new Actor and there is no active GM. Actor cannot be created.");
      return;
    }

    game.socket.emit('system.dc20rpg', { 
      actorData: actorData,
      gmUserId: activeGM.id,
      type: "createActor"
    });
    this.createActorRequestSend = true;
    this.render();

    const actorId = await responseListener("actorCreated", {emmiterId: game.user.id});
    return game.actors.get(actorId);
  }

  _prepareActorData() {
    const attributes = this.actorData.attributes;
    const maxPoints = 8 + attributes.mig.value + attributes.agi.value + attributes.cha.value + attributes.int.value;

    return {
      forceCreate: true,
      name: this.actorData.name,
      type: "character",
      img: this.actorData.img,
      ownership: {
        [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      },
      system: {
        attributes: {
          mig: {
            current: attributes.mig.value
          },
          agi: {
            current: attributes.agi.value
          },
          cha: {
            current: attributes.cha.value
          },
          int: {
            current: attributes.int.value
          },
        },
        attributePoints: {
          max: maxPoints
        }
      }
    }
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;
    
    const droppedObject = JSON.parse(droppedData);
    if (droppedObject.type !== "Item") return;

    const item = await Item.fromDropData(droppedObject);
    const itemKey = droppedObject.itemKey;

    if (itemKey) {
      this.actorData.startingEquipment[itemKey].itemData = item.toObject();
    }
    else {
      this.actorData.startingEquipment[generateKey()] = {
        label: "Extra Item",
        extraItem: true,
        itemData: item.toObject()
      }
    }
    
    this.render();
  }

  _onItemRemoval(storagekey) {
    const storage = this.actorData.startingEquipment[storagekey];
    if (storage.extraItem) delete this.actorData.startingEquipment[storagekey];
    else delete this.actorData.startingEquipment[storagekey].itemData;
    this.render();
  }

  _onOpenCompendium(event) {
    const key = datasetOf(event).key;
    const slot = datasetOf(event).slot;
    let itemType = "inventory";
    let filters = "";
    let lockItemType = false;

    if (slot === "armor" || slot === "shield") {
      itemType = "equipment";
      lockItemType = true;
    }
    if (slot === "weapon" || slot === "ranged") {
      itemType === "weapon"
      lockItemType = true;
    }
    createItemBrowser(itemType, lockItemType, this, filters, {itemKey: key});
  }

  async _onItemCreator(event) {
    const key = datasetOf(event).key;
    const slot = datasetOf(event).slot;

    let itemData = null;
    if (slot === "armor") 
      itemData = await openItemCreator("equipment", {subTypes: CONFIG.DC20RPG.DROPDOWN_DATA.armorTypes});
    if (slot === "shield") 
      itemData = await openItemCreator("equipment", {subTypes: CONFIG.DC20RPG.DROPDOWN_DATA.shieldTypes});
    if (slot === "weapon" || slot === "ranged") 
      itemData = await openItemCreator("weapon", {subTypes: CONFIG.DC20RPG.DROPDOWN_DATA.weaponTypes});

    if (itemData) this.actorData.startingEquipment[key].itemData = itemData;
    this.render();
  }

  async _itemFromUuid(uuid) {
    const item = await fromUuid(uuid);
    return item;
  }

  async _render(...args) {
    let scrollPosition = 0;

    let selector = this.element.find('.item-selector');
    if (selector.length > 0) {
      scrollPosition = selector[0].scrollTop;
    }
    
    await super._render(...args);
    
    // Refresh selector
    selector = this.element.find('.item-selector');
    if (selector.length > 0) {
      selector[0].scrollTop = scrollPosition;
    }
  }

  setPosition(position) {
    super.setPosition(position);

    this.element.css({
      "min-height": "600px",
      "min-width": "800px",
    })
    this.element.find("#character-creation-wizard").css({
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
}

export function characterCreationWizardDialog() {
  const dialog = new CharacterCreationWizard({title: `Character Creation Wizard`});
  dialog.render(true);
}