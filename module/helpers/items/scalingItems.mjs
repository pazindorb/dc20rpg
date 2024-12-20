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

export function overrideScalingValue(item, index, mastery) {
  if (!item.system.talentMasteries) return;

  const talentMasteriesPerLevel = item.system.talentMasteries;
  talentMasteriesPerLevel[index] = mastery;
  const numberOfTalents = talentMasteriesPerLevel.filter(elem => elem === mastery).length;
  const overridenScalingValues = _overridenScalingValues(item, mastery, numberOfTalents, index, false);

  const updateData = {
    ...overridenScalingValues,
    [`system.talentMasteries`]: talentMasteriesPerLevel
  };
  item.update(updateData);
}

export async function clearOverridenScalingValue(item, index) {
    const talentMasteriesPerLevel = item.system.talentMasteries;
    const mastery = talentMasteriesPerLevel[index];
    const numberOfTalents = talentMasteriesPerLevel.filter(elem => elem === mastery).length;
    talentMasteriesPerLevel[index] = "";
    const clearedScalingValues = _overridenScalingValues(item, mastery, numberOfTalents, index, true);

    const updateData = {
      ...clearedScalingValues,
      [`system.talentMasteries`]: talentMasteriesPerLevel
    };
    await item.update(updateData);
}

function _overridenScalingValues(item, mastery, talentNumber, index, clearOverriden) {
  let operator = 1;
  if (clearOverriden) operator = -1;

  if (mastery === "martial") {
    item.system.scaling.bonusStamina.values[index] += (operator * 1);
    item.system.scaling.maneuversKnown.values[index] += (operator * 1);
    item.system.scaling.techniquesKnown.values[index] += (operator * 1);

    if (talentNumber % 2 === 0) return {
      [`system.scaling.maneuversKnown.values`]: item.system.scaling.maneuversKnown.values,
    }
    else return {
      [`system.scaling.bonusStamina.values`]: item.system.scaling.bonusStamina.values,
      [`system.scaling.maneuversKnown.values`]: item.system.scaling.maneuversKnown.values,
      [`system.scaling.techniquesKnown.values`]: item.system.scaling.techniquesKnown.values
    }
  }
  if (mastery === "spellcaster") {
    item.system.scaling.bonusMana.values[index] += (operator * 2);
    item.system.scaling.cantripsKnown.values[index] += (operator * 1);
    item.system.scaling.spellsKnown.values[index] += (operator * 1);

    if (talentNumber % 2 === 0) return {
      [`system.scaling.bonusMana.values`]: item.system.scaling.bonusMana.values,
      [`system.scaling.spellsKnown.values`]: item.system.scaling.spellsKnown.values
    }
    else return {
      [`system.scaling.bonusMana.values`]: item.system.scaling.bonusMana.values,
      [`system.scaling.cantripsKnown.values`]: item.system.scaling.cantripsKnown.values,
      [`system.scaling.spellsKnown.values`]: item.system.scaling.spellsKnown.values
    }
  }
}