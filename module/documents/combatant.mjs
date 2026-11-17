export class DC20RpgCombatant extends Combatant {
  prepareData() {
    super.prepareData()
    if (!this.actor) return;
    if (!this.actor.prepared) this.actor.prepareData();
  }
}