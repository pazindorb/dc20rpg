import { runWeaponLoadedCheck, unloadWeapon } from "../items/itemConfig.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { arrayOfTruth } from "../utils.mjs";
import { companionShare } from "./companion.mjs";

//============================================
//              Item Usage Costs             =
//============================================
/**
 * Return item costs data formatted to be used in html files.
 */
export function getItemUsageCosts(item, actor) {
  if (!item.system.costs) return {};
  const usageCosts = {};
  usageCosts.resources = _getItemResources(item);
  usageCosts.otherItem = _getOtherItem(item, actor);
  return usageCosts;
}

function _getItemResources(item) {
  const resourcesCosts = item.system.costs.resources;

  let counter = 0;
  let costs = {
    actionPoint: {cost: resourcesCosts.actionPoint},
    stamina: {cost: resourcesCosts.stamina},
    mana: {cost: resourcesCosts.mana},
    health: {cost: resourcesCosts.health},
    grit: {cost: resourcesCosts.grit},
    restPoints: {cost: resourcesCosts.restPoints},
    custom: {}
  };
  counter += resourcesCosts.actionPoint || 0;
  counter += resourcesCosts.stamina || 0;
  counter += resourcesCosts.mana || 0;
  counter += resourcesCosts.health || 0;
  counter += resourcesCosts.restPoints || 0;

  Object.entries(resourcesCosts.custom).forEach(([key, customCost]) => {
    counter += customCost.value || 0;
    costs.custom[key] = {
      img: customCost.img,
      name: customCost.name,
      value: customCost.value
    }
  });

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
//          Resources Manipulations          =
//============================================
export function subtractAP(actor, amount) {
  if (typeof amount !== 'number') return true;
  if (canSubtractBasicResource("ap", actor, amount)) {
    subtractBasicResource("ap", actor, amount);
    return true;
  }
  return false;
}

export function refreshAllActionPoints(actor) {
  actor = _checkIfShouldSubtractFromCompanionOwner(actor, "ap");
  const max = actor.system.resources.ap.max;
  actor.update({["system.resources.ap.value"] : max});
}

export async function subtractBasicResource(key, actor, amount, boundary) {
  amount = parseInt(amount);
  if (amount <= 0) return;

  actor = _checkIfShouldSubtractFromCompanionOwner(actor, key);
  const resources = actor.system.resources;
  if (!resources.hasOwnProperty(key)) return;

  const current = resources[key].value;
  const newAmount = (boundary === "true" || boundary === true) ? Math.max(current - amount, 0) : current - amount;

  await actor.update({[`system.resources.${key}.value`] : newAmount});
}

export async function regainBasicResource(key, actor, amount, boundary) {
  amount = parseInt(amount);
  if (amount <= 0) return;

  actor = _checkIfShouldSubtractFromCompanionOwner(actor, key);
  const resources = actor.system.resources;
  if (!resources.hasOwnProperty(key)) return;

  const valueKey = key === "health" ? "current" : "value"
  const current = resources[key][valueKey];
  const max = resources[key].max;
  const newAmount = (boundary === "true" || boundary === true) ? Math.min(current + amount, max) : current + amount;

  await actor.update({[`system.resources.${key}.${valueKey}`] : newAmount});
}

export async function subtractCustomResource(key, actor, amount, boundary) {
  amount = parseInt(amount);
  if (amount <= 0) return;

  const custom = actor.system.resources.custom[key];
  if (!custom) return;

  const current = custom.value;
  const newAmount = (boundary === "true" || boundary === true) ? Math.max(current - amount, 0) : current - amount;
  await actor.update({[`system.resources.custom.${key}.value`] : newAmount});
}

export async function regainCustomResource(key, actor, amount, boundary) {
  amount = parseInt(amount);
  if (amount <= 0) return;

  const custom = actor.system.resources.custom[key];
  if (!custom) return;

  const current = custom.value;
  const max = custom.max;
  const newAmount = (boundary === "true" || boundary === true) ? Math.min(current + amount, max) : current + amount;
  await actor.update({[`system.resources.custom.${key}.value`] : newAmount});
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
export async function respectUsageCost(actor, item) {
  // First check if weapon needs reloading
  const weaponWasLoaded = runWeaponLoadedCheck(item);
  if (!weaponWasLoaded) return false;

  if (!item.system.costs) return true;
  let basicCosts = item.system.costs.resources;
  basicCosts = _costsAndEnhancements(actor, item);
  basicCosts = _costFromAdvForAp(item, basicCosts);

  // Held action ignore AP cost as it was subtracted before
  if (actor.flags.dc20rpg.actionHeld?.rollsHeldAction) {
    basicCosts.actionPoint = null;
  }

  // Enhacements can cause charge to be subtracted
  let [charges] = _collectCharges(item);

  const costs = {charges: charges, basicCosts: basicCosts};
  const skip = await runTemporaryItemMacro(item, "preItemCost", actor, {costs: costs});
  if (skip) return true;

  if(_canSubtractAllResources(actor, item, costs.basicCosts, costs.charges) 
        && _canSubtractFromOtherItem(actor, item)
        && _canSubtractFromEnhLinkedItems(actor, item)
  ) {
    await _subtractAllResources(actor, item, costs.basicCosts, costs.charges);
    _subtractFromOtherItem(actor, item);
    _subtractFromEnhLinkedItems(actor, item);
    if (weaponWasLoaded) unloadWeapon(item, actor);
    return true;
  }
  return false;
}

export function collectExpectedUsageCost(actor, item) {
  if (!item.system.costs) return [{}, {}];

  let basicCosts = item.system.costs.resources;
  basicCosts = _costsAndEnhancements(actor, item);
  basicCosts = _costFromAdvForAp(item, basicCosts);

  // Held action ignore AP cost as it was subtracted before
  if (actor.flags.dc20rpg.actionHeld?.rollsHeldAction) {
    basicCosts.actionPoint = null;
  }

  const [charges, chargesFromOtherItems] = _collectCharges(item);

  return [basicCosts, charges, chargesFromOtherItems];
}

export async function revertUsageCostSubtraction(actor, item) {
  if (!item.system.costs) return;
  let basicCosts = item.system.costs.resources;
  basicCosts = _costsAndEnhancements(actor, item);

  basicCosts.actionPoint = 0;
  basicCosts.stamina = 0;
  basicCosts.mana = 0;
  basicCosts.health = 0;
  for (let [key, custom] of Object.entries(basicCosts.custom)) {
    if (custom) basicCosts.custom[key].value = -custom.value;
  }
  await _subtractAllResources(actor, item, basicCosts, 0);
}

function _costsAndEnhancements(actor, item) {
  const enhancements = item.allEnhancements;  
  
  let costs = foundry.utils.deepClone(item.system.costs.resources);
  if (!enhancements) return costs;

  for (let enhancement of enhancements.values()) {
    if (enhancement.number) {
      // Core Resources
      for (let [key, resource] of Object.entries(enhancement.resources)) {
        if (key !== 'custom') costs[key] += enhancement.number * resource;
      }

      // Custom Resources
      for (let [key, custom] of Object.entries(enhancement.resources.custom)) {
        // If only enhancement is using that custom resource we want to add it to costs here
        if(!costs.custom[key]) {
          // We need to copy that enhancement
          costs.custom[key] = foundry.utils.deepClone(custom);
          // And then check its cost depending on number of uses
          costs.custom[key].value = enhancement.number * custom.value;
        }
        else {
          costs.custom[key].value += enhancement.number * custom.value;
        }
      }
    }
  }

  const outsideOfCombatRule = game.settings.get("dc20rpg", "outsideOfCombatRule");
  if (outsideOfCombatRule) {
    const activeCombat = game.combats.active;
    const notInCombat = !(activeCombat && activeCombat.started && actor.inCombat);
    if (notInCombat) {
      // No AP is being used outside of combat
      if (costs.actionPoint > 0) costs.actionPoint = 0;

      // No stamina is being used outside of combat
      if (costs.stamina > 0) costs.stamina = 0;

      // Mana usage is one less outside of combat (no less than 1)
      if (costs.mana > 1) costs.mana = costs.mana - 1;
    }
  } 

  return costs;
}

function _canSubtractAllResources(actor, item, costs, charges) {
  let canSubtractAllResources = [
    canSubtractBasicResource("ap", actor, costs.actionPoint),
    canSubtractBasicResource("stamina", actor, costs.stamina),
    canSubtractBasicResource("mana", actor, costs.mana),
    canSubtractBasicResource("health", actor, costs.health),
    canSubtractBasicResource("grit", actor, costs.grit),
    canSubtractBasicResource("restPoints", actor, costs.restPoints),
    _canSubtractCustomResources(actor, costs.custom),
    _canSubtractCharge(item, charges),
    _canSubtractQuantity(item, 1),
  ];
  return arrayOfTruth(canSubtractAllResources);
}

async function _subtractAllResources(actor, item, costs, charges) {
  const oldResources = actor.system.resources

  let [newResources, resourceMax] = _copyResources(oldResources);
  newResources = _prepareBasicResourceModification("ap", costs.actionPoint, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("stamina", costs.stamina, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("mana", costs.mana, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("health", costs.health, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("grit", costs.grit, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("restPoints", costs.restPoints, newResources, resourceMax, actor);
  newResources = _prepareCustomResourcesModification(costs.custom, newResources, resourceMax);
  await _subtractActorResources(actor, newResources);
  _subtractCharge(item, charges);
  _subtractQuantity(item, 1);
}

async function _subtractActorResources(actor, newResources) {
  await actor.update({['system.resources'] : newResources});
}

function _copyResources(old) {
  const nev = {
    ap: {},
    stamina: {},
    mana: {},
    health: {},
    grit: {},
    restPoints: {},
    custom: {}
  };
  const max = {
    ap: {},
    stamina: {},
    mana: {},
    health: {},
    grit: {},
    restPoints: {},
    custom: {}
  }

  // Standard Resources
  for (const [key, resource] of Object.entries(old)) {
    if(key === "custom") continue;

    if(key === "health") nev[key].current = resource.current;
    else nev[key].value = resource.value;
    
    max[key].max = resource.max;
  }

  // Custom Resources
  for (const [key, resource] of Object.entries(old.custom)) {
    if (!nev.custom[key]) nev.custom[key] = {}; // If no object with key found create new object
    if (!max.custom[key]) max.custom[key] = {}; // If no object with key found create new object

    nev.custom[key].value = resource.value;
    max.custom[key].max = resource.max;
  }
  
  return [nev, max];
}

//================================
//        Basic Resources        =
//================================
export function canSubtractBasicResource(key, actor, cost) {
  if (cost <= 0) return true;

  actor = _checkIfShouldSubtractFromCompanionOwner(actor, key);
  const resources = actor.system.resources;
  if (!resources.hasOwnProperty(key)) return true;
  
  // Incapacitated actor cannot spend AP
  if (key === "ap" && actor.hasAnyStatus(["surprised", "incapacitated"])) {
    let errorMessage = `Incapacitated or Surprised - cannot spend Action Points`;
    ui.notifications.error(errorMessage);
    return false;
  }

  const current = key === "health" ? resources[key].current : resources[key].value;
  const newAmount = current - cost;

  if (newAmount < 0) {
    let errorMessage = `Cannot subract ${cost} ${key} from ${actor.name}. Not enough ${key} (Current amount: ${current}).`;
    ui.notifications.error(errorMessage);
    return false;
  }
  // Death's Door limit AP spend to 1 per turn
  if (key === "ap" && actor.hasAnyStatus(["deathsDoor"])) {
    const spendLimit = actor.system.death.apSpendLimit;
    if (newAmount < resources[key].max - spendLimit) {
      let errorMessage = `You are on the Death's Door - you cannot spend more that ${spendLimit} AP per turn until restored to 1 HP.`;
      ui.notifications.error(errorMessage);
      return false;
    }
  }
  
  return true;
}

function _costFromAdvForAp(actor, basicCosts) {
  const apCostFromAdv = actor.flags.dc20rpg.rollMenu.apCost;
  if (basicCosts.actionPoint) basicCosts.actionPoint += apCostFromAdv;
  else basicCosts.actionPoint = apCostFromAdv;
  return basicCosts;
}

function _prepareBasicResourceModification(key, cost, newResources, resourceMax, actor) {
  if (companionShare(actor, key)) {
    const subKey = key === "health" ? "current" : "value"; 
    const currentValue = actor.companionOwner.system.resources[key][subKey];
    actor.companionOwner.update({[`system.resources.${key}.${subKey}`]: currentValue - cost});
    return newResources; // We dont modify value of companion because we subtract from owner
  }
  if (!newResources.hasOwnProperty(key)) return newResources;
  if(key === "health") {
    const newAmount = newResources[key].current - cost;
    newResources[key].current = newAmount > resourceMax[key].max ? resourceMax[key].max : newAmount;
  }
  else {
    const newAmount = newResources[key].value - cost;
    newResources[key].value = newAmount > resourceMax[key].max ? resourceMax[key].max : newAmount;
  }
  return newResources;
}

//=================================
//        Custom Resources        =
//=================================
function _canSubtractCustomResources(actor, customCosts) {
  const customResources = actor.system.resources.custom;

  for (const [key, cost] of Object.entries(customCosts)) {
    if (!customResources[key]) continue;
    if (cost.value <= 0) continue;

    const current = customResources[key].value;
    const newAmount = current - cost.value;
  
    if (newAmount < 0) {
      let errorMessage = `Cannot subract ${cost.value} charges of custom resource ${cost.name} from ${actor.name}. Current amount: ${current}.`;
      ui.notifications.error(errorMessage);
      return false;
    }
  }

  return true;
}

function _prepareCustomResourcesModification(customCosts, newResources, resourceMax) {
  const customResources = newResources.custom;
  const maxResources = resourceMax.custom;

  for (const [key, cost] of Object.entries(customCosts)) {
    if (!customResources[key]) continue;

    const current = customResources[key].value;
    const newAmount = current - cost.value;
    newResources.custom[key].value = newAmount > maxResources[key].max ? maxResources[key].max : newAmount;
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

function _canSubtractFromEnhLinkedItems(actor, item) {
  const chargesPerItem = _collectEnhLinkedItemsWithCharges(item, actor);

  for (let original of Object.values(chargesPerItem)) {
    if (!_canSubtractCharge(original.item, original.amount)) return false;
  }
  return true;
}

function _subtractFromEnhLinkedItems(actor, item) {
  const chargesPerItem = _collectEnhLinkedItemsWithCharges(item, actor)

  for (let original of Object.values(chargesPerItem)) {
    _subtractCharge(original.item, original.amount);
  }
}

function _canSubtractCharge(item, subtractedAmount) {
  let max = item.system.costs.charges.max;
  if (!max) return true;

  let current = item.system.costs.charges.current;
  let newAmount = current - subtractedAmount;

  if (newAmount < 0) {
    let errorMessage = `Cannot use ${item.name}. Not enough charges.`;
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
    item.deleteAfter = true; // Mark item to removal
  } 
  else {
    item.update({["system.quantity"] : newAmount});
  }
}

//===============================
//            Helpers           =
//===============================
function _collectEnhLinkedItemsWithCharges(item, actor) {
  const chargesPerItem = {};

  // Collect how many charges you need to use
  for (const enhancement of item.allEnhancements.values()) {
    if (enhancement.number) {
      const charges = enhancement.charges;
      if (charges?.consume && charges.fromOriginal && enhancement.sourceItemId !== item.id) {
        const original = actor.items.get(enhancement.sourceItemId);
        if (original) {
          const alreadyExist = chargesPerItem[enhancement.sourceItemId]
          if (alreadyExist) {
            alreadyExist.amount += enhancement.number;
          }
          else {
            chargesPerItem[enhancement.sourceItemId] = {
              item: original,
              amount: enhancement.number
            }
          }
        }
      }
    }
  }
  return chargesPerItem;
}

function _collectCharges(item) {
  // If item has max charges we want to remove one for sure;
  let charges = item.system.costs.charges.max ? 1 : 0;
  let chargesFromOtherItems = 0;
 
  // Collect how many charges you need to use
  for (let enhancement of item.allEnhancements.values()) {
    if (enhancement.number) {
      if (enhancement.charges?.consume) {
        if (enhancement.charges.fromOriginal && enhancement.sourceItemId !== item.id) {
          chargesFromOtherItems += enhancement.number;
        }
        else {
          charges += enhancement.number;
        }
      }
    }
  }
  return [charges, chargesFromOtherItems];
}

function _checkIfShouldSubtractFromCompanionOwner(actor, key) {
  if (companionShare(actor, key)) return actor.companionOwner;
  return actor;
}