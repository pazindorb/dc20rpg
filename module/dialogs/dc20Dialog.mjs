import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

export class DC20Dialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "dialog-{id}",
    classes: ["dc20rpg"],
    position: {width: 350},
    window: {
      title: "Dialog",
      icon: "fa-solid fa-window",
    },
  }

  _attachFrameListeners() {
    super._attachFrameListeners();

    this.window.content.addEventListener("change", this._onChange.bind(this));
    this.window.content.addEventListener("click", this._onClick.bind(this));
  }

  _onChange(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;
    const value = target.value;

    switch (cType) {
      case "string": this._onChangeString(path, value, dataset); break;
      case "numeric": this._onChangeNumeric(path, value, false, dataset); break;
      case "numeric-nullable": this._onChangeNumeric(path, value, true, dataset); break;
    }
  }

  _onClick(event) {
    const target = event.target;
    const dataset = target.dataset;
    const cType = dataset.ctype;
    const path = dataset.path;

    switch (cType) {
      case "activable": this._onActivable(path, dataset); break;
    }
  }

  _onActivable(path, dataset) {
    const value = getValueFromPath(this, path);
    setValueForPath(this, path, !value);
    this.render();
  }

  _onChangeString(path, value, dataset) {
    setValueForPath(this, path, value);
    this.render();
  }

  _onChangeNumeric(path, value, nullable, dataset) {
    let numericValue = parseInt(value);
    if (nullable && isNaN(numericValue)) numericValue = null;
    setValueForPath(this, path, numericValue);
    this.render();
  }

  // TODO: Move Simple Popup here?
}