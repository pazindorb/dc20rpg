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

export function reloadWeapon(item, actor) {
  const reloadProperty = item.system?.properties?.reload;
  if (reloadProperty && reloadProperty.active) {
    if (!reloadProperty.loaded) {
      if (subtractAP(actor, 1)) {
        item.update({[`system.properties.reload.loaded`]: true});
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
