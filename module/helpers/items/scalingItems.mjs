export function updateScalingValues(item, dataset, value) {
  const key = dataset.key;
  const index = parseInt(dataset.index);
  const newValue = parseInt(value);

  const currentArray = item.system.scaling[key].values;
  currentArray[index] = newValue;
  item.update({[`system.scaling.${key}.values`]: currentArray});
}

export function updateResourceValues(item, index, value) {
  index = parseInt(index);
  value = parseInt(value);

  const currentArray = item.system.resource.values;
  currentArray[index] = value;
  item.update({[`system.resource.values`]: currentArray});
}

export async function overrideScalingValue(item, index, mastery) {
  if (mastery === "martial") {
    const maneuversKnown = item.system.scaling.maneuversKnown.values;
    const bonusStamina = item.system.scaling.bonusStamina.values;
    bonusStamina[index] = 1;
    maneuversKnown[index] = 1;
    await item.update({
      [`system.scaling.bonusStamina.values`]: bonusStamina,
      [`system.scaling.maneuversKnown.values`]: maneuversKnown,
    });
  }
  if (mastery === "spellcaster") {
    const spellsKnown = item.system.scaling.spellsKnown.values;
    const bonusMana = item.system.scaling.bonusMana.values;
    bonusMana[index] = 3;
    spellsKnown[index] = 1;
    await item.update({
      [`system.scaling.bonusMana.values`]: bonusMana,
      [`system.scaling.spellsKnown.values`]: spellsKnown,
    });
  }
}

export async function clearOverridenScalingValue(item, index) {
  const hasPath = [false, true, false, true, false, true, false, true, false, false];
  if (!hasPath[index]) return;

  const maneuversKnown = item.system.scaling.maneuversKnown.values;
  const bonusStamina = item.system.scaling.bonusStamina.values;
  const spellsKnown = item.system.scaling.spellsKnown.values;
  const bonusMana = item.system.scaling.bonusMana.values;
  bonusStamina[index] = 0;
  maneuversKnown[index] = 0;
  bonusMana[index] = 0;
  spellsKnown[index] = 0;
  await item.update({
    [`system.scaling.bonusStamina.values`]: bonusStamina,
    [`system.scaling.maneuversKnown.values`]: maneuversKnown,
    [`system.scaling.bonusMana.values`]: bonusMana,
    [`system.scaling.spellsKnown.values`]: spellsKnown,
  })
}