// Action Points manipulations
export function canSubtractAP(actor, amount) {
  if (amount <= 0) return true;

  let current = actor.system.resources.ap.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} action points from ${actor.name}. Not enough AP (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractAP(actor, amount) {
  if (amount <= 0) return;

  let current = actor.system.resources.ap.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} action points from ${actor.name}. Not enough AP (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
  } else {
    actor.update({["system.resources.ap.current"] : newAmount});
  }
}

export function refreshAllActionPoints(actor) {
  let max = actor.system.resources.ap.max;
  actor.update({["system.resources.ap.current"] : max});
}

// Stamina Points manipulations
export function canSubtractStamina(actor, amount) {
  if (amount <= 0) return true;

  let current = actor.system.resources.stamina.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} stamina from ${actor.name}. Not enough stamina (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractStamina(actor, amount) {
  if (amount <= 0) return;

  let current = actor.system.resources.stamina.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} stamina from ${actor.name}. Not enough stamina (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
  } else {
    actor.update({["system.resources.stamina.current"] : newAmount});
  }
  
}

// Mana Points manipulations
export function canSubtractMana(actor, amount) {
  if (amount <= 0) return true;

  let current = actor.system.resources.mana.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} mana from ${actor.name}. Not enough mana (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractMana(actor, amount) {
  if (amount <= 0) return;

  let current = actor.system.resources.mana.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} mana from ${actor.name}. Not enough mana (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
  } else {
    actor.update({["system.resources.mana.current"] : newAmount});
  }
}

// Health Points manipulations
export function canSubtractHP(actor, amount) {
  if (amount <= 0) return true;

  let current = actor.system.resources.health.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} health from ${actor.name}. Not enough health (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractHP(actor, amount) {
  if (amount <= 0) return;

  let current = actor.system.resources.health.current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} health from ${actor.name}. Not enough health (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
  } else {
    actor.update({["system.resources.health.current"] : newAmount});
  }
}

// Item charges manipulator 
export function canSubtractCharge(item) {
  let max = item.system.charges.max;
  if (!max) return true;

  let current = item.system.charges.current;
  let newAmount = current - 1;

  if (newAmount < 0) {
    let errorMessage = `Cannot use ${item.name}. No more charges.`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractCharge(item) {
  let max = item.system.charges.max;
  if (!max) return;

  let current = item.system.charges.current;
  let newAmount = current - 1;

  if (newAmount < 0) {
    let errorMessage = `Cannot use ${item.name}. No more charges.`;
    ui.notifications.error(errorMessage);
  } else {
    item.update({["system.charges.current"] : newAmount});
  }
}

export function changeCurrentCharges(event, item) {
  event.preventDefault();
  let changedValue = parseInt(event.currentTarget.value);
  let maxCharges = parseInt(item.system.charges.max);
  if (isNaN(changedValue)) changedValue = 0;
  if (changedValue < 0) changedValue = 0;
  if (changedValue > maxCharges) changedValue = maxCharges;
  item.update({["system.charges.current"] : changedValue});
}

// Item quantity manipulator(item)
export function canSubtractQuantity(item) {
  if (item.type !== "consumable") return true; // It is not consumable
  if (!item.system.consume) return true; // It doesn't consume item on use

  if (item.system.quantity <= 0) {
    let errorMessage = `Cannot use ${item.name}. No more items.`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

export function subtractQuantity(item) {
  if (item.type !== "consumable") return;
  if (!item.system.consume) return;

  let currentQuantity = item.system.quantity;
  let newQuantity = currentQuantity -1;

  if (currentQuantity <= 0) {
    let errorMessage = `Cannot use ${item.name}. No more items.`;
    ui.notifications.error(errorMessage);
  } 
  else if (newQuantity === 0) {
    item.delete();
  } 
  else {
    item.update({["system.quantity"] : newQuantity});
  }
}