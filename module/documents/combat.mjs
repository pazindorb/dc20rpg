import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { actorIdFilter, currentRoundFilter, reenableEventsOn, runEventsFor } from "../helpers/actors/events.mjs";

export class DC20RpgCombat extends Combat {

  static SLOT_INITIATIVE_BASE = 20;

  get lastActiveTurn() {
    const indexes = [];
    this.activeCombatants.forEach(combatant => indexes.push(this.turns.indexOf(combatant)));
    if (indexes.length === 0) return this.turn;
    else return Math.max(...indexes);
  }

  get activeCombatants() {
    if (!this.combatant) return [];
    return this.getCombatantsInSlot(this.combatant);
  }

  /** @override */
  _updateTurnMarkers() {
    super._updateTurnMarkers();
    if (!canvas.ready || !this.isView) return;
    for (const combatant of this.activeCombatants) {
      combatant.token?.object?.renderFlags.set({refreshTurnMarker: true});
    }
  }

  getCombatantsInSlot(combatantOrInitiative) {
    const initiative = typeof combatantOrInitiative === "number"
      ? combatantOrInitiative
      : combatantOrInitiative?.initiative;
    if (!Number.isFinite(initiative)) {
      return combatantOrInitiative && typeof combatantOrInitiative !== "number" ? [combatantOrInitiative] : [];
    }
    return this.turns.filter(combatant => combatant.initiative === initiative);
  }

  getSlotNumber(combatant) {
    if (!Number.isFinite(combatant?.initiative)) return null;
    const slot = DC20RpgCombat.SLOT_INITIATIVE_BASE - combatant.initiative;
    return Number.isInteger(slot) && slot >= 1 ? slot : null;
  }

  get nextSlotNumber() {
    const slots = this.combatants
      .map(combatant => this.getSlotNumber(combatant))
      .filter(Number.isFinite);
    return slots.length ? Math.max(...slots) + 1 : 1;
  }

  _getSharingOwner(combatant) {
    if (!companionShare(combatant?.actor, "initiative")) return null;
    return this.combatants.find(candidate => candidate.actorId === combatant.actor.companionOwner.id) ?? null;
  }

  _getSharingGroup(combatant) {
    const owner = this._getSharingOwner(combatant) ?? combatant;
    const group = [owner];
    for (const candidate of this.combatants) {
      if (candidate.id === owner.id) continue;
      if (!companionShare(candidate.actor, "initiative")) continue;
      if (candidate.actor.companionOwner.id === owner.actorId) group.push(candidate);
    }
    return group;
  }

  getInitiativeSharingPartners(combatant) {
    const owner = this._getSharingOwner(combatant);
    if (owner) return [owner];
    return this.combatants.filter(candidate => this._getSharingOwner(candidate)?.id === combatant.id);
  }

  async _updateInitiatives(updates) {
    updates = this._compactSlotUpdates(updates);
    if (!updates.length) return this;
    const activeId = this.combatant?.id;
    await this.updateEmbeddedDocuments("Combatant", updates);
    if (this.started && activeId) {
      const activeTurn = this.turns.findIndex(combatant => combatant.id === activeId);
      if (activeTurn >= 0 && activeTurn !== this.turn) await this.update({turn: activeTurn});
    }
    return this;
  }

  _compactSlotUpdates(updates) {
    const updatesById = new Map(updates.map(update => [update._id, {...update}]));
    const projectedInitiatives = new Map(
      this.combatants.map(combatant => [combatant.id, combatant.initiative])
    );
    for (const update of updates) {
      if (Object.hasOwn(update, "initiative")) projectedInitiatives.set(update._id, update.initiative);
    }

    const occupiedSlots = [...new Set(
      [...projectedInitiatives.values()]
        .filter(Number.isFinite)
        .map(initiative => DC20RpgCombat.SLOT_INITIATIVE_BASE - initiative)
        .filter(slot => Number.isInteger(slot) && slot >= 1)
    )].sort((slotA, slotB) => slotA - slotB);
    const compactedSlots = new Map(occupiedSlots.map((slot, index) => [slot, index + 1]));

    for (const combatant of this.combatants) {
      const projectedInitiative = projectedInitiatives.get(combatant.id);
      if (!Number.isFinite(projectedInitiative)) continue;
      const projectedSlot = DC20RpgCombat.SLOT_INITIATIVE_BASE - projectedInitiative;
      const compactedSlot = compactedSlots.get(projectedSlot);
      if (!compactedSlot) continue;

      const compactedInitiative = DC20RpgCombat.SLOT_INITIATIVE_BASE - compactedSlot;
      const existingUpdate = updatesById.get(combatant.id);
      if (!existingUpdate && combatant.initiative === compactedInitiative) continue;
      if (existingUpdate?.initiative === compactedInitiative) continue;
      const update = existingUpdate ?? {_id: combatant.id};
      update.initiative = compactedInitiative;
      updatesById.set(combatant.id, update);
    }
    return [...updatesById.values()];
  }

