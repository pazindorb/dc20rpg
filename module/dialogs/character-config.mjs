import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";
import { getValueFromPath, setValueForPath } from "../helpers/utils.mjs";

class CharacterConfigDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.updateData = this._perpareUpdateData();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"],
      height: 600,
      width: 450
    });
  }

  /** @override */
  get template() {
    return `systems/dc20rpg/templates/dialogs/character-config-dialog.hbs`;
  }

  getData() {
    const selectedPrecisionFormula = CONFIG.DC20RPG.SYSTEM_CONSTANTS.precisionDefenceFormulas[this.updateData.defences.precision.formulaKey];
    const selectedAreaFormula = CONFIG.DC20RPG.SYSTEM_CONSTANTS.areaDefenceFormulas[this.updateData.defences.area.formulaKey];

    return {
      ...this.updateData,
      config:  CONFIG.DC20RPG,
      selectedPrecisionFormula: selectedPrecisionFormula,
      selectedAreaFormula: selectedAreaFormula
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
      area: {
        formulaKey: system.defences.area.formulaKey,
        normal: system.defences.area.normal,
        customFormula: system.defences.area.customFormula
      },
      precision: {
        formulaKey: system.defences.precision.formulaKey,
        normal: system.defences.precision.normal,
        customFormula: system.defences.precision.customFormula
      }
    }

    // Rest Points 
    const resources = {
      stamina: {
        maxFormula: system.resources.stamina.maxFormula
      },
      mana: {
        maxFormula: system.resources.mana.maxFormula
      },
      grit: {
        maxFormula: system.resources.grit.maxFormula
      },
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

    // Senses
    const senses = {
      darkvision: {
        overridenRange: system.senses.darkvision.overridenRange,
        override: system.senses.darkvision.override
      },
      tremorsense: {
        overridenRange: system.senses.tremorsense.overridenRange,
        override: system.senses.tremorsense.override
      },
      blindsight: {
        overridenRange: system.senses.blindsight.overridenRange,
        override: system.senses.blindsight.override
      },
      truesight: {
        overridenRange: system.senses.truesight.overridenRange,
        override: system.senses.truesight.override
      },
    }

    const attributePoints = {
      overridenMax: system.attributePoints.overridenMax,
      override: system.attributePoints.override
    }

    const skillPoints = {
      skill: {
        overridenMax: system.skillPoints.skill.overridenMax,
        override: system.skillPoints.skill.override
      },
      trade: {
        overridenMax: system.skillPoints.trade.overridenMax,
        override: system.skillPoints.trade.override
      },
      language: {
        overridenMax: system.skillPoints.language.overridenMax,
        override: system.skillPoints.language.override
      },
    }

    return {
      defences: defences,
      movement: movement,
      jump: jump,
      size: size,
      senses: senses,
      attributePoints: attributePoints,
      skillPoints: skillPoints,
      resources: resources,
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