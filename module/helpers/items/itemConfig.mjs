import { subtractAP } from "../actors/costManipulator.mjs";
import { generateKey } from "../utils.mjs"

export function addNewAreaToItem(item) {
  const key = generateKey();
  item.update({[`system.target.areas.${key}`]: {
    area: "",
    distance: null,
    width: null,
    unit: ""
  }});
}

export function removeAreaFromItem(item, key) {
  item.update({[`system.target.areas.-=${key}`]: null});
}

export function runWeaponLoadedCheck(item) {
  const reloadProperty = item.system?.properties?.reload;
  if (reloadProperty && reloadProperty.active) {
    if (reloadProperty.loaded) return true;
    else {
      let errorMessage = `You need to reload that weapon first!`;
      ui.notifications.error(errorMessage);
      return false;
    }
  }
  return true;
}

export async function reloadWeapon(item, actor) {
  const reloadProperty = item.system?.properties?.reload;
  if (reloadProperty && reloadProperty.active) {
    if (!reloadProperty.loaded) {
      if (subtractAP(actor, 1)) {
        await item.update({[`system.properties.reload.loaded`]: true});
      }
    }
  }
}

export function unloadWeapon(item, actor) {
  const usesWeapon = item.system?.usesWeapon;
  if (usesWeapon && usesWeapon.weaponAttack) {
    const weapon = actor.items.get(usesWeapon.weaponId);
    if (weapon) weapon.update({[`system.properties.reload.loaded`]: false});
  }
  else {
    item.update({[`system.properties.reload.loaded`]: false});
  }
}

/**
 * This functions check if item has toggleable property set to true if so it checks item specific condition
 * ex. linkWithToggle property is set to true. 
 * 
 * If both conditions are met it returns value of toggledOn field.
 * If any is false it will always return true because item does not care about toggle in that case.
 */
export function toggleCheck(item, itemSpecificCondition) {
  if (item.system.toggle?.toggleable && itemSpecificCondition) return item.system.toggle.toggledOn;
  return true;
}