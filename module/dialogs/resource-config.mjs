import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Dialog window for different actor configurations.
 */
export class ResourceConfigDialog extends Dialog {

  constructor(actor, resourceKey, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.key = resourceKey;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  /** @override */
  get template() {
    return "systems/dc20rpg/templates/dialogs/resource-config-dialog.hbs";
  }

  getData() {
    const resourceKey = this.key;
    const resource = this.actor.system.resources.custom[resourceKey];
    const resetTypes = DC20RPG.DROPDOWN_DATA.resetTypes;

    return {
      ...resource,
      resetTypes,
      resourceKey
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".save").click((ev) => this._onSave(ev));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));
  }

  _onSave(event) {
    event.preventDefault();
    const updatePath = `system.resources.custom.${this.key}`;
    const updateData = getValueFromPath(this.actor, updatePath);
    if (updateData.bonus) delete updateData.bonus; // We do not want to commit any bonuses
    this.actor.update({ [updatePath] : updateData });
    this.close();
  }

  _onValueChange(path, value) {
    setValueForPath(this.actor, path, value);
    this.render(true);
  }

  _onNumericValueChange(path, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.actor, path, numericValue);
    this.render(true);
  }
}

export function resourceConfigDialog(actor, resourceKey) {
  new ResourceConfigDialog(actor, resourceKey, {title: "Configure Resource"}).render(true);
}