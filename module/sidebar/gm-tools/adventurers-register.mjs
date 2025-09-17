import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { getValueFromPath, toSelectOptions } from "../../helpers/utils.mjs";
import { DC20Roll } from "../../roll/rollApi.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";

export class AdventurersRegister extends DC20Dialog {

  constructor(options = {}) {
    super(options);
    this.selectedGroup = "";
    this.activeTab = ""
    this.selectedAttribute = "";
    this._prepareAdventurers();
  }

  _prepareAdventurers() {
    this.allAdventurers = game.actors.filter(actor => actor.type === "character");
    this.groups = game.settings.get("dc20rpg", "adventurersGroups");
    
    if (this.groups.length > 0) {
      this.selectedGroup = game.settings.get("dc20rpg", "mainAdventurersGroup");
    }
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/gm-tools/adventurers-register.hbs",
    }
  };

  static TABS = {
    sheet: {
      tabs: [
        {id: "core", icon: "fa-solid fa-book"},
        {id: "combat", icon: "fa-solid fa-swords"},
        {id: "attr", icon: "fa-solid fa-dumbbell"},
        {id: "skills", icon: "fa-solid fa-pen-ruler"},
        {id: "languages", icon: "fa-solid fa-comments"},
        {id: "advanced", icon: "fa-solid fa-gear"},
      ],
      initial: "core",
      labelPrefix: "dc20rpg.dialog.adventurersRegister.tab"
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Adventurer's Register";
    initialized.window.icon = "fa-solid fa-book-open-cover";
    initialized.position.width = 560;
    initialized.actions.roll = this._onCallRoll;
    initialized.actions.sheet = this._onSheetOpen;
    initialized.actions.addToGroup = this._onAddToGroup;
    initialized.actions.removeFromGroup = this._onRemoveFromGroup;
    initialized.actions.addGroup = this._onAddNewGroup;
    initialized.actions.removeGroup = this._onRemoveGroup;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const adventurers = this._prepareGroup();
    const selectedActor = adventurers.find(actor => actor.id === this.selectedActorId);

    context.groups = toSelectOptions(this.groups, "name", "name");
    context.selectedGroup = this.selectedGroup;
    context.adventurers = adventurers;
    context.actors = this._prepareActorsToSelect(adventurers);
    context.selectedActorId = this.selectedActorId;
    context.selectedActor = selectedActor;
    if (selectedActor) {
      context.actorPaths = this._actorPaths(selectedActor.system);
      context.selectedPath = this.selectedPath;
      context.selectedPathValue = getValueFromPath(selectedActor, `system.${this.selectedPath}`)
    }
    return context;
  }

  _prepareGroup() {
    const selected = this.selectedGroup;
    if (!selected) return this.allAdventurers;

    const group = this.groups.find(group => group.name === selected);
    if (!group) return [];

    return this.allAdventurers.filter(actor => group.adventurers[actor.id]);
  }

  _prepareActorsToSelect(adventurers) {
    const options = {};
    adventurers.forEach(actor => options[actor.id] = actor.name);
    return options;
  }

  _actorPaths(actor) {
    const paths = this.#getActorPaths(actor);
    const selectOptions = {};
    paths.forEach(path => selectOptions[path] = path);
    return selectOptions;
  }

  #getActorPaths(object, prefix="") {
    let paths = [];
    for (const key in object) {
      const value = object[key];
      const path = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        paths = paths.concat(this.#getActorPaths(value, path));
      } else {
        paths.push(path);
      }
    }
    return paths;
  }

  _onCallRoll(event, target) {
    const dataset = target.dataset;
    const actor = this.allAdventurers.find(actor => dataset.actorId === actor.id);
    if (!actor) return;

    const details = dataset.type === "save" 
                        ? DC20Roll.prepareSaveDetails(dataset.key) 
                        : DC20Roll.prepareCheckDetails(dataset.key);

    RollDialog.open(actor, details, {sendToActorOwners: true});
  }

  _onSheetOpen(event, target) {
    const actorId = target.dataset?.actorId;
    const actor = this.allAdventurers.find(actor => actorId === actor.id);
    if (!actor) return;
    actor.sheet.render(true);
  }

  async _onAddNewGroup(event, target) {
    const name = await SimplePopup.input("Group Name");
    if (!name) return;

    this.groups.push({
      name: name,
      adventurers: {}
    });
    this.render();
  }

  async _onAddToGroup(event, target) {
    const actorId = target.dataset?.actorId;
    if (!actorId) return;

    const groupName = await SimplePopup.select("Select Group", toSelectOptions(this.groups, "name", "name"));
    const group = this.groups.find(group => group.name === groupName);
    if (!group) return;

    group.adventurers[actorId] = actorId;
    this.render();
  }

  _onRemoveFromGroup(event, target) {
    const actorId = target.dataset?.actorId;
    if (!actorId) return;

    const group = this.groups.find(group => group.name === this.selectedGroup);
    if (!group) return;

    delete group.adventurers[actorId];
    this.render();
  }

  _onRemoveGroup(event, target) {
    const index = this.groups.findIndex(group => group.name === this.selectedGroup);
    if (index !== -1) this.groups.splice(index, 1);
    this.selectedGroup = "";
    this.render();
  }

  close() {
    game.settings.set("dc20rpg", "adventurersGroups", this.groups);
    game.settings.set("dc20rpg", "mainAdventurersGroup", this.selectedGroup);
    super.close();
  }
}

export function openAdventurersRegister() {
  new AdventurersRegister().render(true);
}