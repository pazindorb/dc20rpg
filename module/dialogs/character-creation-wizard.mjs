import { createItemOnActor, openItemCompendium, runAdvancements } from "../helpers/actors/itemsOnActor.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { responseListener } from "../helpers/sockets.mjs";
import { generateKey, setValueForPath } from "../helpers/utils.mjs";
import { createMixAncestryDialog } from "./mix-ancestry.mjs";

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
        },
        agi: {
          value: -2,
          mastery: false,
        },
        cha: {
          value: -2,
          mastery: false,
        },
        int: {
          value: -2,
          mastery: false,
        }
      },
      attrPoints: {
        pointsLeft: 12,
        saveMasteries: 2,
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
      inventory: {
        weapons: {
          text: "",
          items: {},
          packName: "weapons"
        },
        armor: {
          text: "",
          items: {},
          packName: "armor"
        },
        other: {
          text: "",
          items: {},
          packName: "other"
        }
      },
    };
    this.step = 0;
    this.fromCompendium = {};
    this._collectFutureData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/character-creation-wizard.hbs",
      classes: ["dc20rpg", "dialog"],
      width: 850,
      height: 600
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
    const startingEquipment = this.actorData["class"]?.system?.startingEquipment;
    if (startingEquipment) {
      this.actorData.inventory.weapons.text = startingEquipment.weapons;
      this.actorData.inventory.armor.text = startingEquipment.armor;
      this.actorData.inventory.other.text = startingEquipment.other;
    }

    return {
      inventory: this.actorData.inventory,
      actorData: this.actorData,
      currentStep: this.step,
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
      selectedItem.descriptionHTML = await TextEditor.enrichHTML(selectedItem.system.description, {secrets:true});
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

    for (const pack of game.packs) {
      if (pack.documentName === "Item") {
        const items = await pack.getDocuments();
        items.filter(item => ["ancestry", "background", "class"].includes(item.type))
          .forEach(item => {
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
    html.find(".input-text").change(ev => setValueForPath(this, datasetOf(ev).path, valueOf(ev)));
    html.find(".input").change(ev => setValueForPath(this, datasetOf(ev).path, parseInt(valueOf(ev))));
    html.find(".manual-switch").click(ev => this._onManualSwitch())
    html.find(".add-attr").click(ev => this._onAttrChange(datasetOf(ev).key, true));
    html.find(".sub-attr").click(ev => this._onAttrChange(datasetOf(ev).key, false));
    html.find(".save-mastery").click(ev => this._onSaveMastery(datasetOf(ev).key));

    html.find(".select-row").click(ev => this._onSelectRow(datasetOf(ev).index, datasetOf(ev).type));
    html.find('.open-compendium').click(() => openItemCompendium("inventory"));
    html.find(".remove-item").click(ev => this._onItemRemoval(datasetOf(ev).id, datasetOf(ev).key));

    html.find(".next").click(ev => this._onNext(ev));
    html.find(".back").click(ev => this._onBack(ev));
    html.find(".create-actor").click(ev => this._onActorCreate(ev));
    html.find('.mix-ancestry').click(async () => {
      const ancestryData = await createMixAncestryDialog();
      ancestryData._id = generateKey();
      ancestryData.merged = true;
      this.fromCompendium["ancestry"].unshift(ancestryData);
      this.render(true);
    });

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
        this.render(true);
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
    this.render(true);
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
    this.render(true);
  }

  _onSaveMastery(key) {
    const newMastery = !this.actorData.attributes[key].mastery;
    if (newMastery && (this.actorData.attrPoints.saveMasteries > 0)) {
      this.actorData.attributes[key].mastery = newMastery;
      this.actorData.attrPoints.saveMasteries --;
    }
    else if (!newMastery) {
      this.actorData.attributes[key].mastery = newMastery;
      this.actorData.attrPoints.saveMasteries ++;
    }
    this.render(true);
  }

  _onSelectRow(index, itemType) {
    const items = this.fromCompendium[itemType];
    this.actorData[itemType] = items[index];
    this.render(true);
  }

  _onBack(event) {
    event.preventDefault();
    this.step--;
    this.render(true);
  }

  _onNext(event) {
    event.preventDefault();
    this.step++;
    this.render(true);
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

    for (const pack of Object.values(this.actorData.inventory)) {
      for (const item of Object.values(pack.items)) {
        await createItemOnActor(actor, item);
      }
    }

    this.close();
    await game.settings.set("dc20rpg", "suppressAdvancements", false);

    await actor.sheet.render(true);
    // Sometimes we need to force advancement window to appear
    if (actor.system.details.class.id !== "") runAdvancements(actor, 1);
  }

  async _createActor() {
    const actorData = this._prepareActorData();
    if (game.user.isGM) return await Actor.create(actorData);

    const activeGM = game.users.activeGM;
    if (!activeGM) {
      ui.notifications.error("There is no active GM. Actor cannot be created.");
      return;
    }

    game.socket.emit('system.dc20rpg', { 
      actorData: actorData,
      gmUserId: activeGM.id,
      type: "createActor"
    });

    const actorId = await responseListener("actorCreated", game.user.id);
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
            saveMastery: attributes.mig.mastery,
            current: attributes.mig.value
          },
          agi: {
            saveMastery: attributes.agi.mastery,
            current: attributes.agi.value
          },
          cha: {
            saveMastery: attributes.cha.mastery,
            current: attributes.cha.value
          },
          int: {
            saveMastery: attributes.int.mastery,
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
    if (item.type === "weapon") this.actorData.inventory.weapons.items[item._id] = item;
    else if (item.type === "equipment") this.actorData.inventory.armor.items[item._id] = item;
    else if (["consumable", "tool", "loot"].includes(item.type)) this.actorData.inventory.other.items[item._id] = item;
    this.render(true);
  }

  _onItemRemoval(id, key) {
    delete this.actorData.inventory[key].items[id];
    this.render(true);
  }
}

export function characterCreationWizardDialog() {
  const dialog = new CharacterCreationWizard({title: `Character Creation Wizard`});
  dialog.render(true);
}