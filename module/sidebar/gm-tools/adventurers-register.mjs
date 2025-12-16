import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { getValueFromPath, toSelectOptions } from "../../helpers/utils.mjs";

export class AdventurersRegister extends DC20Dialog {

  constructor(options = {}) {
    super(options);
    this.selectedGroup = "";
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
    initialized.position.width = 600;
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

    this._prepareSkillsAndLanguages(context, adventurers);

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

  _prepareSkillsAndLanguages(context, adventurers) {
    let skillHeaderGrid = "1fr";
    let skillRowGrid = "1fr";
    let languageGrid = "1fr";

    const header = [];
    const allSkills = {};
    const allLanguages = {};
    for (let i = 0; i < adventurers.length; i++) {
      skillHeaderGrid += " 80px";
      skillRowGrid += " 40px 40px";
      languageGrid += " 60px";
      
      const actor = adventurers[i];
      header.push({name: actor.name, img: actor.img});

      // Skills 
      for (const skill of Object.values(actor.skillAndLanguage.skills)) {
        if (!allSkills[skill.key]) {
          allSkills[skill.key] = {
            label: skill.label,
            key: skill.key,
            value: new Array(adventurers.length).fill({modifier: null, passive: null, actorId: null})
          }
        }
        allSkills[skill.key].value[i] = {
          modifier: skill.modifier, 
          passive: 10 + skill.modifier, 
          actorId: actor.id
        };
      }

      // Languages
      for (const language of Object.values(actor.skillAndLanguage.languages)) {
        if (!allLanguages[language.key]) {
          allLanguages[language.key] = {
            label: language.label,
            mastery: new Array(adventurers.length).fill(null)
          }
        }
        allLanguages[language.key].mastery[i] = language.mastery;
      }
    }

    context.skillGrid = {
      header: skillHeaderGrid,
      row: skillRowGrid,
    };
    context.header = header;
    context.skills = allSkills;
    context.languageGrid = languageGrid;
    context.languages = allLanguages;
  }

  _prepareLanguages(context, adventurers) {
    let languageGrid = "1fr";

    const header = [];
    const allLanguages = {};
    for (let i = 0; i < adventurers.length; i++) {
      languageGrid += " 60px";
      
      const actor = adventurers[i];
      header.push({name: actor.name, img: actor.img});

      for (const language of Object.values(actor.skillAndLanguage.languages)) {
        if (!allLanguages[language.key]) {
          allLanguages[language.key] = {
            label: language.label,
            mastery: new Array(adventurers.length).fill(null)
          }
        }
        allLanguages[language.key].mastery[i] = language.mastery;
      }
    }

    context.languageGrid = languageGrid;
    context.languageHeader = header;
    context.languages = allLanguages;
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
    if (actor) actor.roll(dataset.key, dataset.type, {sendToActorOwners: true});
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

  async _onChangeNumeric(path, value, nullable, dataset) {
    const actorId = dataset.actorId;
    if (!actorId) super._onChangeNumeric(path, value, nullable, dataset);

    const actor = this.allAdventurers.find(actor => actorId === actor.id);
    if (!actor) return;

    await actor.update({[path]: parseInt(value)});
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