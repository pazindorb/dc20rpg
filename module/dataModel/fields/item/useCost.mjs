import { runTemporaryItemMacro } from "../../../helpers/macros.mjs";
import { evaluateFormula } from "../../../helpers/rolls.mjs";

export default class UseCostFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const initNull = { required: true, nullable: true, integer: true, initial: null };

    fields = {
      resources: new f.SchemaField({
        actionPoint: new f.NumberField(initNull), // TODO backward compatibilty remove as part of 0.10.0 update
        ap: new f.NumberField(initNull),
        stamina: new f.NumberField(initNull),
        mana: new f.NumberField(initNull),
        health: new f.NumberField(initNull),
        grit: new f.NumberField(initNull),
        restPoints: new f.NumberField(initNull),
        custom: new f.ObjectField({required: true}),
      }),
      charges: new f.SchemaField({
        current: new f.NumberField(initNull),
        max: new f.NumberField(initNull),
        maxChargesFormula: new f.StringField({required: true, nullable: true, initial: null}),
        overriden: new f.BooleanField({required: true, initial: false}),
        rechargeFormula: new f.StringField({required: true, nullable: false, initial: ""}),
        rechargeDice: new f.StringField({required: true, nullable: false, initial: ""}),
        requiredTotalMinimum: new f.NumberField(initNull),
        reset: new f.StringField({required: true, nullable: false, initial: ""}),
        showAsResource: new f.BooleanField({required: true, initial: false}),
        subtract: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      }),
      // TODO backward compatibilty remove as part of 0.10.0 update
      otherItem: new f.SchemaField({
        itemId: new f.StringField({required: true, initial: ""}),
        amountConsumed: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
        consumeCharge: new f.BooleanField({required: true, initial: true}),
      })
    }
    super(fields, options);
  }
}

export function enhanceUseCostObject(item) {
  item.use.hasCharges = !!item.system.costs.charges.max;
  item.use.canRemoveCharge = (amount) => _canRemoveCharge(amount, item);
  item.use.removeCharge = async (amount) => await _removeCharge(amount, item);
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

async function _removeCharge(amount, item) {
  if (!amount) return;
  amount = parseInt(amount);

  const charges = item.system.costs.charges;
  let changed =  Math.max(charges.current - amount, 0);
  await item.update({["system.costs.charges.current"] : changed});
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
  _addToResources(cost, "ap", item.system.rollMenu.gritCost, actor);

  // Collect cost from Enhancements
  for (const enhancement of item.activeEnhancements.values()) {
    // Collect resources
    for (let [key, value] of Object.entries(enhancement.resources)) {
      _addToResources(cost, key, value * enhancement.number, actor);
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
  if (actor && actor.flags.dc20rpg.actionHeld.isHeld) {
    delete cost.resources.ap;
  }

  return cost;
}

function _addToResources(cost, key, value, actor) {
  if (key === "actionPoint") key = "ap"; //TODO backward compatibilty remove as part of 0.10.0 update
  if (key === "custom") {
    for (const [customKey, customRes] of Object.entries(value)) {
      _addToResources(cost, customKey, customRes.value, actor);
    }
    return;
  }

  // Skip if actor doesn't have that resource at all
  if (actor && !actor.resources.hasResource(key)) return;
  if (value == null) return;
  
  if (cost.resources[key]) {
    cost.resources[key] += value;
  }
  else {
    cost.resources[key] = value;
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
  if (item.type === "consumable" && item.use.canConsumeQuantity(1)) {
    cost.quantity[item.id] = 1;
  }

  const actor = item.actor;
  if (!actor) return;
  const ammo = actor.items.get(item.ammoId);
  if (ammo && ammo.use.canConsumeQuantity(1)) {
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

  // Held action ignore AP cost as it was subtracted before
  if (actor.flags.dc20rpg.actionHeld?.rollsHeldAction) {
    cost.resources.ap = null;
  }
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
    await item.use.removeCharge(amount);
  }
}

async function _consumeQuantities(cost, parentItem, actor) {
  for (const [itemId, amount] of Object.entries(cost.quantity)) {
    const item = parentItem.id === itemId ? parentItem : actor.items.get(itemId);
    await item.use.consumeQuantity(amount);
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
    const resources = item.system.costs.resources;
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