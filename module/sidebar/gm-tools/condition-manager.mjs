import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { getSelectedTokens } from "../../helpers/actors/tokens.mjs";
import { addStatusWithIdToActor } from "../../statusEffects/statusUtils.mjs";

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
    context.saveKeys = CONFIG.DC20RPG.ROLL_KEYS.saveTypes;
    return context;
  }

  async _onApplyStatus(event, target) {
    const dataset = target.dataset;
    const statusId = dataset.statusId;
    this.extras.id = statusId;

    const tokens = getSelectedTokens();
    tokens.forEach(token => {
      if (token.actor) addStatusWithIdToActor(token.actor, statusId, this.extras);
    })
  }
}

export function createConditionManager() {
  new ConditionManager().render(true);
}