  async assignSlot(combatant, slot) {
    const numericSlot = Number.parseInt(slot);
    if (!combatant || !Number.isInteger(numericSlot) || numericSlot < 1) return this;
    const initiative = DC20RpgCombat.SLOT_INITIATIVE_BASE - numericSlot;
    const updates = this._getSharingGroup(combatant)
      .filter(member => member.initiative !== initiative)
      .map(member => ({_id: member.id, initiative}));
    return this._updateInitiatives(updates);
  }

  async clearSlot(combatant) {
    if (!combatant) return this;
    const updates = this._getSharingGroup(combatant)
      .filter(member => member.initiative !== null)
      .map(member => ({_id: member.id, initiative: null}));
    return this._updateInitiatives(updates);
  }

  async moveCombatantToSlot(combatant, target, placement = "same") {
    if (!combatant || !target || combatant.id === target.id) return this;
    if (!["above", "same", "below"].includes(placement)) return this;

    const targetSlot = this.getSlotNumber(target);
    if (targetSlot === null) return this;

    const movingGroup = this._getSharingGroup(combatant);
    const movingIds = new Set(movingGroup.map(member => member.id));
    if (movingIds.has(target.id)) return this;

    const slots = new Map();
    for (const candidate of this.turns) {
      if (movingIds.has(candidate.id)) continue;
      const slot = this.getSlotNumber(candidate);
      if (slot === null) continue;
      if (!slots.has(slot)) slots.set(slot, []);
      slots.get(slot).push(candidate);
    }

    const targetGroup = slots.get(targetSlot);
    if (!targetGroup) return this;

    const orderedSlots = [...slots.entries()]
      .sort(([slotA], [slotB]) => slotA - slotB)
      .map(([, members]) => members);
    const targetIndex = orderedSlots.indexOf(targetGroup);

    if (placement === "same") targetGroup.push(...movingGroup);
    else orderedSlots.splice(targetIndex + (placement === "below" ? 1 : 0), 0, movingGroup);

    const updates = [];
    for (const [index, members] of orderedSlots.entries()) {
      const initiative = DC20RpgCombat.SLOT_INITIATIVE_BASE - (index + 1);
      for (const member of members) {
        if (member.initiative !== initiative) updates.push({_id: member.id, initiative});
      }
    }
    return this._updateInitiatives(updates);
  }

  async synchronizeCompanionSlots() {
    const updates = [];
    for (const companion of this.combatants) {
      const owner = this._getSharingOwner(companion);
      if (!owner || companion.initiative === owner.initiative) continue;
      updates.push({_id: companion.id, initiative: owner.initiative});
    }
    return this._updateInitiatives(updates);
  }

  async assignUnslottedCombatants() {
    let slot = this.nextSlotNumber;
    for (const combatant of this.combatants) {
      if (this.getSlotNumber(combatant) !== null) continue;
      const owner = this._getSharingOwner(combatant);
      if (owner) continue;
      await this.assignSlot(combatant, slot++);
    }
    for (const combatant of this.combatants) {
      if (this.getSlotNumber(combatant) !== null) continue;
      await this.assignSlot(combatant, slot++);
    }
    return this;
  }

