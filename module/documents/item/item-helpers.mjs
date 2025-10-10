import { enrichRollMenuObject } from "../../dataModel/fields/rollMenu.mjs";
import { itemMeetsUseConditions } from "../../helpers/conditionals.mjs";
import { toggleCheck } from "../../helpers/items/itemConfig.mjs";
import { runTemporaryItemMacro, runTemporaryMacro } from "../../helpers/macros.mjs";
import { evaluateFormula } from "../../helpers/rolls.mjs";
import { generateKey } from "../../helpers/utils.mjs";
import { DC20RpgItem } from "../item.mjs";
import { AgainstStatus, Conditional, Enhancement, Formula, ItemMacro, RollRequest } from "./item-creators.mjs";

export function enrichWithHelpers(item) {
  enrichRollMenuObject(item);

  if (item.system.usable) {
    item.use = {};
    _enrichUseCostObject(item);
  }
  if (item.system.properties) {
    _enrichPropertiesObject(item);
  }
  if (item.system.enhancements) {
    _enrichEnhancementObject(item);
  }
  if (item.system.usesWeapon?.weaponAttack) {
    _enrichUseWeaponObject(item);
  }
  if (item.system.infusions) {
    _enrichItemInfusions(item);
  }
}

//==================================//==================================
//                               USE COST                              =
//==================================//==================================
export function _enrichUseCostObject(item) {
  item.use.hasCharges = !!item.system.costs.charges.max;
  item.use.canRemoveCharge = (amount) => _canRemoveCharge(amount, item);
  item.use.removeCharge = async (amount, delayDeletion=false) => await _removeCharge(amount, delayDeletion, item);
  item.use.useCharges = async () => await _useCharges(item);
  item.use.addCharge = async (amount) => await _addCharge(amount, item);
  item.use.regainCharges = async (half=false) => await _regainCharges(half, item);

  if (item.type === "consumable") {
    item.use.canConsumeQuantity = (amount=1) => _canConsumeQuantity(amount, item);
    item.use.consumeQuantity = async (amount=1, delayDeletion=false) => await _consumeQuantity(amount, delayDeletion, item);
    item.use.gainQuantity = async (amount=1) => await _gainQuantity(amount, item);
  }

  item.use.collectUseCost = (clean) => _collectUseCost(item, clean);
  item.use.respectUseCost = async (useCost=_collectUseCost(item)) => await _respectUseCost(useCost, item);
  item.use.revertUseCost = async () => await _revertUseCost(item);
  item.use.useCostDisplayData = (clean) => _useCostDisplayData(item, clean);
  item.use.enhancementCostDisplayData = (enhKey) => _enhancementCostDisplayData(item, enhKey); // TODO: Move to enhancement?
}

//==================================
//             CHARGES             =
//==================================
function _canRemoveCharge(amount, item) {
  if (!amount) return true;
  amount = parseInt(amount);

  const charges = item.system.costs.charges;
  if (charges.current - amount < 0) {
    ui.notifications.error(`Cannot subract charges (${amount}) from '${item.name}'.`);
    return false;
  }
  return true;
}

async function _removeCharge(amount, delayDeletion, item) {
  if (!amount) return;
  amount = parseInt(amount);

  const charges = item.system.costs.charges;
  const newAmount = charges.current - amount;
  if (newAmount <= 0) {
    if (charges.limitedInfusion) {
      if (delayDeletion) item.removeInfusionAfter = charges.limitedInfusion;
      else await item.infusions.active[charges.limitedInfusion].remove();
      return;
    }
    if (charges.deleteOnZero) {
      if (delayDeletion) item.deleteAfter = true; // Item will be removed after the operation
      else await item.delete();
      return;
    }
  }
  await item.update({["system.costs.charges.current"] : Math.max(newAmount, 0)});
}

async function _addCharge(amount, item) {
  if (!amount) return;
  amount = parseInt(amount);

  const charges = item.system.costs.charges;
  const newValue =  Math.min(charges.current + amount, charges.max);
  await item.update({["system.costs.charges.current"] : newValue});
}

