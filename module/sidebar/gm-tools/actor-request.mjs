import { getActivePlayers } from "../../helpers/users.mjs";
import { openRestDialogForOtherPlayers, RestDialog } from "../../dialogs/rest.mjs";
import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { DC20Roll } from "../../roll/rollApi.mjs";
import { RollDialog } from "../../roll/rollDialog.mjs";

export class ActorRequestDialog extends DC20Dialog {

  static open(requestType, options={}) {
    new ActorRequestDialog(requestType, options).render(true);
  }

  constructor(requestType, options={}) {
    super(options);

    this.requestType = requestType;
    this.selectableActors = this._selectableActors(options.actors || this._collectActors(options.onlyPC));

    this.header = game.i18n.localize(`dc20rpg.dialog.actorRequest.${requestType}.title`);
    if (requestType === "rest") {
      this.icon = "fa-solid fa-bed";
      this.selectOptions = {rest: CONFIG.DC20RPG.DROPDOWN_DATA.restTypes};
    }

    if (requestType === "roll") {
      this.icon = "fa-solid fa-dice-d20";
      const selectOptions = {};
      if (options.basic) selectOptions.basic = CONFIG.DC20RPG.ROLL_KEYS.baseChecks;
      if (options.attribute) selectOptions.attribute = CONFIG.DC20RPG.ROLL_KEYS.attributeChecks;
      if (options.save) selectOptions.save = CONFIG.DC20RPG.ROLL_KEYS.saveTypes;
      if (options.skill) selectOptions.skill = CONFIG.DC20RPG.ROLL_KEYS.skillChecks;
      if (options.trade) selectOptions.trade = CONFIG.DC20RPG.ROLL_KEYS.tradeChecks;
      this.selectOptions = selectOptions;
    }
  }

  /** @override */
  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/gm-tools/actor-request-dialog.hbs",
    }
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Actor Request";
    initialized.window.icon = "fa-solid fa-users-viewfinder";
    initialized.position.width = 600;

    initialized.actions.confirm = this._onConfirmRequest;
    return initialized;
  }

  _collectActors(onlyPC) {
    const activePlayersIds = getActivePlayers().map(user => user.id);

    // Go over actors and collect the ones belonging to active users
    const actors = [];
    game.actors.forEach(actor => {
      if (Object.keys(actor.ownership).some(userId => activePlayersIds.includes(userId))) {
        if (onlyPC) if (actor.type !== "character") return;
        actors.push(actor);
      }
    });
    return actors;
  }

  _selectableActors(actors) {
    const selectable = {};
    actors.forEach(actor => selectable[actor.id] = {actor: actor, selected: false});
    return selectable;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const hasActors = Object.keys(this.selectableActors).length > 0;

    context.header = this.header;
    context.icon = this.icon;
    context.requestSent = this.requestSent;
    context.hasActors = hasActors,
    context.showCloseButton = this.requestSent || !hasActors;

    context.selectableActors = this.selectableActors;
    context.selectOptions = this.selectOptions;

    context.showBasic = this.selectOptions?.basic || this.selectOptions?.attribute || this.selectOptions?.save || this.selectOptions?.rest;
    context.showSkill = this.selectOptions?.skill || this.selectOptions?.trade;

    let grid = "1fr";
    if (context.showSkill && context.showBasic) grid += " 1fr";
    context.grid = grid;

    return context;
  }

  async _onConfirmRequest(event, target) {
    event.preventDefault();

    const selectedActors = {};
    Object.values(this.selectableActors).forEach(wrapper => {
      if (wrapper.selected) {
        const actor = wrapper.actor;
        selectedActors[actor.id] = {
          actor: actor,
          request: true,
          result: null,
        }
      }
    })
    this.selectableActors = selectedActors;

    const key = target.dataset.key;
    const type = target.dataset.type;

    if (type === "rest") this._onRest(key);
    else await this._onRoll(key, type, target.textContent);
  }

  async _onRoll(key, type, name) {
    this.requestSent = `Rolling: ${name}`;
    this.render();

    for (const wrapper of Object.values(this.selectableActors)) {
      wrapper.actor.rollPopup(key, type, {sendToActorOwners: true}).then(result => {
        wrapper.result = result._total;
        this.render();
      })
    }
  }

  async _onRest(key) {
    for (const wrapper of Object.values(this.selectableActors)) {
      RestDialog.open(wrapper.actor, {preselected: key, sendToActorOwners: true});
    }
    this.close();
  }
}

export function createActorRequestDialog(requestType, selectOptions, request, onlyPC) {
  const dialog = new ActorRequestDialog(requestType, selectOptions, request, onlyPC);
  dialog.render(true);
}

export function rollRequest(selected, selectedActors) {
  let rollDetails = DC20Roll.prepareCheckDetails(selected);
  if (["agi", "mig", "cha", "int", "phy", "men"].includes(selected)) {
    rollDetails = DC20Roll.prepareSaveDetails(selected);
  }
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) RollDialog.open(actor.actor, rollDetails, {sendToActorOwners: true});
  });
}

export function restRequest(selected, selectedActors) {
  Object.values(selectedActors).forEach(actor => {
    if (actor.selected) openRestDialogForOtherPlayers(actor.actor, selected);
  });
}
