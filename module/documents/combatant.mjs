export class DC20RPGCombatant extends Combatant {

  /** @override **/
  getInitiativeRoll(formula) {
    formula = formula || this._getRemeberedFormula();
    this.initiativeFormula = formula;
    const rollData = this.actor?.getRollData() || {};
    return Roll.create(formula, rollData);
  }

  _getRemeberedFormula() {
    if (this.initiativeFormula) return this.initiativeFormula;
    else ui.notifications.error("Initative formula for that combatant was not yet chosen. Please roll initiative from character sheet!");    
  }
}