export function updateScalingValues(item, dataset, value, innerKey) {
  const key = dataset.key;
  const index = parseInt(dataset.index);
  const newValue = parseInt(value);

  let currentArray = item.system[innerKey][key].values;
  let updatedArray = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  for (let i = 0; i < currentArray.length; i++) {
    if (i < index) updatedArray[i] = currentArray[i];
    if (i === index) updatedArray[i] = newValue;
    if (i > index) updatedArray[i] = currentArray[i] > newValue ? currentArray[i] : newValue;
  }

  item.update({[`system.${innerKey}.${key}.values`]: updatedArray});
}

