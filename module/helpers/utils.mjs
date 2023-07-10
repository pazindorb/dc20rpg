/**
 * Returns value under given path for given object.
 * Example path: human.bodyParts.head.subpart.nose
 */
export function getValueFromPath(object, pathToValue) {
  for (var i=0, pathToValue=pathToValue.split('.'), length=pathToValue.length; i<length; i++){
    object = object[pathToValue[i]];
  };
  return object;
}

export function numberToSignedSting(number) {
  let formattedNumber;
  if (number >= 0) {
    formattedNumber = "+ " + number;
  } else {
    formattedNumber = "- " + Math.abs(number);
  }
  return formattedNumber;
}

export function getLabelFromKey(key, objectWithLabels) {
  let label = objectWithLabels[key];
  if (label) return label;
  else return key;
}

/**
 * Changes boolean property to opposite value.
 */
export function changeActivableProperty(event, object){
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const pathToValue = dataset.path;
  let value = getValueFromPath(object, pathToValue);

  object.update({[pathToValue] : !value});
}

/**
 * Changes value for given path.
 */
export function changeNumericValue(event, object) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const pathToValue = dataset.path;
  let changedValue = parseInt(event.currentTarget.value);
  if (isNaN(changedValue)) changedValue = 0;
  if (changedValue < 0) changedValue = 0;

  object.update({[pathToValue] : changedValue});
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function removeWhitespaces(str) {
  return str.replace(/\s/g, "");
}

export function enchanceFormula(formula) {
  formula = removeWhitespaces(formula);
  return formula.replace(/(^|\D)(d\d+)(?!\d|\w)/g, "$11$2");
}

/**
 * Checks if all elements in array are true;
 */
export function arrayOfTruth(array) {
  return array.every(element => element === true);
}

/**
 * Evaluates given roll formula. If ignoreDices is set to true all dices will be equal to 0
 */
export function evaulateFormula(formula, rollData, ignoreDices) {
  if (formula === "") return 0;

  formula = enchanceFormula(formula);
  let roll = new Roll(formula, rollData);

  if (ignoreDices) {
    roll.terms.forEach(term => {
      if (term.faces) term.faces = 0;
    });
  }
  
  roll.evaluate({async: false});
  return roll.total;
}

export function sortMapOfItems(mapOfItems) {  
  const sortedEntries = [...mapOfItems.entries()].sort(([, a], [, b]) => a.sort - b.sort);

  if (!sortedEntries) return mapOfItems; // No entries, map is empty

  sortedEntries.forEach(entry => mapOfItems.delete(entry[0])); // we want to remove all original entries because those are not sorted
  sortedEntries.forEach(entry => mapOfItems.set(entry[0], entry[1])); // we put sorted entries to map
  return mapOfItems;
}