async function _useCharges(item) {
  const amount = item.system.costs.charges.subtract;
  if (_canRemoveCharge(amount, item)) {
    await _removeCharge(amount, item);
  }
}

async function _regainCharges(half, item) {
  const charges = item.system.costs.charges;
  let newValue = charges.max;

  const rollData = await item.getRollData();
  if (charges.rechargeDice) {
    const roll = await evaluateFormula(charges.rechargeDice, rollData);
    const result = roll.total;

    const rechargeOutput = result >= charges.requiredTotalMinimum 
                                ? game.i18n.localize("dc20rpg.rest.rechargedDescription") 
                                : game.i18n.localize("dc20rpg.rest.notRechargedDescription")
    ui.notifications.info(`${item.actor.name} ${rechargeOutput} ${item.name}`);
    if (result < charges.requiredTotalMinimum) return;
  }
  if (charges.overriden) {
    const roll = await evaluateFormula(charges.rechargeFormula, rollData);
    newValue = roll.total;
  }

  if (half) newValue = Math.ceil(newValue/2);
  await item.update({["system.costs.charges.current"]: Math.min(charges.current + newValue, charges.max)});
}

//==================================
//            QUANTITY             =
//==================================
function _canConsumeQuantity(amount, item) {
  if (!item.system.consume) return true;
  if (!amount) return true;
  amount = parseInt(amount);

  const newAmount = item.system.quantity - amount;
  if (newAmount < 0) {
    ui.notifications.error(`Cannot consume quantity (${amount}) from '${item.name}'.`);
    return false;
  }
  return true;
}

async function _consumeQuantity(amount, delayDeletion, item) {
  if (!item.system.consume) return;
  amount = parseInt(amount);

  const newAmount = item.system.quantity - amount;
  if (newAmount <= 0 && item.system.deleteOnZero) {
    if (delayDeletion) item.deleteAfter = true; // Item will be removed after the operation
    else await item.delete();
  }
  else {
    await item.update({["system.quantity"]: newAmount});
  }
}

async function _gainQuantity(amount, item) {
  if (!amount) return;
  amount = parseInt(amount);
  await item.update({["system.quantity"] : item.system.quantity + amount});
}

//==================================
//      COLLECT ITEM USE COST      =
//==================================
function _collectUseCost(item, clean=false) {
  const cost = {
    resources: {},
    charges: {},
    quantity: {},
  };
  const actor = item.actor;

  // Collect cost from Item Use itself
  for (let [key, value] of Object.entries(item.system.costs.resources)) {
    _addToResources(cost, key, value, actor);
  }
  if (item.use.hasCharges) _collectCharges(cost, item.id, item.system.costs.charges.subtract);
  if (clean) return cost;

  // Collect quantity
  _collectQuantity(cost, item);

  // Collect cost from Roll Menu
  _addToResources(cost, "ap", item.system.rollMenu.apCost, actor);
  _addToResources(cost, "grit", item.system.rollMenu.gritCost, actor);

  // Collect cost from Enhancements
  for (const enhancement of item.activeEnhancements.values()) {
    // Collect resources
    for (let [key, value] of Object.entries(enhancement.resources)) {
      _addToResources(cost, key, value, actor, enhancement.number);
    }
    // Collect charges
    // TODO backward compatibilty remove as part of 0.10.0 update
    if (enhancement.charges?.consume && enhancement.charges.subtract === undefined) {
      enhancement.charges.subtract = 1;
    } 
    if (enhancement.charges?.subtract) {
      if (enhancement.charges.fromOriginal) {
        _collectCharges(cost, enhancement.sourceItemId, enhancement.charges.subtract * enhancement.number);
      }
      else {
        _collectCharges(cost, item.id, enhancement.charges.subtract * enhancement.number);
      }
    }
  }

  // If this is held action we skip ap cost
  if (actor && actor.flags.dc20rpg.actionHeld.rollsHeldAction) {
    delete cost.resources.ap;
  }

  // Respect Outside of Combat rules if setting selected
  if (game.settings.get("dc20rpg", "outsideOfCombatRule") && !actor.inCombat) {
    delete cost.resources.ap;
    delete cost.resources.stamina;
    if (cost.resources.mana > 1) cost.resources.mana -= 1;
  }

  return cost;
}

