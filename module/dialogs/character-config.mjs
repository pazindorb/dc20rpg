import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf, valueOf } from "../helpers/events.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

class CharacterConfigDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.updateData = this._perpareUpdateData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/dialogs/character-config-dialog.hbs`;
  }

  getData() {
    const selectedPhysicalFormula = DC20RPG.physicalDefenceFormulas[this.updateData.defences.physical.formulaKey];
    const selectedMentalFormula = DC20RPG.mentalDefenceFormulas[this.updateData.defences.mental.formulaKey];

    return {
      ...this.updateData,
      config:  DC20RPG,
      selectedPhysicalFormula: selectedPhysicalFormula,
      selectedMentalFormula: selectedMentalFormula
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".save").click((ev) => this._onSave(ev));
    html.find(".selectable").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".input").change(ev => this._onValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find(".numeric-input").change(ev => this._onNumericValueChange(datasetOf(ev).path, valueOf(ev)));
    html.find('.activable').click(ev => this._onActivable(datasetOf(ev).path));
  }

  _perpareUpdateData() {
    const system = this.actor.system;

    // Defences
    const defences = {
      mental: {
        formulaKey: system.defences.mental.formulaKey,
        normal: system.defences.mental.normal,
        customFormula: system.defences.mental.customFormula
      },
      physical: {
        formulaKey: system.defences.physical.formulaKey,
        normal: system.defences.physical.normal,
        customFormula: system.defences.physical.customFormula
      }
    }

    // Movements
    const movement = {
      ground: {
        fromAncestry: system.movement.ground.fromAncestry,
        value: system.movement.ground.value
      },
      burrow: {
        fromAncestry: system.movement.burrow.fromAncestry,
        value: system.movement.burrow.value
      },
      climbing: {
        fromAncestry: system.movement.climbing.fromAncestry,
        value: system.movement.climbing.value
      },
      flying: {
        fromAncestry: system.movement.flying.fromAncestry,
        value: system.movement.flying.value
      },
      glide: {
        fromAncestry: system.movement.glide.fromAncestry,
        value: system.movement.glide.value
      },
      swimming: {
        fromAncestry: system.movement.swimming.fromAncestry,
        value: system.movement.swimming.value
      }
    }

    // Jump
    const jump = {
      key: system.jump.key,
      value: system.jump.value
    }

    const size = {
      fromAncestry: system.size.fromAncestry,
      size: system.size.size
    }

    return {
      defences: defences,
      movement: movement,
      jump: jump,
      size: size
    }
  }

  _onValueChange(path, value) {
    setValueForPath(this.updateData, path, value);
    this.render(true);
  }
  _onNumericValueChange(path, value) {
    const numericValue = parseInt(value);
    setValueForPath(this.updateData, path, numericValue);
    this.render(true);
  }
  _onActivable(pathToValue) {
    const value = getValueFromPath(this.updateData, pathToValue);
    setValueForPath(this.updateData, pathToValue, !value);
    this.render(true);
  }
  _onSave(ev) {
    ev.preventDefault();
    this.actor.update({['system']: this.updateData});
    this.close();
  }
}

export function characterConfigDialog(actor, data = {}, dialogData = {}) {
  const dialog = new CharacterConfigDialog(actor, data, dialogData);
  dialog.render(true);
}