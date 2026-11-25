import { DC20Dialog } from "../dialogs/dc20Dialog.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";
import { DC20Target } from "../subsystems/target/target.mjs";

export class DRMDialog extends DC20Dialog {

  static open(result, stickTo, options={}) {
    const dialog = new DRMDialog(result, stickTo, options);
    dialog.render(true);
    return dialog;
  }

  constructor(result, stickTo, options = {}) {
    super(options);
    this.prepareResult(result);
    this.stickTo = stickTo;
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

  prepareResult(result) {
    const resultPerTarget = [];
    const targets = result.targets.entries();
    const statuses = result.statuses.entries();
    
    if (result.roller.length > 0) {
      resultPerTarget.push({label: "From You", values: this._toDisplayFormat(result.roller)})
    }
    for (const [statusId, values] of statuses) {
      const statusName = getLabelFromKey(statusId, CONFIG.DC20RPG.DROPDOWN_DATA.allStatuses);
      resultPerTarget.push({label: `From Status: ${statusName}`, values: this._toDisplayFormat(values)})
    }
    for (const [hash, values] of targets) {
      const actor = DC20Target.getActorFromTargetHash(hash); 
      resultPerTarget.push({label: `From Token: ${actor.name}`, values: this._toDisplayFormat(values)})
    }

    if (this.#isEmpty(resultPerTarget)) {
      this.result = [{
        label: "",
        values: [{icon: "fa-square-xmark", text: "No roll modifications"}]
      }]
    }
    else {
      this.result = resultPerTarget;
    }
  }

  #isEmpty(resultPerTarget) {
    let isEmpty = true;
    resultPerTarget.forEach(r => {
      if(r.values.length !== 0) isEmpty = false;
    })
    return isEmpty;
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
    initialized.position.width = 300;
    return initialized;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const header = frame.querySelector(":scope > .window-header");
    if (header) header.style.display = "none";
    return frame;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.result = this.result;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.stickTo?.element) return;

    const position = () => {
      const anchor = this.stickTo?.element;
      if (!anchor?.isConnected || !this.element?.isConnected) return;

      const anchorRect = anchor.getBoundingClientRect();
      const dialogRect = this.element.getBoundingClientRect();
      this.setPosition({
        left: anchorRect.left - dialogRect.width,
        top: anchorRect.bottom - dialogRect.height
      });
    };

    position();
    this._stickToResizeObserver?.disconnect();
    this._stickToMutationObserver?.disconnect();
    this._stickToResizeObserver = new ResizeObserver(position);
    this._stickToResizeObserver.observe(this.stickTo.element);
    this._stickToResizeObserver.observe(this.element);
    this._stickToMutationObserver = new MutationObserver(position);
    this._stickToMutationObserver.observe(this.stickTo.element, {
      attributes: true,
      attributeFilter: ["style"]
    });
  }

  async close(options) {
    this._stickToResizeObserver?.disconnect();
    this._stickToMutationObserver?.disconnect();
    return super.close(options);
  }
}