function _addToResources(cost, key, value, actor, multiplier=1) {
  if (key === "actionPoint") key = "ap"; //TODO backward compatibilty remove as part of 0.10.0 update
  if (key === "custom") {
    for (const [customKey, customRes] of Object.entries(value)) {
      _addToResources(cost, customKey, customRes.value, actor, multiplier);
    }
    return;
  }

  // Skip if actor doesn't have that resource at all
  if (actor && !actor.resources.hasResource(key)) return;
  if (value == null) return;
  
  if (cost.resources[key]) {
    cost.resources[key] += (value * multiplier);
  }
  else {
    cost.resources[key] = (value * multiplier);
  }
}

function _collectCharges(cost, itemId, value) {
  if (cost.charges[itemId]) {
    cost.charges[itemId] += value;
  }
  else {
    cost.charges[itemId] = value;
  }
}

function _collectQuantity(cost, item) {
  if (item.type === "consumable") {
    cost.quantity[item.id] = 1;
  }

  const actor = item.actor;
  if (!actor) return;
  const ammo = actor.items.get(item.ammoId);
  if (ammo) {
    cost.quantity[ammo.id] = 1;
  }
}

//==================================
//      RESPECT ITEM USE COST      =
//==================================
async function _respectUseCost(cost, item) {
  const actor = item.actor;
  if (!actor) return false;
  // We want to make sure all fields are present even if empty
  cost = { resources: {}, charges: {}, quantity: {}, ...cost };

  const skip = await runTemporaryItemMacro(item, "preItemCost", actor, {costs: cost});
  if (skip) return true;

  if (item.reloadable && !item.reloadable.isLoaded()) return false;
  const canUse = _canSpendResources(cost, actor) 
              && _canSubtractCharges(cost, item, actor) 
              && _canConsumeQuantities(cost, item, actor)
  if (!canUse) return false;

  item.useCostHistory = cost; // We need it if we want to revert it for some reason
  await _spendResources(cost, actor);
  await _subtractCharges(cost, item, actor);
  await _consumeQuantities(cost, item, actor);
  if (item.reloadable) await item.reloadable.unload();
  return true;
  // Improvement - spend all things at once not one by one
}

function _canSpendResources(cost, actor) {
  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    if (!actor.resources[resourceKey].canSpend(amount)) return false;
  }
  return true;
}

function _canSubtractCharges(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    if (!item) {
      ui.notifications.error(`Item with id '${itemId}' cannot be found on '${actor.name}'`);
      return false;
    }
    if (!item.use.canRemoveCharge(amount)) {
      return false;
    }
  }
  return true;
}

function _canConsumeQuantities(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.quantity)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    if (!item) {
      ui.notifications.error(`Item with id '${itemId}' cannot be found on '${actor.name}'`);
      return false;
    }
    if (!item.use.canConsumeQuantity(amount)) {
      return false;
    }
  }
  return true;
}

async function _spendResources(cost, actor) {
  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    await actor.resources[resourceKey].spend(amount);
  }
}

async function _subtractCharges(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    await item.use.removeCharge(amount, true);
  }
}

async function _consumeQuantities(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.quantity)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    await item.use.consumeQuantity(amount, true);
  }
}

//==================================
//       REVERT ITEM USE COST      =
//==================================
async function _revertUseCost(item) {
  const actor = item.actor;
  if (!actor) return;
  const cost = item.useCostHistory;
  if (!cost) {
    ui.notifications.warn(`Cannot revert use cost for '${actor.name}', use cost history not found.`);
    return;
  }

  await _regainResources(cost, actor);
  await _addCharges(cost, item, actor);
  await _gainQuantities(cost, item, actor);
  if (item.reloadable) await item.reloadable.reload(true);
  delete item.useCostHistory;
}

async function _regainResources(cost, actor) {
  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    await actor.resources[resourceKey].regain(amount);
  }
}

async function _addCharges(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    await item.use.addCharge(amount);
  }
}

async function _gainQuantities(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.quantity)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    await item.use.gainQuantity(amount);
  }
}

