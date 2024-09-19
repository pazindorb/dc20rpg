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

  rememberDataset(dataset) {
    this.update({['flags.dc20rpg.initiativeDataset']: dataset});
  }

  getRemeberedDataset() {
    const dataset = this.flags.dc20rpg?.initiativeDataset;
    if (dataset) return dataset;
    else ui.notifications.error("Initative formula for that combatant was not yet chosen. Please roll initiative from character sheet!");    
  }
}