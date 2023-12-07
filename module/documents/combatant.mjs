export class DC20RpgCombatant extends Combatant {

  constructor(data, combat) {
    super(data, combat);
    this.canRollInitiative = this.actor.type === "character";
  }

  /** @override **/
  getInitiativeRoll(formula) {
    formula = formula || this._getRemeberedFormula();
    this.initiativeFormula = formula;
    const rollData = this.actor?.getRollData() || {};
    if (formula) return Roll.create(formula, rollData);
    else return;
  }

  _getRemeberedFormula() {
    if (this.initiativeFormula) return this.initiativeFormula;
    else ui.notifications.error("Initative formula for that combatant was not yet chosen. Please roll initiative from character sheet!");    
  }
}