//==================================
//      USE COST DISPLAY DATA      =
//==================================
function _useCostDisplayData(item, clean) {
  const actor = item.actor;
  const cost = _collectUseCost(item, clean);
  const displayData = {
    resources: {},
    charges: {},
    quantity: {}
  }

  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    displayData.resources[resourceKey] = _getResourceDisplayData(resourceKey, amount, item, actor);
  }
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    if (itemId === item.id) {
      displayData.charges[itemId] = _charge(true, amount, item.name);
    }
    else if (actor) {
      const itm = actor.items.get(itemId);
      displayData.charges[itemId] = _charge(false, amount, itm.name);
    }
  }
  return displayData;
}

function _getResourceDisplayData(key, amount, item, actor) {
  if (actor) {
    const resource = actor.resources[key];
    if (resource.isCustom) return _customResource(resource, amount);
    else return _basicResource(key, amount);
  }
  else {
    const resources = {...item.system.costs.resources};
    // TODO: backward compatibility - remove after 10.0
    if (key === "ap" && !resources.ap) {
      resources.ap = resources.actionPoint;
    } 
    if (resources.custom[key]) return _customResource(resources.custom[key], amount);
    else if (resources[key]) return _basicResource(key, amount);
  }
}

function _customResource(resource, amount) {
  return {
    img: resource.img,
    label: resource.label,
    amount: amount,
    short: resource.label,
    custom: true
  }
}

function _basicResource(key, amount) {
  return {
    icon: _icon(key),
    label: game.i18n.localize(`dc20rpg.resources.${key}`),
    amount: amount,
    short: _short(key),
    custom: false
  }
}

function _charge(self, amount, itemName) {
  const icon = self ? _icon("charge-self") : _icon("charge-other");
  return {
    self: self,
    icon: icon,
    amount: amount,
    itemName: itemName
  };
}

function _short(key) {
  switch(key) {
    case "ap": return "AP";
    case "stamina": return "SP";
    case "mana": return "MP";
    case "grit": return "GP";
    case "restPoints": return "RP";
    case "health": return "HP";
  }
}

function _icon(key) {
  switch(key) {
    case "ap": return "ap fa-dice-d6 cost-icon";
    case "stamina": return "sp fa-hand-fist cost-icon";
    case "mana": return "mp fa-star cost-icon";
    case "grit": return "grit fa-clover cost-icon";
    case "restPoints": return "restPoints fa-campground cost-icon";
    case "health": return "hp fa-heart cost-icon";
    case "charge-self": return "fa-bolt cost-icon";
    case "charge-other": return "fa-right-from-bracket cost-icon";
  }
}

//==================================
//  ENHANCEMENT COST DISPLAY DATA  =
//==================================
function _enhancementCostDisplayData(item, enhKey) {
  const actor = item.actor;
  const cost = _collectEnhancementCost(item, enhKey);
  const displayData = {
    resources: {},
    charges: {},
    quantity: {}
  }

  for (const [resourceKey, amount] of Object.entries(cost.resources)) {
    displayData.resources[resourceKey] = _getResourceDisplayData(resourceKey, amount, item, actor);
  }
  for (const [itemId, amount] of Object.entries(cost.charges)) {
    if (itemId === item.id) {
      displayData.charges[itemId] = _charge(true, amount, item.name);
    }
    else if (actor) {
      const itm = actor.items.get(itemId);
      displayData.charges[itemId] = _charge(false, amount, itm.name);
    }
  }
  return displayData;
}

function _collectEnhancementCost(item, enhKey) {
  const cost = {
    resources: {},
    charges: {},
    quantity: {},
  };
  const actor = item.actor;
  const enhancement = item.allEnhancements.get(enhKey);
  if (!enhancement) {
    ui.notifications.error(`Enhancement with key '${amount}' not found on '${item.name}' item.`);
    return cost;
  }

  for (let [key, value] of Object.entries(enhancement.resources)) {
    _addToResources(cost, key, value, actor);
  }
  // TODO backward compatibilty remove as part of 0.10.0 update
  if (enhancement.charges?.consume && enhancement.charges.subtract === undefined) {
    enhancement.charges.subtract = 1;
  } 
  if (enhancement.charges?.subtract) {
    if (enhancement.charges.fromOriginal) {
      _collectCharges(cost, enhancement.sourceItemId, enhancement.charges.subtract * enhancement.number);
    }
    else {
      _collectCharges(cost, item.id, enhancement.charges.subtract * enhancement.number);
    }
  }
  return cost;
}

