export function prepareRollData(item, data) {
  let rollData = {
    ...data,
    rollBonus: data.attackFormula?.rollBonus
  }

    // If present, add the actor's roll data.
  const actor = item.actor;
  if (actor) rollData = {...rollData, ...actor.getRollData()};
  return rollData;
}