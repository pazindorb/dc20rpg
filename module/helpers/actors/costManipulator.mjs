import { runWeaponLoadedCheck, unloadWeapon } from "../items/itemConfig.mjs";
import { runTemporaryItemMacro } from "../macros.mjs";
import { arrayOfTruth } from "../utils.mjs";
import { companionShare } from "./companion.mjs";
import { changedResourceFilter, runEventsFor } from "./events.mjs";

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
/** @deprecated since v0.9.8 until 0.11.0 */
export function subtractAP(actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractAP' method is deprecated, and will be removed in the later system version. Use 'actor.resources.ap.checkAndSpend' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  if (typeof amount !== 'number') return true;
  return actor.resources.ap.checkAndSpend(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export async function subtractBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].spend' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  await actor.resources[key].spend(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export async function regainBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.regainBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].regain' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  await actor.resources[key].regain(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export async function subtractCustomResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.subtractCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].spend' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  await actor.resources[key].spend(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export async function regainCustomResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.regainCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].regain' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  await actor.resources[key].regain(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export function canSubtractBasicResource(key, actor, amount) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.canSubtractBasicResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].canSpend' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  return actor.resources[key].canSpend(amount);
}

/** @deprecated since v0.9.8 until 0.11.0 */
export function canSubtractCustomResource(key, actor, cost) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.resources.canSubtractCustomResource' method is deprecated, and will be removed in the later system version. Use 'actor.resources[resourceKey].canSpend' instead.", { since: " 0.9.8", until: "0.11.0", once: true });
  return actor.resources[key].canSpend(cost);
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
  basicCosts = _costFromAdvForApAndGrit(item, basicCosts);

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
        && _canSubtractAmmo(actor, item)
  ) {
    actor.subtractOperation = {charges: [], quantity: [], resources: {}};
    await _subtractAllResources(actor, item, costs.basicCosts, costs.charges);
    _subtractFromOtherItem(actor, item);
    _subtractFromEnhLinkedItems(actor, item);
    _subtractAmmo(actor, item);
    if (weaponWasLoaded) unloadWeapon(item, actor);
    return true;
  }
  return false;
}

export function collectExpectedUsageCost(actor, item) {
  if (!item.system.costs) return [{}, {}];

  let basicCosts = item.system.costs.resources;
  basicCosts = _costsAndEnhancements(actor, item);
  basicCosts = _costFromAdvForApAndGrit(item, basicCosts);

  // Held action ignore AP cost as it was subtracted before
  if (actor.flags.dc20rpg.actionHeld?.rollsHeldAction) {
    basicCosts.actionPoint = null;
  }

  const [charges, chargesFromOtherItems] = _collectCharges(item);

  return [basicCosts, charges, chargesFromOtherItems];
}

export async function revertUsageCostSubtraction(actor) {
  if (!actor.subtractOperation) return;

  await _updateActorResources(actor, actor.subtractOperation.resources?.before);
  actor.subtractOperation.charges.forEach(change => {
    change.item.update({["system.costs.charges.current"]: change.before});
  })
  actor.subtractOperation.quantity.forEach(change => {
    change.item.update({["system.quantity"]: change.before});
  })

  delete actor.subtractOperation;
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
    actor.resources.ap.canSpend(costs.actionPoint),
    actor.resources.stamina.canSpend(costs.stamina),
    actor.resources.mana.canSpend(costs.mana),
    actor.resources.health.canSpend(costs.health),
    actor.resources.grit.canSpend(costs.grit),
    actor.resources.restPoints.canSpend(costs.restPoints),
    _canSubtractAllCustomResources(actor, costs.custom),
    _canSubtractCharge(item, charges),
    _canSubtractQuantity(item, 1),
  ];
  return arrayOfTruth(canSubtractAllResources);
}