//==================================//==================================
//                              PROPERTIES                             =
//==================================//==================================
function _enrichPropertiesObject(item) {
  _enhanceReload(item);
  _enhanceMultiFaceted(item);
  _enhanceAmmo(item);
}

//==================================
//              RELOAD             =
//==================================
function _enhanceReload(item) {
  const reloadProperty = item.system?.properties?.reload;
  if (!reloadProperty || !reloadProperty.active) return;

  item.reloadable = {
    isLoaded: (skipError) => _isLoaded(item, skipError),
    reload: (free) => _reloadItem(item, free),
    unload: () => _unloadItem(item)
  }
}

function _isLoaded(item, skipError=false) {
  if (item.system.properties.reload.loaded) return true;
  if (!skipError) ui.notifications.error(`${item.name} is not loaded.`);
  return false;
}

async function _reloadItem(item, free) {
  const actor = item.actor;
  if (!free && actor) {
    if (!actor.resources.ap.checkAndSpend(1)) return;
  }
  await item.update({[`system.properties.reload.loaded`]: true});
}

async function _unloadItem(item) {
  await item.update({[`system.properties.reload.loaded`]: false});
}

//==================================
//          MULTI FACETED          =
//==================================
function _enhanceMultiFaceted(item) {
  const property = item.system?.properties?.multiFaceted;
  if (!property || !property.active) return;

  item.multiFaceted = {
    swap: () => _swapMultiFaceted(item)
  }
}

async function _swapMultiFaceted(item) {
  const multiFaceted = item.system.properties?.multiFaceted;
  const damageFormula = item.system.formulas.weaponDamage;
  if (!damageFormula) {
    ui.notifications.error("Original damage formula cannot be found. You have to recreate this item to fix that problem");
    return;
  }

  if (multiFaceted.selected === "first") multiFaceted.selected = "second";
  else multiFaceted.selected = "first";
  const selected = multiFaceted.selected;

  multiFaceted.labelKey = multiFaceted.weaponStyle[selected];
  const weaponStyle = multiFaceted.weaponStyle[selected];
  damageFormula.type = multiFaceted.damageType[selected];

  const updateData = {
    system: {
      weaponStyle: weaponStyle,
      properties: {
        multiFaceted: multiFaceted
      },
      formulas: {
        weaponDamage: damageFormula
      }
    }
  }
  await item.update(updateData);
}

//==================================
//               AMMO              =
//==================================
function _enhanceAmmo(item) {
  const property = item.system?.properties?.ammo;
  if (!property || !property.active) return;

  item.ammo = {
    change: async (ammoId) => await _changeAmmo(ammoId, item),
    options: () => _getAmmoOptions(item)
  }
}

async function _changeAmmo(ammoId, item) {
  await item.update({["system.properties.ammo.ammoId"]: ammoId});
}

function _getAmmoOptions(weapon) {
  const actor = weapon.actor;
  if (!actor) return {};
  
  const ammo = {};
  actor.items.filter(item => item.system.consumableType === "ammunition")
            .forEach(item => ammo[item.id] = item.name);
  return ammo;
}
 
