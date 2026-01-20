import { changedResourceFilter, minimalAmountFilter, runEventsFor, skipTempHpChangeOnlyFilter } from "./events.mjs";

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

// TODO: Move to events.mjs?
export async function runResourceChangeEvent(key, after, before, actor, custom) {
  if (!before) return;
  if (after.value === undefined) return;
  
  const changeValue = after.value - before.value;
  if (changeValue === 0) return;
  const operation = changeValue > 0 ? "addition" : "subtraction";
  const fields = {resourceKey: key, change: changeValue, customResource: custom, preventChange: false}
  await runEventsFor("resourceChange", actor, changedResourceFilter(key, operation), fields)
  return fields.preventChange;
}

export async function runHealthChangeEvent(after, before, messageId, actor, skipEventCall) {
  const hpChange =after.value - before.value;
  const amount = Math.abs(hpChange);

  const fields = {amount: amount, messageId: messageId, preventChange: false}
  if (hpChange < 0 && !skipEventCall) {
    await runEventsFor("damageTaken", actor, minimalAmountFilter(amount), fields); 
  }
  if (hpChange > 0 && !skipEventCall) {
    const tempHpChangeOnly = (hpChange === after.temp) || (after.temp > 0 && !after.current);
    fields.tempHpChangeOnly = tempHpChangeOnly;
    await runEventsFor("healingTaken", actor, [...minimalAmountFilter(amount), ...skipTempHpChangeOnlyFilter(tempHpChangeOnly)], fields);
  }
  return fields.preventChange ? 0 : hpChange;
}