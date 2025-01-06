export class DC20RpgCombatant extends Combatant {

  constructor(data, combat) {
    super(data, combat);
    this.canRollInitiative = this.actor.type === "character";
  }

  get isDefeated() {
    return this.defeated || !!this.actor?.hasStatus(CONFIG.specialStatusEffects.DEFEATED);
  }

  prepareData() {
    super.prepareData()
    if (!this.actor.prepared) this.actor.prepareData();
  }
}