//==================================//==================================
//                             ENHANCEMENTS                            =
//==================================//==================================
function _enrichEnhancementObject(item) {
  const enhancements = {};
  enhancements.maintained = new Map();
  for (const [key, enhancement] of Object.entries(item.system.enhancements)) {
    enhancement.key = key;
    enhancement.sourceItemId = item.id;
    enhancement.sourceItemName = item.name;
    enhancement.sourceItemImg = item.img;
    enhancement.active = enhancement.number > 0

    enhancement.toggleUp = async () => await _enhancementToggle(enhancement, true, item);
    enhancement.toggleDown = async () => await _enhancementToggle(enhancement, false, item);
    enhancement.clear = async () => await item.update({[`system.enhancements.${key}.number`]: 0});
    enhancement.delete = async () => await item.update({[`system.enhancements.-=${key}`]: null});
    
    enhancements.maintained.set(key, enhancement);
  }

  Object.defineProperty(enhancements, "all", {get: () => _allEnhancements(item, enhancements)});
  Object.defineProperty(enhancements, "active", {get: () => _activeEnhancements(item, enhancements)});
  enhancements.add = async (enhancementData, enhancementKey) => await Enhancement.create(enhancementData, {parent: item, key: enhancementKey});

  item.enhancements = enhancements;
}

async function _enhancementToggle(enhancement, up, item) {
  if (up) await item.update({[`system.enhancements.${enhancement.key}.number`]: Math.min(enhancement.number + 1, 9)});
  else await item.update({[`system.enhancements.${enhancement.key}.number`]: Math.max(enhancement.number - 1, 0)});
}

function _allEnhancements(item) {
  let enhancements = foundry.utils.deepClone(item.enhancements.maintained);
  const parent = item.actor;
  if (!parent) return enhancements;


  //========== FROM USED WEAPON ==========//
  const usesWeapon = item.system.usesWeapon;
  if (usesWeapon?.weaponAttack) {
    const weapon = parent.items.get(usesWeapon.weaponId);
    if (weapon) {
      enhancements = new Map([...enhancements, ...weapon.enhancements.all]);
    }
  }

  //========== COPIED ENHANNCEMENTS ==========//
  // We need to deal with case where items call each other in a infinite loop
  // We expect 10 to be deep enough to collect all the coppied enhancements
  let firstCall = false;
  if (DC20RpgItem.enhLoopCounter === 0) firstCall = true;
  if (DC20RpgItem.enhLoopCounter > 10) return enhancements;
  DC20RpgItem.enhLoopCounter++;
  
  for (const itemWithCopyEnh of parent.itemsWithEnhancementsToCopy) {
    if (itemWithCopyEnh.itemId === item.id) continue;
    if (itemMeetsUseConditions(itemWithCopyEnh.copyFor, item)) {
      const itm = parent.items.get(itemWithCopyEnh.itemId);
      if (item.id === itm.system.usesWeapon?.weaponId) continue; //Infinite loop when it happends
      if (itm && itm.system.copyEnhancements?.copy && toggleCheck(itm, itm.system.copyEnhancements?.linkWithToggle)) {
        enhancements = new Map([...enhancements, ...itm.enhancements.all]);
      }
    }
  }

  if (firstCall) DC20RpgItem.enhLoopCounter = 0;


  return enhancements;
}

function _activeEnhancements(item) {
  const active = new Map();
  _allEnhancements(item).forEach((enhancement, key) => {
    if (enhancement.active) active.set(key, enhancement);
  });
  return active;
}

//==================================//==================================
//                              USE WEAPON                             =
//==================================//==================================
function _enrichUseWeaponObject(item) {
  const owner = item.actor;
  if (!owner) return;
  const weapon = owner.items.get(item.system.usesWeapon.weaponId);
  if (!weapon) return;
  
  // We want to copy weapon attack range, weaponStyle and weaponType so we can make 
  // conditionals work for techniques and features that are using weapons
  item.system.weaponStyle = weapon.system.weaponStyle;
  item.system.weaponType = weapon.system.weaponType;
  item.system.weaponStyleActive = weapon.system.weaponStyleActive;
  item.system.attackFormula.rangeType = weapon.system.attackFormula.rangeType;
  item.system.attackFormula.checkType = weapon.system.attackFormula.checkType;

  // We also want to copy weapon range and properties
  item.system.properties = weapon.system.properties;
  item.system.range = weapon.system.range;

  item.ammo = weapon.ammo || undefined;
  item.reloadable = weapon.reloadable || undefined;
  item.multiFaceted = weapon.multiFaceted || undefined; 
}

