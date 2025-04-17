import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";

class InitiativeSlotSelector extends Dialog {

  constructor(combat, winningTeam, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.pcWin = winningTeam === "pc";
    this.combat = combat;
    this.enemySelected = "";
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"],
      width: 450,
    });
  }

  /** @override */
  get template() {
    return "systems/dc20rpg/templates/dialogs/initiative-slot-selector.hbs";
  }

  getData() {
    const pcCombatants = this.combat.combatants
              .filter(combatant => combatant.actor.type === "character")
              .sort((a, b) => {
                const first = a.slot || 99;
                const second = b.slot || 99;
                return first - second;
              })
    const slots = this.pcWin ?
      {1:1, 3:3, 5:5, 7:7, 9:9, 11:11, 13:13, 15:15, 17:17, 19:19} :
      {2:2, 4:4, 6:6, 8:8, 10:10, 12:12, 14:14, 16:16, 16:16, 20:20}

    return {
      header: this.pcWin ? "PC Team Wins" : "Enemy Team Wins",
      combatants: pcCombatants,
      enemySelection: this.pcWin ? null : this._getEnemySelection(),
      enemySelected: this.enemySelected,
      slots: slots
    }
  }

  _getEnemySelection() {
    const enemySelection = {};
    this.combat.combatants
          .filter(combatant => combatant.actor.type === "npc")
          .forEach(combatant => enemySelection[combatant._id] = combatant.name);
    return enemySelection;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".select-slot").change(ev => this._onSelection(datasetOf(ev).combatantId, valueOf(ev)));
    html.find(".select-enemy").change(ev => this._onEnemySelection(valueOf(ev)));
    html.find(".confirm-selection").click(ev => this._onConfirm(ev));
  }

  _onSelection(combatantId, value) {
    const combatant = this.combat.combatants.get(combatantId);
    if (!combatant) return;
    combatant.slot = value;
    this.render();
  }

  _onEnemySelection(combatantId) {
    // Deselect already selected
    if (this.enemySelected) {
      const alreadySelected = this.combat.combatants.get(this.enemySelected);
      if (alreadySelected) alreadySelected.slot = undefined;
    }

    // Select new enemy
    const combatant = this.combat.combatants.get(combatantId);
    if (!combatant) return;
    combatant.slot = 1;
    this.enemySelected = combatantId;
    this.render();
  }

  async _onConfirm(event) {
    event.preventDefault();

    const combatants = this.combat.combatants;
    for (const combatant of combatants) {
      if (combatant.slot) {
        let numericValue = parseInt(combatant.slot);
        if (isNaN(numericValue)) continue;
        combatant.update({initiative: 20 - numericValue});
      }
    }
    this.promiseResolve(null);
    this.close();
  }

  static async create(combat, winningTeam, dialogData = {}, options = {}) {
    const prompt = new InitiativeSlotSelector(combat, winningTeam, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(false);
    super.close(options);
  }
}

export async function initiativeSlotSelector(combat, winningTeam) {
  return await InitiativeSlotSelector.create(combat, winningTeam, {title: "Initative Slot Selector"});
}