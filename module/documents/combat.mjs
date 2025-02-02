import { DC20ChatMessage, sendDescriptionToChat, sendHealthChangeMessage } from "../chat/chat-message.mjs";
import { refreshOnCombatStart, refreshOnRoundEnd } from "../dialogs/rest.mjs";
import { promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { clearHeldAction, clearHelpDice, clearMovePoints } from "../helpers/actors/actions.mjs";
import { prepareCheckDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { reenableEventsOn, runEventsFor } from "../helpers/actors/events.mjs";
import { clearMultipleCheckPenalty } from "../helpers/rollLevel.mjs";
import { addStatusWithIdToActor } from "../statusEffects/statusUtils.mjs";

export class DC20RpgCombat extends Combat {

  prepareData() {
    super.prepareData();
    this._prepareCompanionSharingInitative();
  }

  _prepareCompanionSharingInitative() {
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

  /** @override **/
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={}) {
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

      // Produce an initiative roll for the PC/NPC Combatant
      let initiative = null;
      if (combatant.actor.type === "character") initiative = await this._initiativeRollForPC(combatant);
      if (combatant.actor.type === "companion") initiative = await this._initiativeForCompanion(combatant);
      if (combatant.actor.type === "npc") initiative = this._initiativeForNPC();
      if (initiative === null) return;
      updates.push({_id: id, initiative: initiative});
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

  /** @override **/
  async startCombat() {
    this.combatants.forEach(async combatant => {
      const actor =  await combatant.actor;
      refreshOnCombatStart(actor);
      runEventsFor("combatStart", actor);
      reenableEventsOn("combatStart", actor);
    });
    return await super.startCombat();
  }

  /** @override **/
  async endCombat() {
    await super.endCombat();
    const combatantId = this.current.combatantId;
    const combatant = this.combatants.get(combatantId);
    if (combatant) clearMultipleCheckPenalty(combatant.actor);
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
    let combatant = this.turns[previousTurn];
    while (combatant !== undefined && combatant.skip) {
      previousTurn--;
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
    let combatant = this.turns[turn];
    while (combatant !== undefined && combatant.skip) {
      turn--;
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

  async _onStartTurn(combatant) {
    const actor = combatant.actor;
    await this._respectRoundCounterForEffects(actor)
    runEventsFor("turnStart", actor);
    reenableEventsOn("turnStart", actor);
    this._runEventsForAllCombatants("actorWithIdStartsTurn", {otherActorId: actor.id});
    clearHelpDice(actor);
    clearHeldAction(actor);
    await super._onStartTurn(combatant);

    // Run onStartTurn for all linked companions
    if (combatant.companions) combatant.companions.forEach(companionId => {
      const companion = this.combatants.get(companionId);
      if(companion) this._onStartTurn(companion)
    });
  }

  async _onEndTurn(combatant) {
    const actor = combatant.actor;
    const currentRound = this.turn === 0 ? this.round - 1 : this.round; 
    refreshOnRoundEnd(actor);
    this._deathsDoorCheck(actor);
    runEventsFor("turnEnd", actor);
    runEventsFor("nextTurnEnd", actor, {currentRound: currentRound});
    reenableEventsOn("turnEnd", actor);
    this._runEventsForAllCombatants("actorWithIdEndsTurn", {otherActorId: actor.id});
    this._runEventsForAllCombatants("actorWithIdEndsNextTurn", {otherActorId: actor.id, currentRound: currentRound});
    clearMultipleCheckPenalty(actor);
    clearMovePoints(actor);
    await super._onEndTurn(combatant);

    // Run onEndTurn for all linked companions
    if (combatant.companions) combatant.companions.forEach(companionId => {
      const companion = this.combatants.get(companionId);
      if(companion) this._onEndTurn(companion)
    });
  }

  async _respectRoundCounterForEffects(actor) {
    for (const effect of actor.temporaryEffects) {
      effect.respectRoundCounter()
    }
  }

  async _runEventsForAllCombatants(trigger, filters) {
    this.combatants.forEach(combatant => {
      runEventsFor(trigger, combatant.actor, filters);
      reenableEventsOn(trigger, combatant.actor, filters);
    });
  }

  async _initiativeForCompanion(combatant) {
    if (companionShare(combatant.actor, "initiative")) {
      const companionOwnerId = combatant.actor.companionOwner.id;
      const owner = this.combatants.find(combatant => combatant.actorId === companionOwnerId);
      if (!owner) ui.notifications.warn("This companion shares initative with its owner. You need to roll for Initative for the owner!");
      return null;
    }
    else {
      return this._initiativeRollForPC(combatant);
    }
  }

  async _initiativeRollForPC(combatant) {
    const actor = combatant.actor;
    const options = {"flat": "Flat d20 Roll", ...actor.getCheckOptions(true, true, true, true)};
    const checkKey = await getSimplePopup("select", {header: game.i18n.localize("dc20rpg.initiative.selectInitiative"), selectOptions: options, preselect: "att"});
    if (!checkKey) return null;

    const details = prepareCheckDetailsFor(checkKey, null, null, "Initative Roll", options[checkKey]);
    details.initiative = true; // For Roll Level Check
    const roll = await promptRoll(actor, details);
    if (!roll) return null;

    // For nat 1 we want player to always start last.
    if (roll.fail) {
      sendDescriptionToChat(actor, {
        rollTitle: "Critical Failure Initiative - exposed",
        image: actor.img,
        description: "You become Exposed (Attack Checks made against it has ADV) against the next Attack made against you.",
      });
      actor.toggleStatusEffect("exposed", { active: true, extras: {untilFirstTimeTriggered: true} });
      return 0; 
    }
    else return roll.total;
  }

  _initiativeForNPC() {
    const pcTurns = [];
    const npcTurns = [];
    this.turns.forEach((turn) => {
      if (turn.initiative != null) {
        if (turn.actor.type === "character") pcTurns.push(turn);
        if ((turn.actor.type === "npc")) npcTurns.push(turn);
      }
    });
    
    if (pcTurns.length === 0) {
      ui.notifications.error("At least one PC should be in initative order at this point!"); 
      return;
    }

    if (!this.flags.dc20rpg?.encounterDC) {
      ui.notifications.error(game.i18n.localize("dc20rpg.combatTracker.provideDC"));
      return;
    }

    // For nat 1 we want player to always start last.We give them initative equal to 0 so 0.5 is a minimum value that enemy can get
    const checkOutcome = this._checkWhoGoesFirst();
    // Special case when 2 PC start in initative order
    if (checkOutcome === "2PC") {
      // Only one PC
      if (pcTurns.length === 1 && !npcTurns[0]) return Math.max(pcTurns[0].initiative - 0.5, 0.5);
      // More than one PC
      for (let i = 1; i < pcTurns.length; i ++) {
        if (!npcTurns[i-1]) return Math.max(pcTurns[i].initiative - 0.5, 0.5);
      }
      // More NPCs than PCs - add those at the end
      if (npcTurns.length >= pcTurns.length - 1) return Math.max(npcTurns[npcTurns.length - 1].initiative - 0.55, 0.5);
    }
    else {
      for (let i = 0; i < pcTurns.length; i ++) {
        if (!npcTurns[i]) {
          // Depending on outcome of encounter check we want enemy to be before or after pcs
          const changeValue = checkOutcome === "PC" ? - 0.5 : 0.5; 
          return Math.max(pcTurns[i].initiative + changeValue, 0.5);
        }
      }
      // More NPCs than PCs - add those at the end
      if (npcTurns.length >= pcTurns.length) return Math.max(npcTurns[npcTurns.length - 1].initiative - 0.55, 0.5); 
    }
  }

  _checkWhoGoesFirst() {
    // Determine who goes first. Players or NPCs
    const turns = this.turns;
    if (turns) {
      let highestPCInitiative;
      for (let i = 0; i < turns.length; i++) {
        if (turns[i].actor.type === "character") {
          highestPCInitiative = turns[i].initiative;
          break;
        }
      }
      if (highestPCInitiative >= this.flags.dc20rpg.encounterDC + 5) return "2PC";
      else if (highestPCInitiative >= this.flags.dc20rpg.encounterDC) return "PC";
      else return "ENEMY";
    }
  }

  async _deathsDoorCheck(actor) {
    // Check if actor is on death's door
    const notDead = !actor.hasStatus("dead");
    const deathsDoor = actor.system.death;
    const exhaustion = actor.system.exhaustion;
    const exhFormula =  actor.system.exhaustion > 0 ? ` - ${exhaustion}` : "";
    const saveFormula = `d20${exhFormula}`;
    if (deathsDoor.active && !deathsDoor.stable && notDead) {
      const roll = await promptRollToOtherPlayer(actor, {
        label: game.i18n.localize('dc20rpg.death.save'),
        type: "deathSave",
        against: 10,
        roll: saveFormula
      });

      if (roll.crit) {
        const health = actor.system.resources.health;
        actor.update({["system.resources.health.value"]: 1});
        sendHealthChangeMessage(actor, Math.abs(health.value) + 1, game.i18n.localize('dc20rpg.death.crit'), "healing");
      }

      else if (roll.fail) {
        const health = actor.system.resources.health;
        const newValue = health.value - 1;
        addStatusWithIdToActor(actor, "unconscious");
        addStatusWithIdToActor(actor, "prone");
        actor.update({["system.resources.health.value"]: newValue});
        sendHealthChangeMessage(actor, 1, game.i18n.localize('dc20rpg.death.saveFail'), "damage");
      }

      else if (roll._total < 10) {
        const health = actor.system.resources.health;
        const newValue = health.value - 1;
        actor.update({["system.resources.health.value"]: newValue});
        sendHealthChangeMessage(actor, 1, game.i18n.localize('dc20rpg.death.saveFail'), "damage");
      }
    }
  }
}