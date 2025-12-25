import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { getActorFromTargetHash } from "../helpers/targets.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";

export class DRMDialog extends DC20Dialog {

  static open(result, options={}) {
    new DRMDialog(result, options).render(true);
  }

  constructor(result, options = {}) {
    super(options);
    this.result = this._prepareResult(result);
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/drm-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _prepareResult(result) {
    const resultPerTarget = [];
    const targets = result.targets.entries();
    const statuses = result.statuses.entries();
    
    if (result.roller.length > 0) {
      resultPerTarget.push({label: "From You", values: this._toDisplayFormat(result.roller)})
    }
    for (const [statusId, values] of statuses) {
      const statusName = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.allStatuses);
      resultPerTarget.push({label: `From ${statusName}`, values: this._toDisplayFormat(values)})
    }
    for (const [hash, values] of targets) {
      const actor = getActorFromTargetHash(hash); 
      resultPerTarget.push({label: `From ${actor.name}`, values: this._toDisplayFormat(values)})
    }

    return resultPerTarget;
  }

  _toDisplayFormat(array) {
    const formatted = [];
    array.forEach(element => {
      let skipRollLevel = false;
      // Auto Crit 
      if (element.autoCrit && !element.autoFail) {
        skipRollLevel = true;
        formatted.push({icon: "fa-dice green", text: `${element.label} :    [Automatic Crit]`});
      }

      // Auto Fail
      if (!element.autoCrit && element.autoFail) {
        skipRollLevel = true;
        formatted.push({icon: "fa-dice red", text: `${element.label} :    [Automatic Fail]`});
      }

      // Adv/Dis
      if (element.value && element.type && !skipRollLevel) {
        if (element.type === "dis") {
          formatted.push({icon: "fa-dice red", text: `${element.label} :    [DisADV ${element.value}]`});
        }
        if (element.type === "adv") {
          formatted.push({icon: "fa-dice green", text: `${element.label} :    [ADV ${element.value}]`})
        }
      }
      // Modifier
      if (element.modifier) {
        formatted.push({icon: "fa-pencil purple", text: `${element.label} :    [${element.modifier}]`});
      }
      
      // Manual Action
      if (element.manual) {
        formatted.push({icon: "fa-circle-exclamation gold", text: element.manual});
      }
    })
    return formatted;
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Dynamic Roll Modifier Result";
    initialized.window.icon = "fa-light fa-dice-d20";
    initialized.position.width = 500;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.result = this.result;
    return context;
  }
}