//==================================//==================================
//                               INFUSIONS                             =
//==================================//==================================
function _enrichItemInfusions(item) {
  item.infusions = {
    apply: async (infusion, infuserUuid) => await _applyInfusion(infusion, item, infuserUuid),
  }

  let hasToggle = false;
  let hasCharges = false;
  let hasAttunement = false;
  const active = {};
  for (const [key, original] of Object.entries(item.system.infusions)) {
    const infusion = foundry.utils.deepClone(original);
    infusion.key = key;
    infusion.remove = async () => await _removeInfusion(infusion, item);
    active[key] = infusion;

    if (infusion.tags.attunement) hasAttunement = true;
    if (infusion.tags.charges || infusion.tags.limited) hasCharges = true;
    if (infusion.tags.toggle) hasToggle = true;
  }

  item.infusions.active = active;
  item.infusions.hasToggle = hasToggle;
  item.infusions.hasCharges = hasCharges;
  item.infusions.hasAttunement = hasAttunement;
}

//==================================
//              INFUSE             =
//==================================
async function _applyInfusion(infusionItem, item, infuserUuid) {
  if (!infusionItem) return;
  if (!["weapon", "equipment", "consumable"].includes(item.type)) {
    ui.notifications.warn("Only inventory items can be infused.");
    return false;
  }
  if (infusionItem.system.infusion.tags.consumable && item.type !== "consumable") {
    ui.notifications.warn("Only consumable item can be infused with that infusion.");
    return false;
  }

  const infusionKey = generateKey();
  const removeInfusionMacro = await _runInfusionMacro(infusionItem, item);
  const infusion = infusionItem.system.infusion;
  const data = {
    name: infusionItem.name,
    power: infusion.power,
    tags: infusion.tags,
    modifications: {
      effects: [],
      enhancements: [],
      macros: [],
      conditionals: [],
      formulas: [],
      rollRequests: [],
      againstStatuses: [],
      toggle: false,
    },
    removeInfusionMacro: removeInfusionMacro,
    infuserUuid: infuserUuid,
  }
  
  const updateData = {system: {infusions: {}}};

  // Copy from infusion
  if (infusion.copy.effects) {
    for (const effect of infusionItem.effects) {
      const created = await ActiveEffect.create(effect.toObject(), {parent: item});
      data.modifications.effects.push(created.id);
    }
  }
  if (infusion.copy.enhancements) {
    for (const enhancement of Object.values(infusionItem.system.enhancements)) {
      const key = await Enhancement.create(enhancement, {parent: item});
      data.modifications.enhancements.push(key);
    }
  }
  if (infusion.copy.macros) {
    for (const macro of Object.values(infusionItem.system.macros)) {
      const key = await ItemMacro.create(macro, {parent: item});
      data.modifications.macros.push(key);
    }
  }
  if (infusion.copy.conditionals) {
    for (const conditional of Object.values(infusionItem.system.conditionals)) {
      const key = await Conditional.create(conditional, {parent: item});
      data.modifications.conditionals.push(key);
    }
  }
  if (infusion.copy.formulas) {
    for (const formula of Object.values(infusionItem.system.formulas)) {
      const key = await Formula.create(formula, {parent: item});
      data.modifications.formulas.push(key);
    }
  }
  if (infusion.copy.rollRequests) {
    for (const rollRequest of Object.values(infusionItem.system.rollRequests)) {
      const key = await RollRequest.create(rollRequest, {parent: item});
      data.modifications.rollRequests.push(key);
    }
  }
  if (infusion.copy.againstStatuses) {
    for (const againstStatus of Object.values(infusionItem.system.againstStatuses)) {
      const key = await AgainstStatus.create(againstStatus, {parent: item});
      data.modifications.againstStatuses.push(key);
    }
  }

  // Tags
  if (infusion.tags.attunement) {
    updateData.system.properties = {
      attunement: {active: true}
    }
  }
  if (infusion.tags.toggle) {
    updateData.system.toggle = infusionItem.system.toggle;
    updateData.system.effectsConfig = {
      linkWithToggle: infusionItem.system.effectsConfig.linkWithToggle
    }
  }
  if (infusion.tags.limited && !infusion.tags.charges) {
    infusion.tags.charges = true;
  }
  if (infusion.tags.charges) {
    updateData.system.costs = {
      charges: infusionItem.system.costs.charges
    };
  }
  if (infusion.tags.consumable && infusion.tags.charges) {
    updateData.system.costs.charges.deleteOnZero = true;
    updateData.system.deleteOnZero = false;
    updateData.system.consume = false;
  }
    
  if (infusion.tags.limited) updateData.system.costs.charges.limitedInfusion = infusionKey;
  else updateData.system.costs.charges.limitedInfusion = "";

  updateData.system.infusions[infusionKey] = data;
  await item.update(updateData);
  infusionItem.reset(); // We need to clear infusion item if macro did some changes to it
  return true;
}

