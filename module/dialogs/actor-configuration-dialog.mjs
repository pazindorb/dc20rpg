import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { evaulateFormula } from "../helpers/rolls.mjs";
import { getLabelFromKey, getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

/**
 * Dialog window for different actor configurations.
 */
export class ActorConfigurationDialog extends Dialog {

  constructor(actor, type, data, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.type = type;
    this.data = data;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/dialogs/configuration/${this.type}.hbs`;
  }

  getData() {
    switch (this.type) {
      case "defence":
        return this._getDataForDefence();
      
      case "customResource": 
        return this._getDataForCustomResource();

      case "jump": 
        return this._getDataForJump();
    }
    return {};
  }
  _getDataForDefence() {
    const defenceKey = this.data.defenceKey;
    const defence = this.actor.system.defences[defenceKey];
    let defenceLabels;
    let selectedFormula;

    switch (defenceKey) {
      case "physical": 
        selectedFormula = DC20RPG.physicalDefenceFormulas[defence.formulaKey];
        defenceLabels = DC20RPG.physicalDefenceFormulasLabels; 
        break;
      
      case "mental": 
        selectedFormula = DC20RPG.mentalDefenceFormulas[defence.formulaKey];
        defenceLabels = DC20RPG.mentalDefenceFormulasLabels; 
        break;
    }
    if (defence.formulaKey === 'custom') selectedFormula = defence.customFormula;
    if (defence.formulaKey !== 'flat') defence.normal = evaulateFormula(selectedFormula, this.actor.getRollData(), true).total;
    
    return {
      selectedFormulaKey: defence.formulaKey,
      customFormula: defence.customFormula,
      defenceValue: defence.normal,
      selectedFormula: selectedFormula,
      defenceLabels: defenceLabels,
      defenceKey: defenceKey
    }
  }
  _getDataForCustomResource() {
    const resourceKey = this.data.resourceKey;
    const resource = this.actor.system.resources.custom[resourceKey];
    const resetTypes = DC20RPG.resetTypes;

    return {
      ...resource,
      resetTypes,
      resourceKey
    }
  }
  _getDataForJump() {
    const selectedAttribute = this.actor.system.jump.attribute;
    const jumpAttributes = DC20RPG.attributesWithPrime;
    return {
      selectedAttribute: selectedAttribute,
      jumpAttributes
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
    const updatePath = this.data.updatePath;
    const updateData = getValueFromPath(this.actor, this.data.updatePath);
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

function _createActorConfigurationDialog(actor, type, data = {}, dialogData = {}) {
  const dialog = new ActorConfigurationDialog(actor, type, data, dialogData);
  dialog.render(true);
}

export function configureDefence(actor, defenceKey) {
  const data = {
    defenceKey: defenceKey, 
    updatePath: `system.defences.${defenceKey}.formulaKey`
  };
  const defenceLabel = getLabelFromKey(defenceKey, DC20RPG.defencesLabels);
  const dialogData = {title: `Configure ${defenceLabel} Defence`};
  _createActorConfigurationDialog(actor, "defence", data, dialogData);
}

export function configureJump(actor) {
  const data = {
    updatePath: "system.jump.attribute"
  };
  const dialogData = {title: `Configure Jump Distance`};
  _createActorConfigurationDialog(actor, "jump", data, dialogData);
}

export function configureCustomResource(actor, resourceKey) {
  const data = {
    resourceKey: resourceKey,
    updatePath: `system.resources.custom.${resourceKey}`
  }
  const resourceName = actor.system.resources.custom[resourceKey].name;
  _createActorConfigurationDialog(actor, "customResource", data, {title: `Configure ${resourceName}`});
}