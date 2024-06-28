import { DC20RPG } from "../config.mjs";
import { generateKey, getLabelFromKey } from "../utils.mjs";

export function addFormula(category, item) {
  const formulas = item.system.formulas;

  let key = "";
  do {
    key = generateKey();
  } while (formulas[key]);

  formulas[key] = {
    formula: "",
    type: "",
    category: category,
    versatile: false,
    versatileFormula: "",
    fail: false,
    failFormula: "",
    each5: false,
    each5Formula: "",
  }

  item.update({ ["system.formulas"]: formulas });
}

export function removeFormula(key, item) {
  item.update({ [`system.formulas.-=${key}`]: null });
}

/**
* Returns html used to create fromula shown on item sheet. 
*/
export function getFormulaHtmlForCategory(category, item) {
  const types = { ...DC20RPG.damageTypes, ...DC20RPG.healingTypes }
  let formulas = item.system.formulas;
  let formulaString = "";

  let filteredFormulas = Object.values(formulas)
    .filter(formula => formula.category === category);

  for (let i = 0; i < filteredFormulas.length; i++) {
    let formula = filteredFormulas[i];
    if (formula.formula === "") continue;
    formulaString += formula.formula;
    if (formula.versatile) formulaString += "(" + formula.versatileFormula + ")";
    formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
    formulaString += " + ";
  }

  if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
  return formulaString;
}