async function _runInfusionMacro(infusionItem, infusionTarget) {
  const macros = infusionItem.system?.macros;
  if (!macros) return [];

  const onRemove = [];
  for (const macro of Object.values(macros)) {
    if (macro.disabled) continue;
    const command = macro.command;
    if (!command) continue;

    if (macro.trigger === "infusion") {
      await runTemporaryMacro(command, infusionItem, {infusion: infusionItem, target: infusionTarget});
    }

    if (macro.trigger === "removeInfusion") {
      onRemove.push(command);
    }
  }
  return onRemove;
}

//==================================
//              REMOVE             =
//==================================
async function _removeInfusion(infusion, item) {
  const updateData = {system: {infusions: {}}};
  updateData.system.infusions[`-=${infusion.key}`] = null;

  await _runRemoveInfusionMacro(infusion.removeInfusionMacro, item);

  // Remove item modifications
  for (const effectId of infusion.modifications.effects) {
    const effect = item.effects.get(effectId);
    if (effect) effect.delete();
  }
  for (const key of infusion.modifications.enhancements) {
    await item.update({[`system.enhancements.-=${key}`]: null});
  }
  for (const key of infusion.modifications.macros) {
    await item.update({[`system.macros.-=${key}`]: null});
  }
  for (const key of infusion.modifications.conditionals) {
    await item.update({[`system.conditionals.-=${key}`]: null});
  }
  for (const key of infusion.modifications.formulas) {
    await item.update({[`system.formulas.-=${key}`]: null});
  }
  for (const key of infusion.modifications.rollRequests) {
    await item.update({[`system.rollRequests.-=${key}`]: null});
  }
  for (const key of infusion.modifications.againstStatuses) {
    await item.update({[`system.againstStatuses.-=${key}`]: null});
  }

  await item.update(updateData);
  await _clearTags(infusion, item);
  await _clearInfuserPenalties(infusion);
}

async function _runRemoveInfusionMacro(macros, item) {
  for (const command of macros) {
    await runTemporaryMacro(command, item, {target: item});
  }
}

async function _clearTags(infusion, item) {
  const updateData = {system: {}}
  
  const tags = infusion.tags;
  const allInfusions = item.infusions;
  if (tags.attunement && !allInfusions.hasAttunement) {
    updateData.system.properties = {
      attunement: {active: false}
    }
  }

  if (tags.toggle && !allInfusions.hasToggle) {
    updateData.system.toggle = {
      toggleable: false,
      toggledOn: false,
      toggleOnRoll: false
    };
    updateData.system.effectsConfig = {
      linkWithToggle: false
    }
  }
  
  if ((tags.charges || tags.limited) && !allInfusions.hasCharges) {
    updateData.system.costs = {
      charges: {
        current: null,
        max: null,
        maxChargesFormula: null,
        overriden: false,
        rechargeFormula: "",
        rechargeDice: "",
        requiredTotalMinimum: null,
        reset: "",
        showAsResource: false,
        subtract: 1,
        deleteOnZero: false,
      }
    };
  }

  await item.update(updateData);
}

async function _clearInfuserPenalties(infusion) {
  if (!infusion.infuserUuid) return;

  const actor = await fromUuid(infusion.infuserUuid);
  if (!actor) return;
  const infusionManaPentalty = actor.system.resources.mana.infusions;
  await actor.gmUpdate({["system.resources.mana.infusions"]: infusionManaPentalty - infusion.power});
}