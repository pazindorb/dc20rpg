import { DC20ChatMessage, sendDescriptionToChat, sendHealthChangeMessage } from "../chat/chat-message.mjs";
import { initiativeSlotSelector } from "../dialogs/initiativeSlotSelector.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { clearHeldAction, clearHelpDice, clearMovePoints, prepareHelpAction } from "../helpers/actors/actions.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { actorIdFilter, currentRoundFilter, reenableEventsOn, runEventsFor } from "../helpers/actors/events.mjs";
import { createEffectOn } from "../helpers/effects.mjs";
import { clearMultipleCheckPenalty } from "../helpers/rollLevel.mjs";
import { getActiveActorOwners } from "../helpers/users.mjs";
import { emitSystemEvent } from "../helpers/sockets.mjs";

export class DC20RpgCombat extends Combat {

  get lastActiveTurn() {
    const indexes = [];
    this.activeCombatants.forEach(combatant => indexes.push(this.turns.indexOf(combatant)));
    if (indexes.length === 0) return this.turn;
    else return Math.max(...indexes);
  }

  get activeCombatants() {
    if (!this.combatant) return [];
    const combatSlotMerge = game.settings.get("dc20rpg", "combatSlotMerge");
    if (!combatSlotMerge) return [this.combatant];
    return this.#getAllCombatantsForInitiative(this.combatant.initiative);
  }

