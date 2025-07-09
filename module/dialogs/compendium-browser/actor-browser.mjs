import { activateDefaultListeners, datasetOf } from "../../helpers/listenerEvents.mjs";
import { collectActors, filterDocuments, getDefaultActorFilters } from "./browser-utils.mjs";

export class ActorBrowser extends Dialog {

  constructor(dialogData = {}, options = {}) {
    super(dialogData, options);
    this.collectedActors = [];
    this.filteredActors = [];
    this.filters = getDefaultActorFilters();
    this._collectActors();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/compendium-browser/actor-browser.hbs",
      classes: ["dc20rpg", "dialog"],
      dragDrop: [
        {dragSelector: ".actor-row[data-uuid]", dropSelector: null},
      ],
      width: 850,
      height: 650,
      resizable: true,
      draggable: true,
    });
  }

  async getData() {
    const filters = Object.values(this.filters);
    const filteredActors = filterDocuments(this.collectedActors, Object.values(this.filters));
    return {
      collectedActors: filteredActors,
      filters: filters,
      collectingData: this.collectingData
    }
  }

  async _collectActors() {
    this.collectingData = true;
    this.collectedActors = await collectActors();
    this.collectingData = false;
    this.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);
    activateDefaultListeners(this, html);
    html.find(".show-actor").click(ev => this._showActor(datasetOf(ev).uuid));
    html.find(".import-actor").click(ev => this._onImportActor(ev));

    // Drag and drop events
    html[0].addEventListener('dragover', ev => ev.preventDefault());
  }

  async _showActor(uuid) {
    const actor = await fromUuid(uuid);
    if (actor) actor.sheet.render(true);
  }

  async _onImportActor(ev) {
    ev.stopPropagation();
    const actor = await fromUuid(datasetOf(ev).uuid);
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

  setPosition(position) {
    super.setPosition(position);

    this.element.css({
      "min-height": "400px",
      "min-width": "600px",
    })
    this.element.find("#compendium-browser").css({
      height: this.element.height() -30,
    });
  }
}

let actorBrowserInstance = null;
export function createActorBrowser() {
  if (actorBrowserInstance) actorBrowserInstance.close();
  const dialog = new ActorBrowser({title: `Actor Browser`});
  dialog.render(true);
  actorBrowserInstance = dialog;
}