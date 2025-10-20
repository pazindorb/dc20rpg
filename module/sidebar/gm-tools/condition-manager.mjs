import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { getSelectedTokens } from "../../helpers/actors/tokens.mjs";

export class ConditionManager extends DC20Dialog {

  constructor(options = {}) {
    super(options);
    this.extras = {
      untilFirstTimeTriggered: false,
      untilTargetNextTurnStart: false,
      untilTargetNextTurnEnd: false,
      untilYourNextTurnStart: false,
      untilYourNextTurnEnd: false,
      forOneMinute: false,
      forXRounds: 0,
      repeatedSave: false,
      repeatedSaveKey: "",
      against: null,
      id: "",
    }
    this.saveBefore = {
      askForSave: false,
      saveKey: "",
      against: null,
    }
    const journals = CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.conditionsJournal;
    this.conditions = CONFIG.statusEffects
                                .filter(status => status.system.condition)
                                .map(status => {
                                  const condition = {...status};
                                  condition.journalUuid = journals[status.id];
                                  return condition;
                                });
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/gm-tools/condition-manager.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Condition Manager";
    initialized.window.icon = "fa-solid fa-bolt";
    initialized.position.width = 500;
    initialized.actions.apply = this._onApplyStatus;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.conditions = this.conditions;
    context.extras = this.extras;
    context.saveBefore = this.saveBefore;
    context.saveKeys = CONFIG.DC20RPG.ROLL_KEYS.saveTypes;
    return context;
  }

  async _onApplyStatus(event, target) {
    const dataset = target.dataset;
    const statusId = dataset.statusId;
    this.extras.id = statusId;

    const tokens = getSelectedTokens();
    tokens.forEach(token => {
      const actor = token.actor;
      if (actor) {
        this._shouldApply(actor, statusId).then(result => {
          if (result === true) actor.toggleStatusEffect(statusId, { active: true, extras: this.extras });
        });
      }
    })
  }

  async _shouldApply(actor, statusId) {
    const save = this.saveBefore;

    if (save.askForSave && save.saveKey && save.against) {
      const result = await actor.roll(save.saveKey, "save", {sendToActorOwners: true, against: save.against, statuses: [statusId]});
      if (result._total >= save.against) return false;
    }
    return true;
  }
}

export function createConditionManager() {
  new ConditionManager().render(true);
}