async function _subtractAllResources(actor, item, costs, charges) {
  const oldResources = actor.system.resources;

  let [newResources, resourceMax] = _copyResources(oldResources);
  newResources = _prepareBasicResourceModification("ap", costs.actionPoint, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("stamina", costs.stamina, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("mana", costs.mana, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("health", costs.health, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("grit", costs.grit, newResources, resourceMax, actor);
  newResources = _prepareBasicResourceModification("restPoints", costs.restPoints, newResources, resourceMax, actor);
  newResources = _prepareCustomResourcesModification(costs.custom, newResources, resourceMax);
  await _updateActorResources(actor, newResources);
  actor.subtractOperation.resources = {before: _copyResources(oldResources)[0], after: newResources};
  _subtractCharge(item, charges, actor.subtractOperation);
  _subtractQuantity(item, 1, true, actor.subtractOperation);
}

async function _updateActorResources(actor, newResources) {
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
function _costFromAdvForApAndGrit(actor, basicCosts) {
  const apCostFromAdv = actor.system.rollMenu.apCost;
  if (basicCosts.actionPoint) basicCosts.actionPoint += apCostFromAdv;
  else basicCosts.actionPoint = apCostFromAdv;

  const gritCostFromAdv = actor.system.rollMenu.gritCost;
  if (basicCosts.grit) basicCosts.grit += gritCostFromAdv;
  else basicCosts.grit = gritCostFromAdv;
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
function _canSubtractAllCustomResources(actor, customCosts) {
  for (const [key, cost] of Object.entries(customCosts)) {
    const resource = actor.resources[key]; 
    if (!resource) continue;
    if (!resource.canSpend(cost.value)) return false;
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
function _canSubtractAmmo(actor, item) {
  const ammoId = item.ammoId;
  if (!ammoId) return true;

  const ammo = actor.items.get(ammoId);
  if (!ammo) {
    ui.notifications.error( `Ammunition used by '${item.name}' doesn't exist.`);
    return false;
  }
  return _canSubtractQuantity(ammo, 1);
}

function _subtractAmmo(actor, item) {
  const ammoId = item.ammoId;
  const ammo = actor.items.get(ammoId);
  if (ammo) {
    _subtractQuantity(ammo, 1, false, actor.subtractOperation);
  }
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
     ? _subtractCharge(otherItem, otherItemUsage.amountConsumed, actor.subtractOperation) 
     : _subtractQuantity(otherItem, otherItemUsage.amountConsumed, false, actor.subtractOperation);
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
  const chargesPerItem = _collectEnhLinkedItemsWithCharges(item, actor);

  for (let original of Object.values(chargesPerItem)) {
    _subtractCharge(original.item, original.amount, actor.subtractOperation);
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

function _subtractCharge(item, subtractedAmount, subtractOperation) {
  let max = item.system.costs.charges.max;
  if (!max) return;

  let current = item.system.costs.charges.current;
  let newAmount = current - subtractedAmount;

  item.update({["system.costs.charges.current"] : newAmount});
  subtractOperation.charges.push({
    item: item,
    before: current,
    after: newAmount
  })
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

function _subtractQuantity(item, subtractedAmount, markToRemoval, subtractOperation) {
  if (item.type !== "consumable") return;
  if (!item.system.consume) return;

  let deleteOnZero = item.system.deleteOnZero;
  let current = item.system.quantity;
  let newAmount = current - subtractedAmount;

  if (newAmount === 0 && deleteOnZero) {
    if(markToRemoval) item.deleteAfter = true; // Mark item to removal
    else item.delete();
  } 
  else {
    item.update({["system.quantity"] : newAmount});
    subtractOperation.quantity.push({
      item: item,
      before: current,
      after: newAmount
    });
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
  const itemCharges = item.system.costs.charges;
  let charges = itemCharges.max ? (itemCharges.subtract || 0) : 0;
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

export async function runResourceChangeEvent(key, resource, before, actor, custom) {
  if (!before) return;
  if (resource.value === undefined) return;
  
  const changeValue = resource.value - before.value;
  if (changeValue === 0) return;
  const operation = changeValue > 0 ? "addition" : "subtraction";
  await runEventsFor("resourceChange", actor, changedResourceFilter(key, operation), {resourceKey: key, change: changeValue, customResource: custom})
}