import { getValueFromPath } from "./utils.mjs";

/**
 * Returns ture if useCondition is fulfilled.
 * 
 * '&&' - AND
 * '||' - OR
 * 
 * Use Condition is built with:
 * - pathToValue - path to value that should be validated
 * - equal sign "="
 * - value - fulfilling condition value either a string or and array of strings
 * 
 * Examples of useConditions:
 * - system.weaponStyle=["axe","sword"];system.weaponType="melee" -> item must be both melee type and axe or sword style
 * - system.name="Endbreaker" -> item must have a name of "Endbreaker"
 * - system.weaponStyle=["axe","sword"];system.weaponType="melee"|system.weaponStyle=["bow"];system.weaponType="ranged" -> item must be either (both melee type and axe or sword style) OR (ranged type and bow)
 */
export function itemMeetsUseConditions(useCondition, item) {
  if (!useCondition) return false;
  if (useCondition === "true") return true;
  const OR = useCondition.split('||');
  for (const orConditions of OR) {
    const AND = orConditions.split('&&');
    if(_checkAND(AND, item)) return true;
  }
  return false;
}

function _checkAND(combinations, item) {
  for (const combination of combinations) {
    const pathValue = combination.trim().split('=')
    const value = getValueFromPath(item, pathValue[0]);
    if (value === undefined || value === "") return false;
    const conditionMet = eval(pathValue[1]).includes(value);
    if (!conditionMet) return false;
  };
  return true;
}