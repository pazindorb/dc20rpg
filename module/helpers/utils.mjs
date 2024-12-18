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
  if (!labels) return key;
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
    if (object === undefined || object === null) return;
    object = object[pathToValue[i]];
    if (object === undefined) return;
  };
  return object;
}

export function setValueForPath(object, path, value) {
  const keys = path.split('.');
  let currentObject = object;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // If the key doesn't exist in the current object, create an empty object
    currentObject[key] = currentObject[key] || {};
    currentObject = currentObject[key];
  }

  // Set the value at the final key
  currentObject[keys[keys.length - 1]] = value;
}

export async function toggleUpOrDown(pathToValue, which, object, upperLimit, lowerLimit) {
  let value = getValueFromPath(object, pathToValue);

  switch (which) {
    case 1: 
      value = Math.min(++value, upperLimit);
      break;
    case 3: 
      value = Math.max(--value, lowerLimit);
      break;
  }
  await object.update({[pathToValue] : value});
}

/**
 * Changes boolean property to opposite value.
 */
export async function changeActivableProperty(pathToValue, object){
  let value = getValueFromPath(object, pathToValue);
  if (value === undefined) value = false;
  await object.update({[pathToValue] : !value});
}

/**
 * Changes numeric value for given path.
 */
export function changeNumericValue(value, pathToValue, object) {
  let changedValue = parseInt(value);
  if (isNaN(changedValue)) changedValue = 0;
  // if (changedValue < 0) changedValue = 0;

  object.update({[pathToValue] : changedValue});
}

/**
 * Changes value for given path.
 */
export function changeValue(value, pathToValue, object) {
  object.update({[pathToValue] : value});
}

export function kebabCaseToStandard(inputString) {
  return inputString
    .split('-') 
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) 
    .join(' '); 
}

export function generateKey() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;

  let result = '';
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function hasKeys(object) {
  return Object.keys(object).length !== 0;
}

export function markedToRemove(key) {
  return key.startsWith("-=");
}

export function parseFromString(string) {
  if (string === "true") return true;
  if (string === "false") return false;
  if (Number(string) !== NaN) return Number(string);
  return string;
}

export function translateLabels(object) {
  for (const key in object) {
    if (object.hasOwnProperty(key)) {
      const value = object[key];
      
      if (key === "label") object[key] = game.i18n.localize(object.label) ?? object.label;
      if (typeof value === "object" && value !== null) translateLabels(value);
    }
  }
}