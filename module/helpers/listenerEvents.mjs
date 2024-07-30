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