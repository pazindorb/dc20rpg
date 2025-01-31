import { activateDefaultListeners, datasetOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class ActorBrowser extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedActors = [];
    this.filteredActors = [];
    this.filters = this._prepareFilters();
    this._collectActors();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/actor-browser.hbs",
      classes: ["dc20rpg", "dialog"],
      dragDrop: [
        {dragSelector: ".actor-row[data-uuid]", dropSelector: null},
      ],
      width: 795,
      height: 640
    });
  }

  _prepareFilters() {
    return {
      name: this._filter("text"),
      levelFrom: this._filter("number", NaN),
      levelTo: this._filter("number", NaN),
      compendium: this._filter("multi-select", {
        system: true,
        world: true,
        module: true
      }),
      type: this._filter("multi-select", {
        character: false,
        npc: true,
        companion: false
      }),
      category: this._filter("text"),
      creatureType: this._filter("text")
    }
  }

  _filter(filterType, defaultValue, options) {
    return {
      filterType: filterType,
      value: defaultValue || "",
      options: options
    }
  }

  async getData() {
    const filteredActors = this._getFilteredActors();
    this.filteredActors = filteredActors;
    return {
      collectedActors: filteredActors,
      collectingData: this.collectingData,
      filters: this.filters
    }
  }

  async _collectActors() {
    this.collectingData = true;
    const userRole = CONST.USER_ROLE_NAMES[game.user.role];
    const collectedActors = [];
    for (const pack of game.packs) {
      const packOwnership = pack.ownership[userRole];
      if (packOwnership === "NONE") continue;

      if (pack.documentName === "Actor") {
        if (pack.isOwner) continue;
        const actors = await pack.getDocuments();
        for(const actor of actors) {
          actor.fromPack = pack.metadata.packageType;
          collectedActors.push(actor);
        }
      }
    }
    this._sort(collectedActors);
    this.collectedActors = collectedActors;
    this.collectingData = false;
    this.render(true);
  }

  _sort(array) {
    array.sort(function(a, b) {
      const textA = a.name.toUpperCase();
      const textB = b.name.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
  }

  _getFilteredActors() {
    const filters = this.filters;
    return this.collectedActors
                  .filter(actor => actor.name.toLowerCase().includes(filters.name.value.toLowerCase()))
                  .filter(actor => filters.compendium.value[actor.fromPack])
                  .filter(actor => filters.type.value[actor.type])
                  .filter(actor => isNaN(filters.levelFrom.value) || filters.levelFrom.value === "" || actor.system.details.level >= filters.levelFrom.value)
                  .filter(actor => isNaN(filters.levelTo.value) || filters.levelTo.value === "" || actor.system.details.level <= filters.levelTo.value)
                  .filter(actor => !actor.system.details.category || actor.system.details.category.toLowerCase().includes(filters.category.value.toLowerCase()))
                  .filter(actor => !actor.system.details.creatureType || actor.system.details.creatureType.toLowerCase().includes(filters.creatureType.value.toLowerCase()))
  }

  activateListeners(html) {
    super.activateListeners(html);
    activateDefaultListeners(this, html);
    html.find(".show-actor").click(ev => this._showActor(datasetOf(ev).index));
    html.find(".add-actor").click(ev => this._onAddActor(ev));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
  }

  _showActor(index) {
    const actor = this.filteredActors[index];
    if (actor) actor.sheet.render(true);
  }

  async _onAddActor(event) {
    event.stopPropagation();
    const index = datasetOf(event).index;
    const actor = this.filteredActors[index];
    if (!actor) return;
    const createdActor = await Actor.create(actor);
    createdActor.sheet.render(true);
  }

  async _render(...args) {
    const selector = this.element.find('.item-selector');
    let scrollPosition = 0;

    if (selector.length > 0) scrollPosition = selector[0].scrollTop;
    await super._render(...args);
    if (selector.length > 0) {
      this.element.find('.item-selector')[0].scrollTop = scrollPosition;
    }
  }

  _onDragStart(event) {
    const dataset = event.currentTarget.dataset;
    dataset.type = "Actor";
    event.dataTransfer.setData("text/plain", JSON.stringify(dataset));
  }
}

export function createActorBrowser() {
  const dialog = new ActorBrowser({title: `Actor Browser`});
  dialog.render(true);
}