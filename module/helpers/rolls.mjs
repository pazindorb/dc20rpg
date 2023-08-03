import { removeWhitespaces } from "./utils.mjs";

/**
 * Evaluates given roll formula. If ignoreDices is set to true all dices will be equal to 0
 */
export function evaulateFormula(formula, rollData, ignoreDices) {
  if (formula === "") return 0;

  formula = _enchanceFormula(formula);
  let roll = new Roll(formula, rollData);

  if (ignoreDices) {
    roll.terms.forEach(term => {
      if (term.faces) term.faces = 0;
    });
  }
  
  roll.evaluate({async: false});
  return roll;
}

function _enchanceFormula(formula) {
  formula = removeWhitespaces(formula);
  return formula.replace(/(^|\D)(d\d+)(?!\d|\w)/g, "$11$2");
}