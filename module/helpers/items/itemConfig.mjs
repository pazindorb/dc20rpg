import { generateKey } from "../utils.mjs"

export function addNewAreaToItem(item) {
  const key = generateKey();
  item.update({[`system.target.areas.${key}`]: {
    area: "",
    distance: null,
    width: null,
    unit: "",
    difficult: "",
    hideHighlight: false
  }});
}

export function removeAreaFromItem(item, key) {
  item.update({[`system.target.areas.-=${key}`]: null});
}

/**
 * This function check if item has toggleable property set to true if so it checks item specific condition
 * ex. linkWithToggle property is set to true. 
 * 
 * If both conditions are met it returns value of toggledOn field.
 * If any is false it will always return true because item does not care about toggle in that case.
 */
export function toggleCheck(item, itemSpecificCondition) {
  if (item.system.toggle?.toggleable && itemSpecificCondition) return item.system.toggle.toggledOn;
  return true;
}