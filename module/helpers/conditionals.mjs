import { getValueFromPath } from "./utils.mjs";

/**
 * Returns ture if useCondition is fulfilled. Multiple conditions are separated by ';'.
 * 
 * Use Condition is built with:
 * - pathToValue - path to value that should be validated
 * - equal sign "="
 * - value - fulfilling condition value either a string or and array of strings
 * 
 * Examples of useConditions:
 * - system.weaponStyle=["axe","sword"];system.weaponType="melee" -> item must be both melee type and axe or sword style
 * - system.name="Endbreaker" -> item must have a name of "Endbreaker"
 */
export function itemMeetsUseConditions(useCondition, item) {
  if (!useCondition) return false;
  const combinations = useCondition.split(';');
  for (const combination of combinations) {
    const pathValue = combination.trim().split('=')
    const value = getValueFromPath(item, pathValue[0])
    const conditionMet = eval(pathValue[1]).includes(value);
    if (!conditionMet) return false;
  };
  return true;
}