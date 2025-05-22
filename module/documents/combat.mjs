import { DC20ChatMessage, sendDescriptionToChat, sendHealthChangeMessage } from "../chat/chat-message.mjs";
import { initiativeSlotSelector } from "../dialogs/initiativeSlotSelector.mjs";
import { refreshOnCombatStart, refreshOnRoundEnd } from "../dialogs/rest.mjs";
import { promptRoll, promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { getSimplePopup, sendSimplePopupToUsers } from "../dialogs/simple-popup.mjs";
import { clearHeldAction, clearHelpDice, clearMovePoints, prepareHelpAction } from "../helpers/actors/actions.mjs";
import { prepareCheckDetailsFor } from "../helpers/actors/attrAndSkills.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { subtractAP } from "../helpers/actors/costManipulator.mjs";
import { actorIdFilter, currentRoundFilter, reenableEventsOn, runEventsFor } from "../helpers/actors/events.mjs";
import { createEffectOn } from "../helpers/effects.mjs";
import { clearMultipleCheckPenalty } from "../helpers/rollLevel.mjs";
import { getActiveActorOwners, getActiveActorOwnersIds } from "../helpers/users.mjs";

export class DC20RpgCombat extends Combat {

  prepareData() {
    super.prepareData();
    this._prepareCompanionSharingInitiative();
  }

  isActorCurrentCombatant(actorId) {
    if (this.combatant.actor.id === actorId) return true;
    if (this.combatant.companions && this.combatant.companions.length !== 0) {
      const comapnionIds = this.combatant.companions;
      for (const combatant of this.combatants) {
        if (!comapnionIds.includes(combatant.id)) continue;
        if (companionShare(combatant.actor, "initiative")) {
          if (combatant.actor.id === actorId) return true;
        }
      }
    }
    return false;
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
      if (actor.type === "character") {
        numberOfPCs++;
        successPCs += this._checkInvidualOutcomes(combatant);
      }
      refreshOnCombatStart(actor);
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
    await this._respectRoundCounterForEffects();
    this._deathsDoorCheck(actor);
    this._sustainCheck(actor);
    runEventsFor("turnStart", actor);
    reenableEventsOn("turnStart", actor);
    this._runEventsForAllCombatants("actorWithIdStartsTurn", actorIdFilter(actor.id));
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
    runEventsFor("turnEnd", actor);
    runEventsFor("nextTurnEnd", actor, currentRoundFilter(actor, currentRound));
    reenableEventsOn("turnEnd", actor);
    this._runEventsForAllCombatants("actorWithIdEndsTurn", actorIdFilter(actor.id));
    this._runEventsForAllCombatants("actorWithIdEndsNextTurn", actorIdFilter(actor.id), currentRound);
    clearMultipleCheckPenalty(actor);
    clearMovePoints(actor);
    await super._onEndTurn(combatant);

    // Run onEndTurn for all linked companions
    if (combatant.companions) combatant.companions.forEach(companionId => {
      const companion = this.combatants.get(companionId);
      if(companion) this._onEndTurn(companion)
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
      if (currentRound) filters = [...filters, ...currentRoundFilter(actor, currentRound)];
      runEventsFor(trigger, actor, filters);
      reenableEventsOn(trigger, actor, filters);
    });
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

  _checkInvidualOutcomes(combatant) {
    const initiativeDC = this.flags.dc20rpg.initiativeDC;
    const actor = combatant.actor;

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
      prepareHelpAction(actor, {diceValue: 6, doNotExpire: true});
      return true;
    }
    return false;
  }

  async _initiativeRollForPC(combatant) {
    const actor = combatant.actor;

    // TODO: Is initiative choice still an option?
    // const options = {"flat": "Flat d20 Roll", "initiative": "Initiative (Agi + CM)", ...actor.getCheckOptions(true, true, true, true)};
    // const preselected = game.settings.get("dc20rpg", "defaultInitiativeKey");
    // const checkKey = await getSimplePopup("select", {header: game.i18n.localize("dc20rpg.initiative.selectInitiative"), selectOptions: options, preselect: (preselected || "initiative")});
    // if (!checkKey) return null;
    // const details = prepareCheckDetailsFor(checkKey, null, null, "Initiative Roll", options[checkKey]);
    // details.type = "initiative" // For Roll Level Check

    const details = prepareCheckDetailsFor("initiative", null, null, "Initiative Roll");
    const roll = await promptRoll(actor, details);
    if (!roll) return null;

    combatant.initativeOutcome = {crit: roll.crit, fail: roll.fail};
    return roll.total;
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
      label: "Initiative Critical Success",
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
      label: "Initiative Critical Fail",
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
      ui.notifications.error("At least one PC should be in initiative order at this point!"); 
      return;
    }

    // For nat 1 we want player to always start last.We give them initiative equal to 0 so 0.5 is a minimum value that enemy can get
    const checkOutcome = this._checkWhoGoesFirst();
    // Special case when 2 PC start in initiative order
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
      if (highestPCInitiative >= this.flags.dc20rpg.initiativeDC + 5) return "2PC";
      else if (highestPCInitiative >= this.flags.dc20rpg.initiativeDC) return "PC";
      else return "ENEMY";
    }
  }

  async _deathsDoorCheck(actor) {
    // Check if actor is on death's door
    const notDead = !actor.hasStatus("dead");
    const deathsDoor = actor.system.death;
    const exhaustion = actor.exhaustion;
    const saveFormula = `d20 - ${exhaustion}`;
    if (deathsDoor.active && notDead) {
      const roll = await promptRollToOtherPlayer(actor, {
        label: game.i18n.localize('dc20rpg.death.save'),
        type: "deathSave",
        against: 10,
        roll: saveFormula
      });

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
    const currentSustain = actor.system.sustain;
    let sustained = [];
    for (const sustain of currentSustain) {
      const message = `Do you want to spend 1 AP to sustain '${sustain.name}'?`;
      let confirmed = false; 
      const actorOwners = getActiveActorOwnersIds(actor, false);
      if (actorOwners.length > 0) {
        confirmed = await sendSimplePopupToUsers(actorOwners, "confirm", {header: message});
      }
      else {
        confirmed = await getSimplePopup("confirm", {header: message});
      }

      if (confirmed) {
        const subtracted = await subtractAP(actor, 1);
        if (subtracted) sustained.push(sustain);
        else {
          sendDescriptionToChat(actor, {
            rollTitle: `${sustain.name} - Sustain dropped`,
            image: sustain.img,
            description: `You are no longer sustaining '${sustain.name}' - Not enough AP to sustain`,
          });
        }
      }
      else {
        sendDescriptionToChat(actor, {
          rollTitle: `${sustain.name} - Sustain dropped`,
          image: sustain.img,
          description: `You are no longer sustaining '${sustain.name}'`,
        });
      }
    }

    if (sustained.length !== currentSustain.length) {
      await actor.update({[`system.sustain`]: sustained});
    }
  }
}