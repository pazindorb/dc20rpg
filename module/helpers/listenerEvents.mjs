import { getValueFromPath, setValueForPath } from "./utils.mjs";

/**
 * Returns dataset extracted from event's currentTarget.
 * Also calls preventDefault method on event.
 */
export function datasetOf(event) {
  event.preventDefault();
  return event.currentTarget.dataset;
}

/**
 * Returns value of event's currentTarget.
 * Also calls preventDefault method on event.
 */
export function valueOf(event) {
  event.preventDefault();
  return event.currentTarget.value;
}

export function activateDefaultListeners(app, html) {
  const _onActivable = (path) => {
    const value = getValueFromPath(app, path);
    setValueForPath(app, path, !value);
    app.render(true);
  }
  const _onValueChange = (path, value) => {
    setValueForPath(app, path, value);
    app.render(true);
  }
  const _onNumericValueChange = (path, value) => {
    const numericValue = parseInt(value);
    setValueForPath(app, path, numericValue);
    app.render(true);
  }

  html.find('.activable').click(ev => _onActivable(datasetOf(ev).path));
  html.find(".selectable").change(ev => _onValueChange(datasetOf(ev).path, valueOf(ev)));
  html.find(".input").change(ev => _onValueChange(datasetOf(ev).path, valueOf(ev)));
  html.find(".numeric-input").change(ev => _onNumericValueChange(datasetOf(ev).path, valueOf(ev)));
}

export function addToMultiSelect(object, path, key, value) {
  if (!key) return;
  object.update({[`${path}.${key}`]: value});
}

export function removeMultiSelect(object, path, key) {
  object.update({[`${path}.-=${key}`]: null});
}