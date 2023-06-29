export function subtractAP(actor, amount) {
  let current = actor.system.resources.ap.value;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} action points. Not enough AP (Current amount: ${current}).`;
    ui.notifications.error(errorMessage)
    return false;
  }

  actor.update({["system.resources.ap.value"] : newAmount});
  return true;
}

export function refreshAllPoints(actor) {
  let max = actor.system.resources.ap.max;
  actor.update({["system.resources.ap.value"] : max});
}