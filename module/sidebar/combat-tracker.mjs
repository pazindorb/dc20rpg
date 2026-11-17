export class DC20RpgCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  /** @override */
  static PARTS = {
    header: {template: "systems/dc20rpg/templates/sidebar/combat-tracker/header.hbs"},
    tracker: {template: "systems/dc20rpg/templates/sidebar/combat-tracker/tracker.hbs"},
    footer: {template: "templates/sidebar/tabs/combat/footer.hbs"}
  };

  /** @override */
  async _prepareTurnContext(combat, combatant, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index);

    turn.active = combat.activeCombatants.some(candidate => candidate.id === combatant.id);
    if (turn.active && !turn.css.includes("active")) turn.css += " active";
    turn.slot = combat.getSlotNumber(combatant);
    const sharedCombatants = combat.getInitiativeSharingPartners(combatant)
      .filter(candidate => game.user.isGM || !candidate.hidden);
    turn.sharedInitiativeNames = sharedCombatants.map(candidate => candidate.name).join(", ");
    return turn;
  }

  /** @override */
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);

    let previousSlot;
    let visibleSlotIndex = 0;
    for (const turn of context.turns ?? []) {
      if (turn.slot === null) {
        turn.slotClass = "slot-empty";
        continue;
      }

      const startsSlot = turn.slot !== previousSlot;
      if (startsSlot) {
        previousSlot = turn.slot;
        visibleSlotIndex++;
      }
      turn.slotClass = `${visibleSlotIndex % 2 ? "slot-odd" : "slot-even"}${startsSlot ? " slot-start" : ""}`;
    }
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!game.user.isGM) return;

    const tracker = this.element.querySelector(".combat-tracker");
    if (!tracker || tracker.dataset.dc20DragDropBound) return;
    tracker.dataset.dc20DragDropBound = "true";
    tracker.addEventListener("dragstart", this._onCombatantDragStart.bind(this));
    tracker.addEventListener("dragend", this._onCombatantDragEnd.bind(this));
    tracker.addEventListener("dragover", this._onCombatantDragOver.bind(this));
    tracker.addEventListener("dragleave", this._onCombatantDragLeave.bind(this));
    tracker.addEventListener("drop", this._onCombatantDrop.bind(this));
  }

  _onCombatantDragStart(event) {
    const row = event.target.closest(".combatant[data-combatant-id]");
    if (!row) return;

    this._draggedCombatantId = row.dataset.combatantId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-dc20-combatant", this._draggedCombatantId);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "DC20Combatant",
      combatId: this.viewed?.id,
      combatantId: this._draggedCombatantId
    }));
    row.classList.add("dragging");
  }

  _onCombatantDragEnd() {
    this._draggedCombatantId = null;
    this._clearDropIndicators();
    this.element.querySelectorAll(".combatant.dragging").forEach(row => row.classList.remove("dragging"));
  }

  _onCombatantDragOver(event) {
    if (!this._draggedCombatantId) return;
    const row = event.target.closest(".combatant[data-combatant-id]");
    if (!row || row.dataset.combatantId === this._draggedCombatantId) return;

    const target = this.viewed?.combatants.get(row.dataset.combatantId);
    if (!target || this.viewed.getSlotNumber(target) === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    this._clearDropIndicators();
    row.classList.add(`drop-${this._getDropPlacement(event, row)}`);
  }

  _onCombatantDragLeave(event) {
    const row = event.target.closest(".combatant[data-combatant-id]");
    if (row && !row.contains(event.relatedTarget)) row.classList.remove("drop-above", "drop-same", "drop-below");
  }

  async _onCombatantDrop(event) {
    if (!this._draggedCombatantId) return;
    const row = event.target.closest(".combatant[data-combatant-id]");
    if (!row) return;

    event.preventDefault();
    event.stopPropagation();
    const source = this.viewed?.combatants.get(this._draggedCombatantId);
    const target = this.viewed?.combatants.get(row.dataset.combatantId);
    const placement = this._getDropPlacement(event, row);
    this._onCombatantDragEnd();
    if (source && target) await this.viewed.moveCombatantToSlot(source, target, placement);
  }

  _getDropPlacement(event, row) {
    const bounds = row.getBoundingClientRect();
    const position = (event.clientY - bounds.top) / bounds.height;
    if (position < 1 / 3) return "above";
    if (position > 2 / 3) return "below";
    return "same";
  }

  _clearDropIndicators() {
    this.element.querySelectorAll(".combatant.drop-above, .combatant.drop-same, .combatant.drop-below")
      .forEach(row => row.classList.remove("drop-above", "drop-same", "drop-below"));
  }
}