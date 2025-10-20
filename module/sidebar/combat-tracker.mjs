import { SimplePopup } from "../dialogs/simple-popup.mjs";

export class DC20RpgCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  /** @override */
  static PARTS = {
    header: {template: "systems/dc20rpg/templates/sidebar/combat-tracker/header.hbs"},
    tracker: {template: "systems/dc20rpg/templates/sidebar/combat-tracker/tracker.hbs"},
    footer: {template: "templates/sidebar/tabs/combat/footer.hbs"}
  };

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.actions.addToSpecificSlot = this._onCombatantControl;
    initialized.actions.addToSlot = this._onCombatantControl;
    initialized.actions.clearSlot = this._onCombatantControl;
    return initialized;
  }

  /** @override */
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options)
    
    // We need to skip companions linked to actor
    if (context.turns) {
      context.turns = context.turns.filter(turn => !turn.skip);
    }
  }

  /** @override */
  async _prepareTurnContext(combat, combatant, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index);

    // Override active if we are using slot merge
    const combatSlotMerge = game.settings.get("dc20rpg", "combatSlotMerge");
    if (combatSlotMerge) {
      turn.active = !!(combat.activeCombatants.find(cmb => cmb.id === combatant.id));
      if (turn.active) turn.css += " active";
    }

    // Slot initataive and companions
    turn.skip = combatant.skip;
    if(turn.initiative !== null) turn.slot = 20 - turn.initiative;
    turn.companions = combatant.companions || [];
    turn.canRollInitiative = combatant.canRollInitiative;

    const companionTurn = [];
    for (const companionId of turn.companions) {
      const companionCombatant = combat.combatants.get(companionId);
      if (companionCombatant) {
        const compTurn = await this._prepareTurnContext(combat, companionCombatant, index);
        companionTurn.push(compTurn);
      }
    }
    turn.companionTurn = companionTurn;
    return turn;  
  }

  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("change", this._onChangeValue.bind(this));
  }

  _onChangeValue(event) {
    const clazz = event.target?.classList?.value;
    const value = event.target?.value;

    switch (clazz) {
      case "change-dc": return this._changeinitiativeDC(value);
    }
  }

  _changeinitiativeDC(value) {
    const dc = parseInt(value);
    const combat = this.viewed;
    combat.update({['flags.dc20rpg.initiativeDC']: dc}); // TODO: MOVE TO COMBAT SYSTEM
  }

  /** @override */
  _onCombatantControl(event, target) {
    const { combatantId } = target.closest("[data-combatant-id]")?.dataset ?? {};
    const combatant = this.viewed?.combatants.get(combatantId);
    if ( !combatant ) return;

    switch (target.dataset.action) {
      case "addToSpecificSlot": return this._onAddToSlot(combatant, true);
      case "addToSlot": return this._onAddToSlot(combatant, false);
      case "clearSlot": return combatant.update({initiative: null});
    }
    return super._onCombatantControl(event, target);
  }

  async _onAddToSlot(combatant, specific) {
    let initativeValue = -1;
    if (specific) {
      const slot = await SimplePopup.select("Select Initiative Slot", {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12, 13:13, 14:14, 15:15, 16:16, 17:17, 18:18, 19:19, 20:20});
      if (slot) initativeValue = 20 - slot;
    }
    else {
      const combat = this.combats.find(combat => combat.active);
      const currentInitative = combat.combatant.initiative;
      if (currentInitative === null || currentInitative === undefined) initativeValue = 20;
      else initativeValue = currentInitative - 1;
    }

    if (initativeValue !== -1) await combatant.update({initiative: initativeValue});
  }
}