import { generateKey } from "../utils.mjs";

export function addAgainstStatus(item) {
  const againstStatuses = item.system.againstStatuses;
  const against = {
    id: "",
    supressFromChatMessage: false,
    untilYourNextTurnStart: false,
    untilYourNextTurnEnd: false,
    untilTargetNextTurnStart: false,
    untilTargetNextTurnEnd: false,
    untilFirstTimeTriggered: false
  }

  let key = "";
  do {
    key = generateKey();
  } while (againstStatuses[key]);
  item.update({[`system.againstStatuses.${key}`]: against});
}

export function removeAgainstStatus(item, key) {
  item.update({ [`system.againstStatuses.-=${key}`]: null });
}