import { companionShare } from "../helpers/actors/companion.mjs";

export class DC20RpgCombatant extends Combatant {

  constructor(data, combat) {
    super(data, combat);
    if (!this.actor) return;
    const isCharacterType = this.actor.type === "character";
    const companionDoesNotShareInitiative = this.actor.type === "companion" && !companionShare(this.actor, "initiative");
    this.canRollInitiative = isCharacterType || companionDoesNotShareInitiative;
  }

  get isDefeated() {
    return this.defeated || !!this.actor?.hasStatus(CONFIG.specialStatusEffects.DEFEATED);
  }

  prepareData() {
    super.prepareData()
    if (!this.actor) return;
    if (!this.actor.prepared) this.actor.prepareData();
  }
}