import { DC20ChatMessage, sendHealthChangeMessage } from "../chat/chat-message.mjs";
import { _applyDamageModifications } from "../chat/chat-utils.mjs";
import { refreshOnCombatStart, refreshOnRoundEnd } from "../dialogs/rest.mjs";
import { promptRollToOtherPlayer } from "../dialogs/roll-prompt.mjs";
import { clearHelpDice, clearMovePoints } from "../helpers/actors/actions.mjs";
import { reenableEffects, runEventsFor } from "../helpers/actors/events.mjs";
import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { clearMultipleCheckPenalty } from "../helpers/rollLevel.mjs";
import { addStatusWithIdToActor } from "../statusEffects/statusUtils.mjs";

export class DC20RpgCombat extends Combat {

  /** @override **/
  async rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}, label="Initiative", type=null, checkKey="att"}={}) {
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
            ? await this._initiativeRollForPC(combatant, formula, label, type, checkKey) 
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
    await DC20ChatMessage.implementation.create(messages);
    return this;
  }

  /** @override **/
  async startCombat() {
    this.combatants.forEach(async combatant => {
      const actor =  await combatant.actor;
      refreshOnCombatStart(actor);
    });
    return await super.startCombat();
  }

  async endCombat() {
    await super.endCombat();
    const combatantId = this.current.combatantId;
    const combatant = this.combatants.get(combatantId);
    if (combatant) clearMultipleCheckPenalty(combatant.actor);
  }

  async _onStartTurn(combatant) {
    const actor =  await combatant.actor;
    runEventsFor("turnStart", actor);
    this._runEventForAllCombatants("actorWithIdStartsTurn", actor.id);
    reenableEffects("turnStart", actor);
    clearHelpDice(actor);
    super._onStartTurn(combatant);
  }

  async _onEndTurn(combatant) {
    const actor =  await combatant.actor;
    refreshOnRoundEnd(actor);
    this._deathsDoorCheck(actor);
    runEventsFor("turnEnd", actor);
    this._runEventForAllCombatants("actorWithIdEndsTurn", actor.id);
    reenableEffects("turnEnd", actor);
    clearMultipleCheckPenalty(actor);
    clearMovePoints(actor);
    super._onEndTurn(combatant);
  }

  async _runEventForAllCombatants(trigger, actorId) {
    this.combatants.forEach(combatant => {
      runEventsFor(trigger, combatant.actor, {otherActorId: actorId});
      reenableEffects(trigger, combatant.actor, {otherActorId: actorId});
    });
  }

  async _initiativeRollForPC(combatant, formula, label, type, checkKey) {
    const dataset = !formula ? combatant.getRemeberedDataset() : {
      roll: formula,
      label: label,
      rollTitle: "Initative Roll",
      type: type,
      checkKey: checkKey
    };
    const roll = await rollFromSheet(combatant.actor, dataset)
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
        type: "",
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