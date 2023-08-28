import { arrayOfTruth } from "../utils.mjs";

//============================================
//              Item Usage Costs             =
//============================================
/**
 * Return item costs data formatted to be used in html files.
 */
export function getItemUsageCosts(item, actor) {
  if (!item.system.costs) return {};
  const usageCosts = {};
  usageCosts.resources = _getItemResources(item, actor);
  usageCosts.otherItem = _getOtherItem(item, actor);
  return usageCosts;
}

function _getItemResources(item, actor) {
  const resourcesCosts = item.system.costs.resources;

  let counter = 0;
  let costs = {
    actionPoint: {cost: resourcesCosts.actionPoint},
    stamina: {cost: resourcesCosts.stamina},
    mana: {cost: resourcesCosts.mana},
    health: {cost: resourcesCosts.health},
    custom: {}
  };
  counter += resourcesCosts.actionPoint ? resourcesCosts.actionPoint : 0;
  counter += resourcesCosts.stamina ? resourcesCosts.stamina : 0;
  counter += resourcesCosts.mana ? resourcesCosts.mana : 0;
  counter += resourcesCosts.health ? resourcesCosts.health : 0;

  if (actor) {
    const customResources = actor.system.resources.custom;

    Object.entries(resourcesCosts.custom).forEach(([key, customCost]) => {
      if (customResources[key]) {
        counter += customCost ? customCost : 0;
  
        const imgSrc = customResources[key].img;
        const name = customResources[key].name;
  
        costs.custom[key] = {
          imgSrc: imgSrc,
          name: name,
          cost: customCost
        }
      }
    });
  }

  return {
    counter: counter,
    costs: costs
  };
}

function _getOtherItem(item, actor) {
  const otherItem = item.system.costs.otherItem;
  if(!actor) return {};

  const usedItem = actor.items.get(otherItem.itemId);
  if (!usedItem) return {};

  return {
    amount: otherItem.amountConsumed,
    consumeCharge: otherItem.consumeCharge,
    name: usedItem.name,
    image: usedItem.img,
  }
}

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
  const itemCosts = item.system.costs.resources;

  let canSubtractAllResources = [
    _canSubtractBasicResource("ap", actor, itemCosts.actionPoint),
    _canSubtractBasicResource("stamina", actor, itemCosts.stamina),
    _canSubtractBasicResource("mana", actor, itemCosts.mana),
    _canSubtractBasicResource("health", actor, itemCosts.health),
    _canSubtractCustomResources(actor, itemCosts.custom),
    _canSubtractCharge(item, 1),
    _canSubtractQuantity(item, 1),
  ];
  return arrayOfTruth(canSubtractAllResources);
}

function _subtractAllResources(actor, item) {
  const itemCosts = item.system.costs.resources;

  const oldResources = actor.system.resources
  let newResources = {...oldResources};
  newResources = _prepareBasicResourceToSubtraction("ap", itemCosts.actionPoint, newResources);
  newResources = _prepareBasicResourceToSubtraction("stamina", itemCosts.stamina, newResources);
  newResources = _prepareBasicResourceToSubtraction("mana", itemCosts.mana, newResources);
  newResources = _prepareBasicResourceToSubtraction("health", itemCosts.health, newResources);
  newResources = _prepareCustomResourcesToSubtraction(itemCosts.custom, newResources);
  _subtractActorResources(actor, newResources);
  _subtractCharge(item, 1);
  _subtractQuantity(item, 1);
}

function _subtractActorResources(actor, newResources) {
  actor.update({['system.resources'] : newResources});
}

//================================
//        Basic Resources        =
//================================
function _canSubtractBasicResource(key, actor, cost) {
  if (cost <= 0) return true;

  const current = actor.system.resources[key].current;
  const newAmount = current - cost;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${cost} ${key} from ${actor.name}. Not enough ${key} (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  
  return true;
}

function _subtractBasicResource(key, actor, cost) {
  if (cost <= 0) return;

  const current = actor.system.resources[key].current;
  const newAmount = current - cost;

  actor.update({[`system.resources.${key}.current`] : newAmount});
}

function _prepareBasicResourceToSubtraction(key, cost, newResources) {
  if (cost <= 0) return newResources;

  const current = newResources[key].current;
  const newAmount = current - cost;

  newResources[key].current = newAmount;
  return newResources;
}

//=================================
//        Custom Resources        =
//=================================
function _canSubtractCustomResources(actor, customCosts) {
  const customResources = actor.system.resources.custom;

  for (const [key, cost] of Object.entries(customCosts)) {
    if (!customResources[key]) continue;
    if (cost <= 0) continue;

    const current = customResources[key].current;
    const newAmount = current - cost;
  
    if (newAmount < 0) {
      let errorMessage = `Cannot subract ${cost} charges of custom resource with key '${key}' from ${actor.name}. Current amount: ${current}.`;
      ui.notifications.error(errorMessage);
      return false;
    }
  }

  return true;
}

function _prepareCustomResourcesToSubtraction(customCosts, newResources) {
  const customResources = newResources.custom;

  for (const [key, cost] of Object.entries(customCosts)) {
    if (!customResources[key]) continue;
    if (cost <= 0) continue;

    const current = customResources[key].current;
    const newAmount = current - cost;

    newResources.custom[key].current = newAmount;
  }

  return newResources;
}

//===============================
//        Item Resources        =
//===============================
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