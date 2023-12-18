import { DC20RPG } from "../config.mjs";
import { getLabelFromKey } from "../utils.mjs";

export function addFormula(category, item) {
  let formulas = item.system.formulas;
  let sortedKeys = Object.keys(formulas).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  let nextKey;
  if (sortedKeys.length === 0) {
    nextKey = 0;
  } else {
    let lastKey = sortedKeys[sortedKeys.length - 1];
    nextKey = parseInt(lastKey) + 1;
  }

  formulas[nextKey] = {
    formula: "",
    type: "",
    category: category,
    versatile: false,
    versatileFormula: "",
    fail: false,
    failFormula: "",
    each5: false,
    each5Formula: "",
    applyCrits: true,
  }

  item.update({ ["system.formulas"]: formulas });
}

export function removeFormula(key, item) {
  item.update({ [`system.formulas.-=${key}`]: null });
}

/**
* Returns html used to create fromula shown in item sheet. 
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



