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
  return str.charAt(0).toUpperCase() + str.slice(1);
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