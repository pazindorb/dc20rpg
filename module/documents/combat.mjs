import { refreshOnCombatEnd, refreshOnRoundEnd } from "../helpers/actors/rest.mjs";
import { handleRollFromFormula } from "../helpers/actors/rollsFromActor.mjs";

export class DC20RpgCombat extends Combat {

  /** @override **/
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}, label="Initiative", type=null}={}) {
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
      const initiative = combatant.actor.type === "character" 
            ? await this._initiativeRollForPC(combatant, formula, label, type, messageOptions, i, messages) 
            : this._initiativeForNPC();
      if (initiative == null) return;
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
    await ChatMessage.implementation.create(messages);
    return this;
  }

  /** @override **/
  async nextTurn() {
    let turn = this.turn ?? -1;
    let skip = this.settings.skipDefeated;
    
    // Refresh resources on turn end
    const combatant = this.combatants.get(this.current.combatantId);
    const actor =  await combatant.actor;
    refreshOnRoundEnd(actor);

    // Determine the next turn number
    let next = null;
    if ( skip ) {
      for ( let [i, t] of this.turns.entries() ) {
        if ( i <= turn ) continue;
        if ( t.isDefeated ) continue;
        next = i;
        break;
      }
    }
    else next = turn + 1;

    // Maybe advance to the next round
    let round = this.round;
    if ( (this.round === 0) || (next === null) || (next >= this.turns.length) ) {
      return this.nextRound();
    }

    // Update the document, passing data through a hook first
    const updateData = {round, turn: next};
    const updateOptions = {advanceTime: CONFIG.time.turnTime, direction: 1};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** @override **/
  async endCombat() {
    return Dialog.confirm({
      title: game.i18n.localize("COMBAT.EndTitle"),
      content: `<p>${game.i18n.localize("COMBAT.EndConfirmation")}</p>`,
      yes: () => {
        this.combatants.forEach(async combatant => {
          const actor =  await combatant.actor;
          refreshOnCombatEnd(actor);
        });
        this.delete();
      }
    });
  }

  /** @override **/
  async _manageTurnEvents(adjustedTurn) {
    if ( !game.users.activeGM?.isSelf ) return;
    const prior = this.previous && this.combatants.get(this.previous.combatantId);

    // Adjust the turn order before proceeding. Used for embedded document workflows
    if ( Number.isNumeric(adjustedTurn) ) await this.update({turn: adjustedTurn}, {turnEvents: false});
    if ( !this.started ) return;

    // Identify what progressed
    const advanceRound = this.current.round > (this.previous.round ?? -1);
    const advanceTurn = this.current.turn > (this.previous.turn ?? -1);
    if ( !(advanceTurn || advanceRound) ) return;

    // Conclude prior turn
    if ( prior ) await this._onEndTurn(prior);

    // Conclude prior round
    if ( advanceRound && (this.previous.round !== null) ) await this._onEndRound();

    // Begin new round
    if ( advanceRound ) await this._onStartRound();

    // Begin a new turn
    await this._onStartTurn(this.combatant);
  }

  async _initiativeRollForPC(combatant, formula, label, type) {
    const dataset = !formula ? combatant.getRemeberedDataset() : {
      roll: formula,
      label: label,
      formulaLabel: "Initative Roll",
      type: type
    };
    const roll = handleRollFromFormula(combatant.actor, dataset, true)
    if (!roll) return;
    combatant.rememberDataset(dataset);
    if (roll.fail) return 0; // For nat 1 we want player to always start last.
    else return roll.total;
  }

  _initiativeForNPC() {
    const pcTurns = [];
    const npcTurns = [];
    this.turns.forEach((turn) => {
      if (turn.initiative != null) {
        if (turn.actor.type === "character") pcTurns.push(turn);
        else npcTurns.push(turn);
      }
    });
    
    if (pcTurns.length === 0) {
      ui.notifications.error("At least one PC should be in initative order at this point!"); 
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
      if (highestPCInitiative >= this.flags.encounterDC + 5) return "2PC";
      else if (highestPCInitiative >= this.flags.encounterDC) return "PC";
      else return "ENEMY";
    }
  }
}