  #getAllCombatantsForInitiative(initative) {
    return this.combatants.filter(combatant => combatant.initiative === initative);
  }

  // ===================================
  // ==         PREPARE DATA          ==
  // ===================================
  prepareData() {
    super.prepareData();
    this._prepareCompanionSharingInitiative();
  }

  _prepareCompanionSharingInitiative() {
    this.combatants.forEach(combatant => {
      if (companionShare(combatant.actor, "initiative")) {
        const companionOwnerId = combatant.actor.companionOwner.id;
        const owner = this.combatants.find(combatant => combatant.actorId === companionOwnerId);
        if (!owner) {
          combatant.skip = false;
          return;
        }

        combatant.skip = true;
        const companions = owner.companions || [];
        // We want to add companion only once
        if (!companions.find(companionId => companionId === combatant._id)) companions.push(combatant._id); 
        owner.companions = companions;
      }
      else {
        combatant.skip = false;
      }
    });
  }

  // ===================================
  // ==        ROLL INITIATIVE        ==
  // ===================================
  async rollPlayers(options) {
    const rollableCharacters = this.combatants.filter(combatant => {
      if (combatant.actor.type === "character") return true;
      if (combatant.actor.type === "companion") {
        if (companionShare(combatant.actor, "initiative")) return false;
        else return true;
      }
      return false;
    });

    rollableCharacters.forEach(combatant => {
      const actor = combatant.actor;
      if (!actor) return;
      
      const activeOwners = getActiveActorOwners(actor, false);
      if (activeOwners.length === 0) actor.rollInitiative({rerollInitiative: true});
      else emitSystemEvent("initative", {actorId: actor.id});
    });
  }

  /** @override **/
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
    if (game.combat.started) {
      ui.notifications.warn(game.i18n.localize("dc20rpg.combatTracker.combatStarted"));
      return;
    }
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    const currentId = this.combatant?.id;

    // Iterate over Combatants, performing an initiative roll for each
    const updates = [];
    const messages = [];
    for ( let [i, id] of ids.entries() ) {

      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if ( !combatant?.isOwner ) continue;

      let initiative = null;
      if (combatant.actor.type === "character") initiative = await this._initiativeRollForPC(combatant);
      if (combatant.actor.type === "companion") initiative = await this._initiativeForCompanion(combatant);
      if (initiative === null) return;
      updates.push({_id: id, initiative: initiative, flags: {["dc20rpg.initativeOutcome"]: combatant.initativeOutcome}});
    }
    if ( !updates.length ) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);

    // Ensure the turn order remains with the same combatant
    if ( updateTurn && currentId ) {
      await this.update({turn: this.turns.findIndex(t => t.id === currentId)});
    }

    // Create multiple chat messages
    await DC20ChatMessage.implementation.create(messages);
    return this;
  }

  async _initiativeRollForPC(combatant) {
    const actor = combatant.actor;
    if (!actor) return;

    const roll = await actor.roll("initiative", "check", {rollTitle: "Initiative", customLabel: "Initiative Roll"});
    if (!roll) return null;

    combatant.initativeOutcome = {crit: roll.crit, fail: roll.fail};
    return roll.total;
  }

  async _initiativeForCompanion(combatant) {
    if (companionShare(combatant.actor, "initiative")) {
      const companionOwnerId = combatant.actor.companionOwner.id;
      const owner = this.combatants.find(combatant => combatant.actorId === companionOwnerId);
      if (!owner) ui.notifications.warn("This companion shares initiative with its owner. You need to roll for Initiative for the owner!");
      return null;
    }
    else {
      return this._initiativeRollForPC(combatant);
    }
  }

  // =================================
  // ==           COMBAT            ==
  // =================================
  /** @override **/
  async startCombat() {
    if (!this.flags.dc20rpg?.initiativeDC) {
      ui.notifications.warn(game.i18n.localize("dc20rpg.combatTracker.provideDC"));
      return;
    }

    let numberOfPCs = 0;
    let successPCs = 0;
    this.combatants.forEach(combatant => {
      const actor = combatant.actor;
      if (!actor) return;

      if (actor.type === "character") {
        numberOfPCs++;
        successPCs += this._checkInvidualOutcomes(combatant);
      }
      this._refreshOnCombatStart(actor);
      runEventsFor("combatStart", actor);
      reenableEventsOn("combatStart", actor);
    });

    await this.resetAll();
    if (successPCs >= Math.ceil(numberOfPCs/2)) {
      await initiativeSlotSelector(this, "pc");
      await this.update({["flags.dc20rpg.winningTeam"]: "pc"});
    }
    else {
      await initiativeSlotSelector(this, "enemy");
      await this.update({["flags.dc20rpg.winningTeam"]: "enemy"});
    }
    return await super.startCombat();
  }

  /** @override **/
  async endCombat() {
    const combatantId = this.current.combatantId;
    const combatant = this.combatants.get(combatantId);
    const token = combatant?.token?.object;

    if (combatant) clearMultipleCheckPenalty(combatant.actor);
    this.combatants.forEach(combatant => {
      const actor = combatant.actor;
      clearHeldAction(combatant.actor);
      clearHelpDice(combatant.actor);                 // Clear "round" duration
      clearHelpDice(combatant.actor, null, "combat"); // Clear "combat" duration
      this._refreshOnCombatEnd(actor);
    });
    await super.endCombat();
    if (token) token.renderFlags.set({refreshTurnMarker: true});
  }

  /** @override **/
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  async nextTurn() {
    let turn = this.turn ?? -1;
    let skip = this.settings.skipDefeated;

    // Check if should skip next combatant (e.g. When companion shares initiative with the owner) 
    //======== INJECTED =========
    let combatant = {skip: false};
    let next = null;
    do {
      // Determine the next turn number
      if ( skip ) {
        for ( let [i, t] of this.turns.entries() ) {
          if ( i <= turn ) continue;
          if ( t.isDefeated ) continue;
          next = i;
          break;
        }
      }
      else {
        next = turn + 1;
      }
      combatant = this.turns[next];
      if (combatant !== undefined && !combatant.skip) combatant.skip = this.activeCombatants.find(cmb => cmb.id === combatant.id);
      turn++;
    } while (combatant !== undefined && combatant.skip);
    //============================

    // Maybe advance to the next round
    let round = this.round;
    if ( (this.round === 0) || (next === null) || (next >= this.turns.length) ) {
      return this.nextRound();
    }

    // Update the document, passing data through a hook first
    const updateData = {round, turn: next};
    const updateOptions = {direction: 1, worldTime: {delta: CONFIG.time.turnTime}};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** @override **/
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  async previousTurn() {
    if ( (this.turn === 0) && (this.round === 0) ) return this;
    let previousTurn = (this.turn ?? this.turns.length) - 1;

    // Check if should skip previous combatant (e.g. When companion shares initiative with the owner) 
    //======== INJECTED =========
    const combatSlotMerge = game.settings.get("dc20rpg", "combatSlotMerge");
    let combatant = this.turns[previousTurn];
    while (combatant !== undefined && combatant.skip) {
      previousTurn--;
      combatant = this.turns[previousTurn];
    }
    if (combatSlotMerge && combatant !== undefined) {
      const combatants = this.#getAllCombatantsForInitiative(combatant.initiative);
      const indexes = [];
      combatants.forEach(combatant => indexes.push(this.turns.indexOf(combatant)));
      previousTurn = Math.min(...indexes);
      combatant = this.turns[previousTurn];
    }
    //===========================

    if ( (previousTurn < 0) && (this.turn !== null) ) return this.previousRound();

    // Update the document, passing data through a hook first
    const updateData = {round: this.round, turn: previousTurn};
    const updateOptions = {direction: -1, worldTime: {delta: -1 * CONFIG.time.turnTime}};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** @override **/
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  async previousRound() {
    let turn = ( this.round === 0 ) ? 0 : Math.max(this.turns.length - 1, 0);
    if ( this.turn === null ) turn = null;

    // Check if should skip previous combatant (e.g. When companion shares initiative with the owner) 
    //======== INJECTED =========
    const combatSlotMerge = game.settings.get("dc20rpg", "combatSlotMerge");
    let combatant = this.turns[turn];
    while (combatant !== undefined && combatant.skip) {
      turn--;
      combatant = this.turns[turn];
    }
    if (combatSlotMerge && combatant !== undefined) {
      const combatants = this.#getAllCombatantsForInitiative(combatant.initiative);
      const indexes = [];
      combatants.forEach(combatant => indexes.push(this.turns.indexOf(combatant)));
      turn = Math.min(...indexes);
      combatant = this.turns[turn];
    }
    //===========================
    let round = Math.max(this.round - 1, 0);
    if ( round === 0 ) turn = null;
    let advanceTime = -1 * (this.turn || 0) * CONFIG.time.turnTime;
    if ( round > 0 ) advanceTime -= CONFIG.time.roundTime;

    // Update the document, passing data through a hook first
    const updateData = {round, turn};
    const updateOptions = {direction: -1, worldTime: {delta: advanceTime}};
    Hooks.callAll("combatRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  async _onStartTurn(currentCombatant, context, sharedInitiative) {
    const combatants = sharedInitiative ? [currentCombatant] : this.activeCombatants; // We have to deal with companion sharing initiative
    if (!combatants.find(cmb => cmb.id === currentCombatant.id)) return;

    for (const combatant of combatants) {
      const actor = combatant.actor;
      if (!actor) continue;

    // Skip if combatant shares initative with owner (unless this method was called by the owner itself)
    if (!sharedInitiative && companionShare(actor, "initiative")) return;
      
      await this._respectRoundCounterForEffects();
      this._deathsDoorCheck(actor);
      this._sustainCheck(actor);
      this._refreshOnRoundStart(actor);
      runEventsFor("turnStart", actor);
      reenableEventsOn("turnStart", actor);
      this._runEventsForAllCombatants("actorWithIdStartsTurn", actorIdFilter(actor.id));
      clearHelpDice(actor);
      clearHeldAction(actor);
      await super._onStartTurn(combatant, context);

      // Run onStartTurn for all linked companions
      if (combatant.companions) combatant.companions.forEach(companionId => {
        const companion = this.combatants.get(companionId);
        if(companion) this._onStartTurn(companion, context, true)
      });
    }
    ui.hotbar.render();
  }

  async _onEndTurn(combatant, context, sharedInitiative) {
    const actor = combatant.actor;
    if (!actor) return;

    // Skip if combatant shares initative with owner (unless this method was called by the owner itself)
    if (!sharedInitiative && companionShare(actor, "initiative")) return;

    const currentRound = this.turn === 0 ? this.round - 1 : this.round; 
    this._refreshOnRoundEnd(actor);
    runEventsFor("turnEnd", actor);
    runEventsFor("nextTurnEnd", actor, currentRoundFilter(actor, currentRound));
    reenableEventsOn("turnEnd", actor);
    this._runEventsForAllCombatants("actorWithIdEndsTurn", actorIdFilter(actor.id));
    this._runEventsForAllCombatants("actorWithIdEndsNextTurn", actorIdFilter(actor.id), currentRound);
    await clearMultipleCheckPenalty(actor);
    clearMovePoints(actor);
    await super._onEndTurn(combatant, context);

    // Run onEndTurn for all linked companions
    if (combatant.companions) combatant.companions.forEach(companionId => {
      const companion = this.combatants.get(companionId);
      if(companion) this._onEndTurn(companion, context, true);
    });
  }

  async _respectRoundCounterForEffects() {
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;
      for (const effect of actor.temporaryEffects) {
        await effect.respectRoundCounter()
      }
    }
  }

  async _runEventsForAllCombatants(trigger, filters, currentRound) {
    this.combatants.forEach(combatant => {
      const actor = combatant.actor;
      if (!actor) return;
      if (currentRound) filters = [...filters, ...currentRoundFilter(actor, currentRound)];
      runEventsFor(trigger, actor, filters);
      reenableEventsOn(trigger, actor, filters);
    });
  }

  async _refreshOnRoundStart(actor) {
    await this._refreshResources(actor, ["roundStart"]);
    await this._refreshItems(actor, ["roundStart"]);
  }

  // TODO: REMOVE "round" in the future - replaced by "roundEnd"
  async _refreshOnRoundEnd(actor) {
    await this._refreshResources(actor, ["round", "roundEnd"]);
    await this._refreshItems(actor, ["round", "roundEnd"]);
  }

  async _refreshOnCombatEnd(actor) {
    await this._refreshResources(actor, ["round", "roundEnd", "roundStart", "combat"]);
    await this._refreshItems(actor, ["round", "roundEnd", "roundStart", "combat"]);
  }

  // TODO: REMOVE "combat" in the future - replaced by "combatStart"
  async _refreshOnCombatStart(actor) {
    await this._refreshResources(actor, ["combat", "combatStart"]);
    await this._refreshItems(actor, ["combat", "combatStart"]);
  }

  async _refreshResources(actor, resetTypes) {
    if (!actor) return;
    for (const resource of actor.resources.iterate()) {
      if (resetTypes.includes(resource.reset)) {
        await resource.regain("max");
      }
    }
  }

  async _refreshItems(actor, resetTypes) {
    if (!actor) return;

    for (const item of actor.items) {
      if (!item.system.usable) continue;
      if (!item.use.hasCharges) continue;
      
      const charges = item.system.costs.charges;
      if (resetTypes.includes(charges.reset)) {
        await item.use.regainCharges();
      }
    }
  }

  // =================================
  // ==            OTHER            ==
  // =================================
  _checkInvidualOutcomes(combatant) {
    const initiativeDC = this.flags.dc20rpg.initiativeDC;
    const actor = combatant.actor;
    if (!actor) return;

    // Crit Success
    if (combatant.flags.dc20rpg?.initativeOutcome?.crit) {
      sendDescriptionToChat(actor, {
        rollTitle: "Initiative Critical Success",
        image: actor.img,
        description: "You gain ADV on 1 Check or Save of your choice during the first Round of Combat.",
      });
      createEffectOn(this._getInitiativeCritEffectData(actor), actor);
    }
    // Crit Fail
    if (combatant.flags.dc20rpg?.initativeOutcome?.fail) {
      sendDescriptionToChat(actor, {
        rollTitle: "Initiative Critical Fail",
        image: actor.img,
        description: "The first Attack made against you during the first Round of Combat has ADV.",
      });
      createEffectOn(this._getInitiativeCritFailEffectData(actor), actor);
    }
    // Success
    if (combatant.initiative >= initiativeDC) {
      sendDescriptionToChat(actor, {
        rollTitle: "Initiative Success",
        image: actor.img,
        description: "You gain a d6 Inspiration Die, which you can add to 1 Check or Save of your choice that you make during this Combat. The Inspiration Die expires when the Combat ends.",
      });
      prepareHelpAction(actor, {diceValue: 6, duration: "combat"});
      return true;
    }
    return false;
  }

  _getInitiativeCritEffectData(actor) {
    const checkKeys = [
      "martial.melee", "martial.ranged", "spell.melee", "spell.ranged",
      "checks.mig", "checks.agi", "checks.cha", "checks.int", "checks.att", "checks.spe",
      "saves.mig", "saves.agi", "saves.cha", "saves.int"
    ]
    const change = (checkPath) => {
      return {
        key: `system.rollLevel.onYou.${checkPath}`,
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Initiative Critical Success", "confirmation": true, "afterRoll": "delete"'
      }
    };

    const changes = []
    for (const key of checkKeys) {
      changes.push(change(key));
    }

    return {
      name: "Initiative Critical Success",
      img: "icons/svg/angel.svg",
      origin: actor.uuid,
      duration: {
        rounds: 1,
        startRound: 1,
        startTurn: 0,
      },
      "flags.dc20rpg.duration.useCounter": true,
      "flags.dc20rpg.duration.onTimeEnd": "delete",
      description: "You gain ADV on 1 Check or Save of your choice during the first Round of Combat.",
      disabled: false,
      changes: changes
    }
  }

  _getInitiativeCritFailEffectData(actor) {
    const checkKeys = ["martial.melee", "martial.ranged", "spell.melee", "spell.ranged"]
    const change = (checkPath) => {
      return {
        key: `system.rollLevel.againstYou.${checkPath}`,
        mode: 2,
        priority: undefined,
        value: '"value": 1, "type": "adv", "label": "Initiative Critical Fail", "afterRoll": "delete"'
      }
    };

    const changes = []
    for (const key of checkKeys) {
      changes.push(change(key));
    }

    return {
      name: "Initiative Critical Fail",
      img: "icons/svg/coins.svg",
      origin: actor.uuid,
      duration: {
        rounds: 1,
        startRound: 1,
        startTurn: 0,
      },
      "flags.dc20rpg.duration.useCounter": true,
      "flags.dc20rpg.duration.onTimeEnd": "delete",
      description: "The first Attack made against you during the first Round of Combat has ADV.",
      disabled: false,
      changes: changes
    }
  }

  async _deathsDoorCheck(actor) {
    // Check if actor is on death's door
    const notDead = !actor.hasStatus("dead");
    const deathsDoor = actor.system.death;
    const exhaustion = actor.exhaustion;
    const saveFormula = `d20 - ${exhaustion}`;
    if (deathsDoor.active && notDead) {
      const details = {
        label: game.i18n.localize('dc20rpg.death.save'),
        type: "deathSave",
        against: 10,
        roll: saveFormula,
        checkKey: "deathSave"
      };
      const roll = await RollDialog.open(actor, details, {sendToActorOwners: true});
      if (!roll) return;

      // Critical Success: You are restored to 1 HP
      if (roll.crit) {
        const health = actor.system.resources.health;
        actor.update({["system.resources.health.current"]: 1});
        sendHealthChangeMessage(actor, Math.abs(health.current) + 1, game.i18n.localize('dc20rpg.death.crit'), "healing");
      }
      // Success (5): You regain 1 HP.
      else if (roll._total >= 15) {
        const health = actor.system.resources.health;
        actor.update({["system.resources.health.current"]: (health.current + 1)});
        sendHealthChangeMessage(actor, 1, game.i18n.localize('dc20rpg.death.success'), "healing");
      }
      // Success: No change.

      // Failure: You gain Bleeding 1.
      if (roll._total < 10) {
        actor.toggleStatusEffect("bleeding", {active: true});
      }

      // Failure (5): You gain Bleeding 2 instead.
      if (roll._total < 5) {
        actor.toggleStatusEffect("bleeding", {active: true});
      }

      // Critical Failure: You also fall Unconscious until you’re restored to 1 HP or higher.
      if (roll.fail) {
        actor.toggleStatusEffect("unconscious", {active: true});
      }
    }
  }

  async _sustainCheck(actor) {
    for (const [key, sustain] of Object.entries(actor.system.sustain)) {
      const message = `Do you want to spend 1 AP to sustain '${sustain.name}'?`;
      const confirmed = await SimplePopup.confirm(message, {actor: actor});

      if (confirmed) {
        const subtracted = actor.resources.ap.checkAndSpend(1);
        if (!subtracted) actor.dropSustain(key, "Not enough AP to sustain.");
      }
      else {
        actor.dropSustain(key, "You decided not to sustain it anymore.");
      }
    }
  }
}