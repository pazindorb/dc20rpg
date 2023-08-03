export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function removeWhitespaces(str) {
  return str.replace(/\s/g, "");
}

/**
 * Checks if all elements in array are true;
 */
export function arrayOfTruth(array) {
  return array.every(element => element === true);
}

/**
 * Returns label for given key found in object containing keys and label pairs. 
 */
export function getLabelFromKey(key, labels) {
  let label = labels[key];
  if (label) return label;
  else return key;
}

/**
 * Returns value under given path for given object.
 * Example path: human.bodyParts.head.nose
 */
export function getValueFromPath(object, pathToValue) {
  for (var i=0, pathToValue=pathToValue.split('.'), length=pathToValue.length; i<length; i++){
    object = object[pathToValue[i]];
  };
  return object;
}

/**
 * Changes boolean property to opposite value.
 */
export function changeActivableProperty(pathToValue, object){
  let value = getValueFromPath(object, pathToValue);
  object.update({[pathToValue] : !value});
}

/**
 * Changes numeric value for given path.
 */
export function changeNumericValue(value, pathToValue, object) {
  let changedValue = parseInt(value);
  if (isNaN(changedValue)) changedValue = 0;
  if (changedValue < 0) changedValue = 0;

  object.update({[pathToValue] : changedValue});
}