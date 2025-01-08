import { companionShare } from "../helpers/actors/companion.mjs";

export class DC20RpgCombatant extends Combatant {

  constructor(data, combat) {
    super(data, combat);
    const isCharacterType = this.actor.type === "character";
    const companionDoesNotShareInitative = this.actor.type === "companion" && !companionShare(this.actor, "initiative");
    this.canRollInitiative = isCharacterType || companionDoesNotShareInitative;
  }

  get isDefeated() {
    return this.defeated || !!this.actor?.hasStatus(CONFIG.specialStatusEffects.DEFEATED);
  }

  prepareData() {
    super.prepareData()
    if (!this.actor.prepared) this.actor.prepareData();
  }
}