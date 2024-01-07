export class DC20RpgCombatant extends Combatant {

  constructor(data, combat) {
    super(data, combat);
    this.canRollInitiative = this.actor.type === "character";
  }

  prepareData() {
    super.prepareData()
    if (!this.actor.prepared) this.actor.prepareData();
  }

  rememberDataset(dataset) {
    this.initiativeDataset = dataset;
  }

  getRemeberedDataset() {
    if (this.initiativeDataset) return this.initiativeDataset;
    else ui.notifications.error("Initative formula for that combatant was not yet chosen. Please roll initiative from character sheet!");    
  }
}