import { changedResourceFilter, minimalAmountFilter, runEventsFor, skipTempHpChangeOnlyFilter } from "./events.mjs";

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