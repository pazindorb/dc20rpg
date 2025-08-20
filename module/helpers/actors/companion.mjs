import { getValueFromPath } from "../utils.mjs";

// TODO: Remove in favor of actor.companionShareCheck
export function companionShare(actor, keyToCheck) {
  if (!actor) return false;
  if (actor.type !== "companion") return false;
  if (!actor.companionOwner) return false;
  return getValueFromPath(actor, `system.shareWithCompanionOwner.${keyToCheck}`);
}