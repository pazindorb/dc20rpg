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
    const selectedMysticalFormula = DC20RPG.mysticalDefenceFormulas[this.updateData.defences.mystical.formulaKey];

    return {
      ...this.updateData,
      config:  DC20RPG,
      selectedPhysicalFormula: selectedPhysicalFormula,
      selectedMysticalFormula: selectedMysticalFormula
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
      mystical: {
        formulaKey: system.defences.mystical.formulaKey,
        normal: system.defences.mystical.normal,
        customFormula: system.defences.mystical.customFormula
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
        useCustom: system.movement.ground.useCustom,
        value: system.movement.ground.value
      },
      burrow: {
        useCustom: system.movement.burrow.useCustom,
        value: system.movement.burrow.value
      },
      climbing: {
        useCustom: system.movement.climbing.useCustom,
        value: system.movement.climbing.value
      },
      flying: {
        useCustom: system.movement.flying.useCustom,
        value: system.movement.flying.value
      },
      glide: {
        useCustom: system.movement.glide.useCustom,
        value: system.movement.glide.value
      },
      swimming: {
        useCustom: system.movement.swimming.useCustom,
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

export function characterConfigDialog(actor) {
  new CharacterConfigDialog(actor, {title: `Configure Character: ${actor.name}`}).render(true);
}