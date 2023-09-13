import { DC20RPG } from "../helpers/config.mjs";
import { evaulateFormula } from "../helpers/rolls.mjs";

/**
 * Dialog window for configuring defences.
 */
export class ConfigureDefenceDialog extends Dialog {

  constructor(actor, defenceData, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.defenceData = defenceData;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/configure-defence-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    const data = this.defenceData;
    let defenceLabels;
    let selectedFormula;

    if (data.defenceTypeKey === "phisical") {
      selectedFormula = DC20RPG.phisicalDefenceFormulas[data.selectedFormulaKey];
      defenceLabels = DC20RPG.phisicalDefenceFormulasLabels; 
    }
    if (data.defenceTypeKey === "mental") {
      selectedFormula = DC20RPG.mentalDefenceFormulas[data.selectedFormulaKey];
      defenceLabels = DC20RPG.mentalDefenceFormulasLabels; 
    }

    if (data.selectedFormulaKey === 'custom') {
      selectedFormula = data.customFormula;
    }

    if (data.selectedFormulaKey !== 'flat') {
      data.defenceValue = evaulateFormula(selectedFormula, this.actor.getRollData(), true).total;
    }

    return {
      selectedFormulaKey: data.selectedFormulaKey,
      customFormula: data.customFormula,
      defenceValue: data.defenceValue,
      selectedFormula: selectedFormula,
      defenceLabels: defenceLabels,
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev))
    html.find(".flat").change(ev => this._onValueChange(ev))
    html.find(".custom").change(ev => this._onFormulaChange(ev))
    html.find(".save").click(ev => this._onUpdate(ev))
  }

  _onUpdate(event) {
    event.preventDefault();

    const data = this.defenceData;
    const pathToDefence = `system.defences.${data.defenceTypeKey}`;

    let actorUpdateData = { [`${pathToDefence}.formulaKey`] : data.selectedFormulaKey };
    if (data.selectedFormulaKey === "flat") actorUpdateData[`${pathToDefence}.normal`] = parseInt(data.defenceValue);
    if (data.selectedFormulaKey === "custom") actorUpdateData[`${pathToDefence}.customFormula`] = data.customFormula;

    this.actor.update(actorUpdateData);
    this.close();
  }

  async _onSelection(event) {
    event.preventDefault();
    this.defenceData.selectedFormulaKey = event.currentTarget.value;
    this.render(true);
  }

  async _onValueChange(event) {
    event.preventDefault();
    this.defenceData.defenceValue = event.currentTarget.value;
    this.render(true);
  }

  async _onFormulaChange(event) {
    event.preventDefault();
    this.defenceData.customFormula = event.currentTarget.value;
    this.render(true);
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createConfigureDefenceDialog(actor, defenceKey) {
  let defenceData = {
    defenceTypeKey: defenceKey,
    selectedFormulaKey: actor.system.defences[defenceKey].formulaKey,
    defenceValue: actor.system.defences[defenceKey].normal,
    customFormula: actor.system.defences[defenceKey].customFormula
  }

  let dialog = new ConfigureDefenceDialog(actor, defenceData, {title: "Configure Defence"});
  dialog.render(true);
}