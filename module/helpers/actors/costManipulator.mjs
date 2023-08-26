import { arrayOfTruth } from "../utils.mjs";

//============================================
//        Action Points Manipulations        =
//============================================
export function subtractAP(actor, amount) {
  if (_canSubtractBasicResource("ap", actor, amount)) {
    _subtractBasicResource("ap", actor, amount);
  }
}

export function refreshAllActionPoints(actor) {
  let max = actor.system.resources.ap.max;
  actor.update({["system.resources.ap.current"] : max});
}

//===========================================
//        Item Charges Manipulations        =
//===========================================
export function changeCurrentCharges(value, item) {
  let changedValue = parseInt(value);
  let maxCharges = parseInt(item.system.costs.charges.max);
  if (isNaN(changedValue)) changedValue = 0;
  if (changedValue < 0) changedValue = 0;
  if (changedValue > maxCharges) changedValue = maxCharges;
  item.update({["system.costs.charges.current"] : changedValue});
}

//=============================================
//        Item Usage Costs Subtraction        =
//=============================================
/**
 * Checks if all resources used by item are available for actor. 
 * If so subtracts those from actor current resources.
 */
export function respectUsageCost(actor, item) {
  if (!item.system.costs) return true;

  if(_canSubtractAllResources(actor, item) && _canSubtractFromOtherItem(actor, item)) {
    _subtractAllResources(actor, item);
    _subtractFromOtherItem(actor, item);
    return true;
  }
  return false;
}

function _canSubtractAllResources(actor, item) {
  const itemResources = item.system.costs.resources;

  let canSubtractAllResources = [
    _canSubtractBasicResource("ap", actor, itemResources.actionPoint),
    _canSubtractBasicResource("stamina", actor, itemResources.stamina),
    _canSubtractBasicResource("mana", actor, itemResources.mana),
    _canSubtractBasicResource("health", actor, itemResources.health),
    _canSubtractCharge(item, 1),
    _canSubtractQuantity(item, 1),
  ];
  return arrayOfTruth(canSubtractAllResources);
}

function _subtractAllResources(actor, item) {
  const itemCosts = item.system.costs.resources;

  const oldResources = actor.system.resources
  let newResources = {...oldResources};
  newResources = _prepareBasicResourceToSubtraction("ap", itemCosts.actionPoint, newResources, actor);
  newResources = _prepareBasicResourceToSubtraction("stamina", itemCosts.stamina, newResources, actor);
  newResources = _prepareBasicResourceToSubtraction("mana", itemCosts.mana, newResources, actor);
  newResources = _prepareBasicResourceToSubtraction("health", itemCosts.health, newResources, actor);
  _subtractBasicResources(actor, newResources);
  _subtractCharge(item, 1);
  _subtractQuantity(item, 1);
}

function _canSubtractFromOtherItem(actor, item) {
  const otherItemUsage = item.system.costs.otherItem;
  if (!otherItemUsage.itemId) return true;

  const otherItem = actor.items.get(otherItemUsage.itemId);
  if (!otherItem) {
    let errorMessage = `Item used by ${item.name} doesn't exist.`;
    ui.notifications.error(errorMessage);
    return false;
  }

  return otherItemUsage.consumeCharge 
    ? _canSubtractCharge(otherItem, otherItemUsage.amountConsumed) 
    : _canSubtractQuantity(otherItem, otherItemUsage.amountConsumed);
}

function _subtractFromOtherItem(actor, item) {
  const otherItemUsage = item.system.costs.otherItem;
  if (otherItemUsage.itemId) {
    const otherItem = actor.items.get(otherItemUsage.itemId);
    otherItemUsage.consumeCharge 
     ? _subtractCharge(otherItem, otherItemUsage.amountConsumed) 
     : _subtractQuantity(otherItem, otherItemUsage.amountConsumed);
  }
}

function _canSubtractBasicResource(key, actor, amount) {
  if (amount <= 0) return true;

  let current = actor.system.resources[key].current;
  let newAmount = current - amount;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${amount} ${key} from ${actor.name}. Not enough ${key} (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  
  return true;
}

function _subtractBasicResource(key, actor, amount) {
  if (amount <= 0) return;

  let current = actor.system.resources[key].current;
  let newAmount = current - amount;

  actor.update({[`system.resources.${key}.current`] : newAmount});
}

function _subtractBasicResources(actor, newResources) {
  actor.update({['system.resources'] : newResources});
}

function _prepareBasicResourceToSubtraction(key, cost, newResources, actor) {
  if (cost <= 0) return newResources;

  let current = actor.system.resources[key].current;
  const newAmount = current - cost;

  newResources[key].current = newAmount;
  return newResources;
}

function _canSubtractCharge(item, subtractedAmount) {
  let max = item.system.costs.charges.max;
  if (!max) return true;

  let current = item.system.costs.charges.current;
  let newAmount = current - subtractedAmount;

  if (newAmount < 0) {
    let errorMessage = `Cannot use ${item.name}. No more charges.`;
    ui.notifications.error(errorMessage);
    return false;
  }
  return true;
}

function _subtractCharge(item, subtractedAmount) {
  let max = item.system.costs.charges.max;
  if (!max) return;

  let current = item.system.costs.charges.current;
  let newAmount = current - subtractedAmount;

  item.update({["system.costs.charges.current"] : newAmount});
}

function _canSubtractQuantity(item, subtractedAmount) {
  if (item.type !== "consumable") return true; // It is not consumable
  if (!item.system.consume) return true; // It doesn't consume item on use

  let current = item.system.quantity;
  let newAmount = current - subtractedAmount;

  if (current <= 0) {
    let errorMessage = `Cannot use ${item.name}. No more items.`;
    ui.notifications.error(errorMessage);
    return false;
  }

  if (newAmount < 0) {
    let errorMessage = `Cannot use ${item.name}. No enough items.`;
    ui.notifications.error(errorMessage);
    return false;
  }

  return true;
}

function _subtractQuantity(item, subtractedAmount) {
  if (item.type !== "consumable") return;
  if (!item.system.consume) return;

  let deleteOnZero = item.system.deleteOnZero;
  let current = item.system.quantity;
  let newAmount = current - subtractedAmount;

  if (newAmount === 0 && deleteOnZero) {
    item.delete();
  } 
  else {
    item.update({["system.quantity"] : newAmount});
  }
}