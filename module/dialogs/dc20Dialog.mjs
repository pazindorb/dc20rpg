import { tooltipElement, tooltipListeners } from "../helpers/tooltip.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class DC20Dialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "dialog-{id}",
    classes: ["dc20rpg themed"],
    position: {width: 350},
    window: {
      title: "Dialog",
      icon: "fa-solid fa-window",
    },
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    const colorTheme = game.settings.get("core", "uiConfig").colorScheme.applications;
    initialized.classes.push(`theme-${colorTheme}`);
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const colorTheme = game.settings.get("core", "uiConfig").colorScheme.applications;
    context.cssClass = `theme-${colorTheme}`;
    
    // Get active tab
    if (context.tabs) {
      const active = Object.values(context.tabs).find(tab => tab.active);
      if (active) context.activeTab = active.id;
    }
    return context;
  }

  _attachFrameListeners() {
    super._attachFrameListeners();
    this.window.content.addEventListener("change", this._onChange.bind(this));
    this.window.content.addEventListener("click", this._onClick.bind(this));
    this.window.content.addEventListener("drop", this._onDrop.bind(this));
    this.window.content.addEventListener("mouseover", this._onHover.bind(this));
    this.window.content.addEventListener("mouseout", this._onHover.bind(this));
  }

  async _renderFrame(options) {
    const frame = await  super._renderFrame(options);
    frame.appendChild(tooltipElement())
    return frame;
  }

  async _onChange(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "string": await this._onChangeString(path, value, dataset); break;
      case "numeric": await this._onChangeNumeric(path, value, false, dataset); break;
      case "numeric-nullable": await this._onChangeNumeric(path, value, true, dataset); break;
      case "boolean" : await this._onChangeBoolean(path, dataset); break;
      case "multi-select": await this._onMultiSelectChange(path, value, dataset); break;
    }
  }

  async _onClick(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const value = dataset.value;
    const path = dataset.path;
    const limit = dataset.limit ? parseInt(dataset.limit) : 0;

    switch (cType) {
      case "activable": await this._onActivable(path, dataset); break;
      case "remove-option": await this._onRemoveOption(path, value, dataset); break;
      case "toggle": await this._onToggle(path, event.which, limit, dataset); break;
    }
  }

  _onHover(event) {
    const target = event.target;
    const dataset = target.dataset;
    const hover = dataset.hover;
    const isEntering = event.type === "mouseover";

    switch (hover) {
      case "tooltip": tooltipListeners(event, dataset.tooltipType, isEntering, dataset, $(this.element)); break;
    }
  }

  async _onActivable(path, dataset) {
    const value = getValueFromPath(this, path);
    await this._update(path, !value);
    this.render();
  }

  async _onToggle(path, which, limit, dataset) {
    const value = getValueFromPath(this, path);
    switch (which) {
      case 1: 
        await this._update(path, Math.min(value + 1, limit));
        break;
      case 3: 
        await this._update(path, Math.max(value - 1, limit));
        break;
    }
    this.render();
  }

  async _onChangeString(path, value, dataset) {
    await this._update(path, value);
    this.render();
  }

  async _onChangeNumeric(path, value, nullable, dataset) {
    let numericValue = parseInt(value);
    if (nullable && isNaN(numericValue)) numericValue = null;
    await this._update(path, numericValue);
    this.render();
  }

  async _onChangeBoolean(path, dataset) {
    const value = getValueFromPath(this, path);
    await this._update(path, !value);
    this.render();
  }

  async _onMultiSelectChange(path, value, dataset) {
    if (!value) return;
    const array = getValueFromPath(this, path);
    if (array.indexOf(value) !== -1) return;
    array.push(value);
    await this._update(path, array);
    this.render();
  }

  async _onRemoveOption(path, value, dataset) {
    const array = getValueFromPath(this, path);
    const index = array.indexOf(value);
    if (index === -1) return;
    array.splice(index, 1);
    await this._update(path, array);
    this.render();
  }

  async _onDrop(event) {
    event.preventDefault();
    const droppedData  = event.dataTransfer.getData('text/plain');
    if (!droppedData) return;

    const droppedObject = JSON.parse(droppedData);
    return droppedObject;
  }

  async _update(path, value) {
    if (this.updateObject) await this.updateObject.update({[path]: value});
    else setValueForPath(this, path, value);
  }
}