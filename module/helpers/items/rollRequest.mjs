import { DC20RPG } from "../config.mjs";
import { generateKey, getLabelFromKey } from "../utils.mjs";

export function addRollRequest(item) {
  const rollRequests = item.system.rollRequests;
  const request = {
    category: category || "save",
    saveKey: "",
    contestedKey: "",
    dcCalculation: "spell",
    dc: 0,
    addMasteryToDC: true,
    respectSizeRules: false,
  }

  let key = "";
  do {
    key = generateKey();
  } while (rollRequests[key]);
  item.update({[`system.rollRequests.${key}`]: request});
}

export function removeRollRequest(item, key) {
  item.update({ [`system.rollRequests.-=${key}`]: null });
}

export function getRollRequestHtmlForCategory(category, item) {
  const rollRequests = item.system.rollRequests;
  if (!rollRequests) return "";

  const filtered = Object.values(rollRequests).filter(request => request.category === category);

  let rollRequestString = "";
  for (let i = 0; i < filtered.length; i++) {
    if (category === "save") rollRequestString += " <em>" + getLabelFromKey(filtered[i].saveKey, DC20RPG.saveTypes) + " Save </em>";
    if (category === "contest") rollRequestString += " <em> " + getLabelFromKey(filtered[i].contestedKey, DC20RPG.contests) + "</em>";
    rollRequestString += " or ";
  }

  if (rollRequestString !== "") rollRequestString = rollRequestString.substring(0, rollRequestString.length - 4);
  return rollRequestString;
}