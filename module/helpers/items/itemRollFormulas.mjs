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
  const types = { ...CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes, ...CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes }
  let formulas = item.system.formulas;
  let formulaString = "";

  let filteredFormulas = Object.values(formulas)
    .filter(formula => formula.category === category);

  for (let i = 0; i < filteredFormulas.length; i++) {
    let formula = filteredFormulas[i];
    if (formula.formula === "") continue;
    formulaString += formula.formula;
    formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
    formulaString += " + ";
  }

  if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
  return formulaString;
}

/**
 * Returns all item formulas, including active enhancements and used weapon
 */
export function collectAllFormulasForAnItem(item, enhancements) {
  // Item formulas
  let formulas = item.system.formulas;

  // If item is a using weapon as part of an attack we collect those formulas
  const actor = item.actor;
  const useWeapon = item.system.usesWeapon
  if (actor && useWeapon?.weaponAttack) {
    const weaponId = useWeapon.weaponId;
    const weapon = actor.items.get(weaponId);
    if (weapon) {
      const weaponFormulas = weapon.system.formulas;
      formulas = {...formulas, ...weaponFormulas}
    }
  }
  
  // Some enhancements can provide additional formula
  if (!enhancements) enhancements = item.allEnhancements;
  if (enhancements) {
    let fromEnhancements = {};
    enhancements.values().forEach(enh => {
      for (let i = 0; i < enh.number; i++) {
        const enhMod = enh.modifications;
        // Add formula from enhancement;
        if (enhMod.addsNewFormula) {
          let key = "";
          do {
            key = generateKey();
          } while (formulas[key]);
          fromEnhancements[key] = enhMod.formula;
        }
      }

    })
    formulas = {...formulas, ...fromEnhancements};
  }

  return formulas;
}