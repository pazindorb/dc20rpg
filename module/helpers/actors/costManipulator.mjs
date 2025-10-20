import { changedResourceFilter, runEventsFor } from "./events.mjs";

//============================================
//          Resources Manipulations          =
//============================================
/** @deprecated since v0.9.8 until 0.10.0 */
export function subtractAP(actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractAP' method is deprecated, and will be removed in the later system version. Use 'actor.resources.ap.checkAndSpend' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  if (typeof amount !== 'number') return true;
  return actor.resources.ap.checkAndSpend(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function subtractBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].spend' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  await actor.resources[key].spend(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function regainBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.regainBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].regain' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  await actor.resources[key].regain(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function subtractCustomResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].spend' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  await actor.resources[key].spend(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export async function regainCustomResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.regainCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].regain' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  await actor.resources[key].regain(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export function canSubtractBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.canSubtractBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].canSpend' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return actor.resources[key].canSpend(amount);
}

/** @deprecated since v0.9.8 until 0.10.0 */
export function canSubtractCustomResource(key, actor, cost) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.canSubtractCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].canSpend' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
  return actor.resources[key].canSpend(cost);
}

export async function runResourceChangeEvent(key, resource, before, actor, custom) {
  if (!before) return;
  if (resource.value === undefined) return;
  
  const changeValue = resource.value - before.value;
  if (changeValue === 0) return;
  const operation = changeValue > 0 ? "addition" : "subtraction";
  await runEventsFor("resourceChange", actor, changedResourceFilter(key, operation), {resourceKey: key, change: changeValue, customResource: custom})
}