  /** Compatibility with core/module calls: DC20 0.11 assigns slots instead of rolling. */
  async rollInitiative(ids) {
    ids = typeof ids === "string" ? [ids] : Array.from(ids ?? []);
    let slot = this.nextSlotNumber;
    const assignedGroups = new Set();
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;
      const groupId = this._getSharingOwner(combatant)?.id ?? combatant.id;
      if (assignedGroups.has(groupId)) continue;
      assignedGroups.add(groupId);
      await this.assignSlot(combatant, slot++);
    }
    return this;
  }

  // =================================
  // ==           COMBAT            ==
  // =================================
  /** @override **/
  async startCombat() {
    await this.synchronizeCompanionSlots();
    await this.assignUnslottedCombatants();
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;
      actor.refresh.on("combatStart");
      runEventsFor("combatStart", actor);
      reenableEventsOn("combatStart", actor);
      if (actor.type === "character") {
        actor.move.startingMovement();
      }
    }
    return await super.startCombat();
  }

  /** @override **/
  async endCombat() {
    const combatantId = this.current.combatantId;
    const combatant = this.combatants.get(combatantId);
    const token = combatant?.token?.object;

    if (combatant) combatant.actor.mcp.clear();
    this.combatants.forEach(combatant => {
      const actor = combatant.actor;
      actor.heldAction.clear();
      actor.help.clear();
      actor.help.clear(null, "combat");
      actor.refresh.on("combatEnd");
      runEventsFor("combatEnd", actor);
      reenableEventsOn("combatEnd", actor);
    });
    await super.endCombat();
    if (token) token.renderFlags.set({refreshTurnMarker: true});
  }

  /** @override **/
  async nextTurn() {
    let next = this.lastActiveTurn + 1;
    while (next < this.turns.length) {
      const slot = this.getCombatantsInSlot(this.turns[next]);
      if (!this.settings.skipDefeated || slot.some(combatant => !combatant.isDefeated)) break;
      next += Math.max(slot.length, 1);
    }
    if ((this.round === 0) || (next >= this.turns.length)) return this.nextRound();

    const updateData = {round: this.round, turn: next};
    const updateOptions = {direction: 1, worldTime: {delta: CONFIG.time.turnTime}};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** @override **/
  async previousTurn() {
    if ((this.turn === 0) && (this.round === 0)) return this;
    const activeIndexes = this.activeCombatants.map(combatant => this.turns.indexOf(combatant));
    const firstActiveTurn = activeIndexes.length ? Math.min(...activeIndexes) : (this.turn ?? this.turns.length);
    let previousTurn = firstActiveTurn - 1;
    if ( (previousTurn < 0) && (this.turn !== null) ) return this.previousRound();
    const previousSlot = this.getCombatantsInSlot(this.turns[previousTurn]);
    if (previousSlot.length) previousTurn = Math.min(...previousSlot.map(combatant => this.turns.indexOf(combatant)));

    // Update the document, passing data through a hook first
    const updateData = {round: this.round, turn: previousTurn};
    const updateOptions = {direction: -1, worldTime: {delta: -1 * CONFIG.time.turnTime}};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** @override **/
  async previousRound() {
    let turn = ( this.round === 0 ) ? 0 : Math.max(this.turns.length - 1, 0);
    if ( this.turn === null ) turn = null;

    const previousSlot = this.getCombatantsInSlot(this.turns[turn]);
    if (previousSlot.length) turn = Math.min(...previousSlot.map(combatant => this.turns.indexOf(combatant)));
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

  async _onStartTurn(currentCombatant, context) {
    const actor = currentCombatant.actor;
    if (!actor) return;
    const transformedActorId = currentCombatant.token?.flags?.dc20rpg?.transformationHistory?.actorId;

    await this._deathsDoorCheck(actor);
    await this._sustainCheck(actor);
    await actor.refresh.on("roundStart");
    runEventsFor("turnStart", actor);
    reenableEventsOn("turnStart", actor);
    this._runEventsForAllCombatants("actorWithIdStartsTurn", actorIdFilter(actor.id, transformedActorId));
    actor.help.clear();
    actor.heldAction.clear();
    await super._onStartTurn(currentCombatant, context);
  }

  async _onEndTurn(currentCombatant, context) {
    const actor = currentCombatant.actor;
    if (!actor) return;
    const transformedActorId = currentCombatant.token?.flags?.dc20rpg?.transformationHistory?.actorId;
    const currentRound = this.turn === 0 ? this.round - 1 : this.round; 
    await actor.refresh.on("roundEnd");
    runEventsFor("turnEnd", actor);
    runEventsFor("nextTurnEnd", actor, currentRoundFilter(actor, currentRound));
    reenableEventsOn("turnEnd", actor);
    this._runEventsForAllCombatants("actorWithIdEndsTurn", actorIdFilter(actor.id, transformedActorId));
    this._runEventsForAllCombatants("actorWithIdEndsNextTurn", actorIdFilter(actor.id, transformedActorId), currentRound);
    await actor.heldAction.saveMcpState();
    await actor.mcp.clear();
    await actor.move.clear();
    await super._onEndTurn(currentCombatant, context);
  }

  async _onEnter(combatant) {
    await super._onEnter(combatant);
    if (!this.started || this.getSlotNumber(combatant) !== null) return;
    const owner = this._getSharingOwner(combatant);
    if (owner && Number.isFinite(owner.initiative)) await this.assignSlot(combatant, this.getSlotNumber(owner));
    else await this.assignSlot(combatant, this.nextSlotNumber);
  }

  async _onExit(combatant) {
    await super._onExit(combatant);
    await this._updateInitiatives([]);
  }

  async _runEventsForAllCombatants(trigger, filters, currentRound) {
    this.combatants.forEach(combatant => {
      const actor = combatant.actor;
      if (!actor) return;
      const actorFilters = currentRound ? [...filters, ...currentRoundFilter(actor, currentRound)] : filters;
      runEventsFor(trigger, actor, actorFilters);
      reenableEventsOn(trigger, actor, actorFilters);
    });
  }

  async _deathsDoorCheck(actor) {
    // Check if actor is on death's door
    const notDead = !actor.statuses.has("dead");
    const deathsDoor = actor.system.death;
    if (deathsDoor.active && notDead) actor.rollDeathSave();
  }

  async _sustainCheck(actor) {
    for (const [key, sustain] of Object.entries(actor.system.sustain)) {

      let confirmed = false;
      // Free sustain
      if (actor.system.globalModifier?.allow?.freeSustain) {
        const message = `Do you want to sustain '${sustain.name}' for free?`;
        confirmed = await SimplePopup.confirm(message, {actor: actor});
        if (confirmed) confirmed = "free";
      }

      // Standard sustain
      if (!confirmed) {
        const message = `Do you want to spend 1 AP to sustain '${sustain.name}'?`;
        confirmed = await SimplePopup.confirm(message, {actor: actor});
      }

      if (confirmed) {
        const subtracted = confirmed === "free" || actor.resources.ap.checkAndSpend(1);
        if (!subtracted) actor.dropSustain(key, "Not enough AP to sustain.");
      }
      else {
        actor.dropSustain(key, "You decided not to sustain it anymore.");
      }
    }
  }
}