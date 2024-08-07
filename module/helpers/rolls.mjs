/**
 * Evaluates given roll formula. 
 * If {@param ignoreDices} is set to true, all dice rolls will be 0.
 */
export function evaluateDicelessFormula(formula, rollData) {
  if (formula === "") return 0;

  formula = _enchanceFormula(formula);
  const roll = new Roll(formula, rollData);
  
  // Remove dices
  roll.terms.forEach(term => {
    if (term.faces) term.faces = 0;
  });
  
  roll.evaluateSync({strict: false});
  return roll;
}

function _enchanceFormula(formula) {
  return formula.replace(/(^|\D)(d\d+)(?!\d|\w)/g, "$11$2");
}