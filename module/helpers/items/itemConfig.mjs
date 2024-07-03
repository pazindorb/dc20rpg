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