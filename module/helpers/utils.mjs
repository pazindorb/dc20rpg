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