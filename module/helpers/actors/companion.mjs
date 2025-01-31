import { getValueFromPath } from "../utils.mjs";

export function companionShare(actor, keyToCheck) {
  if (actor.type !== "companion") return false;
  if (!actor.companionOwner) return false;
  return getValueFromPath(actor, `system.shareWithCompanionOwner.${keyToCheck}`);
}