import { kebabCaseToStandard } from "../utils.mjs";

export function updateScalingValues(item, dataset, value, innerKey) {
  const key = dataset.key;
  const index = parseInt(dataset.index);
  const newValue = parseInt(value);

  const currentArray = item.system[innerKey][key].values;
  currentArray[index] = newValue;
  item.update({[`system.${innerKey}.${key}.values`]: currentArray});
}

export function updateResourceValues(item, index, value) {
  index = parseInt(index);
  value = parseInt(value);

  const currentArray = item.system.resource.values;
  currentArray[index] = value;
  item.update({[`system.resource.values`]: currentArray});
}

export function addScalingValue(item, $keyInput) {
  const kebab = /^[a-z\-]+$/;
  const key = $keyInput.val();
  if (!key) {
    const errorMessage = `Cannot create resource. Key must be provided.`;
    ui.notifications.error(errorMessage);
    return;
  }
  if (!kebab.test(key)) {
    const errorMessage = `Cannot create resource with key: ${key}. It must be in kebab-case.`;
    ui.notifications.error(errorMessage);
    return;
  }

  const newScaling = {
    label: kebabCaseToStandard(key),
    values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    isResource: false,
    reset: ""
  };
  item.update({[`system.scaling.${key}`]: newScaling});
}

export function removeScalingValue(item, key) {
  item.update({[`system.scaling.-=${key}`]: null});
}
