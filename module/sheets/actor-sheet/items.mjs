import { getItemUsageCosts } from "../../helpers/actors/costManipulator.mjs";

export function sortMapOfItems(context, mapOfItems) {  
  const sortedEntries = [...mapOfItems.entries()].sort(([, a], [, b]) => a.sort - b.sort);

  if (!sortedEntries) return mapOfItems; // No entries, map is empty

  sortedEntries.forEach(entry => mapOfItems.delete(entry[0])); // we want to remove all original entries because those are not sorted
  sortedEntries.forEach(entry => mapOfItems.set(entry[0], entry[1])); // we put sorted entries to map
  context.items = mapOfItems;
}

export function onSortItem(event, itemData, actor) {
  // Get the drag source and drop target
  const items = actor.items;
  const source = items.get(itemData._id);

  let dropTarget = event.target.closest("[data-item-id]");

  // We dont want to change tableName if item is sorted on Attacks table
  const itemRow = event.target.closest("[data-item-attack]");
  const isAttack = itemRow ? true : false;

  // if itemId not found we want to check if user doesn't dropped item on table header
  if (!dropTarget) {
    dropTarget = event.target.closest("[data-table-name]"); 
    if (!dropTarget || isAttack) return;
    source.update({["flags.dc20rpg.tableName"]: dropTarget.dataset.tableName});
    return;
  }

  const target = items.get(dropTarget.dataset.itemId);

  // Don't sort on yourself
  if ( source.id === target.id ) return;

  // Identify sibling items based on adjacent HTML elements
  const siblings = [];
  for ( let el of dropTarget.parentElement.children ) {
    const siblingId = el.dataset.itemId;
    if ( siblingId && (siblingId !== source.id) ) {
      siblings.push(items.get(el.dataset.itemId));
    } 
  }

  // Perform the sort
  const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});
  const updateData = sortUpdates.map(u => {
    const update = u.update;
    update._id = u.target._id;
    return update;
  });

  // Change items tableName to targets one, skip this if item was sorted on attack row
  if (!isAttack) {
    source.update({["flags.dc20rpg.tableName"]: target.flags.dc20rpg.tableName});
  }

  // Perform the update
  return actor.updateEmbeddedDocuments("Item", updateData);
}

export function prepareItemsForCharacter(context, actor) {
  const headersOrdering = context.flags.dc20rpg?.headersOrdering;
  if (!headersOrdering) return;

  const inventory = _sortAndPrepareTables(headersOrdering.inventory);
  const features = _sortAndPrepareTables(headersOrdering.features);
  const techniques = _sortAndPrepareTables(headersOrdering.techniques);
  const spells = _sortAndPrepareTables(headersOrdering.spells);
  const favorites = _sortAndPrepareTables(headersOrdering.favorites);

  const itemChargesAsResources = {};
  const itemQuantityAsResources = {};

  for (const item of context.items) {
    const isFavorite = item.flags.dc20rpg.favorite;
    _prepareItemUsageCosts(item, actor);
    prepareItemFormulasAndEnhancements(item, actor);
    _prepareItemAsResource(item, itemChargesAsResources, itemQuantityAsResources);
    _checkIfItemIsIdentified(item);
    item.img = item.img || DEFAULT_TOKEN;

    switch (item.type) {
      case 'weapon': case 'equipment': case 'consumable': case 'loot': case 'tool':
        _addItemToTable(item, inventory); 
        if (isFavorite) _addItemToTable(item, favorites, "inventory");
        break;
      case 'feature': 
        _addItemToTable(item, features, item.system.featureType); 
        if (isFavorite) _addItemToTable(item, favorites, "feature");
        break;
      case 'technique': 
        _addItemToTable(item, techniques, item.system.techniqueType); 
        if (isFavorite) _addItemToTable(item, favorites, "technique");
        break;
      case 'spell': 
        _addItemToTable(item, spells, item.system.spellType); 
        if (isFavorite) _addItemToTable(item, favorites, "spell");
        break;
      
      case 'class': context.class = item; break;
      case 'subclass': context.subclass = item; break;
      case 'ancestry': context.ancestry = item; break;
      case 'background': context.background = item; break;
    }
  }

  context.inventory = _filterItems(actor.flags.headerFilters?.inventory, inventory);
  context.features = _filterItems(actor.flags.headerFilters?.features, features);
  context.techniques = _filterItems(actor.flags.headerFilters?.techniques, techniques);
  context.spells = _filterItems(actor.flags.headerFilters?.spells, spells);
  context.favorites = _filterItems(actor.flags.headerFilters?.favorites, favorites);
  context.itemChargesAsResources = itemChargesAsResources;
  context.itemQuantityAsResources = itemQuantityAsResources;
}

export function prepareItemsForNpc(context, actor) {
  const headersOrdering = context.flags.dc20rpg?.headersOrdering;
  if (!headersOrdering) return;
  const main = _sortAndPrepareTables(headersOrdering.main);

  const itemChargesAsResources = {};
  const itemQuantityAsResources = {};

  for (const item of context.items) {
    _prepareItemUsageCosts(item, actor);
    prepareItemFormulasAndEnhancements(item, actor);
    _prepareItemAsResource(item, itemChargesAsResources, itemQuantityAsResources);
    item.img = item.img || DEFAULT_TOKEN;

    if (["weapon", "equipment", "consumable", "tool", "loot"].includes(item.type)) {
      const itemCosts = item.system.costs;
      if (itemCosts && itemCosts.resources.actionPoint !== null) _addItemToTable(item, main, "action");
      else _addItemToTable(item, main, "inventory");
    }
    else if (["class", "subclass", "ancestry", "background"].includes(item.type)) {} // NPCs shouldn't have those items anyway
    else {
      _addItemToTable(item, main); 
    }
  }
 
  context.main = _filterItems(actor.flags.headerFilters?.main, main);
  context.itemChargesAsResources = itemChargesAsResources;
  context.itemQuantityAsResources = itemQuantityAsResources;
}

export function prepareCompanionTraits(context, actor) {
  let choicePointsSpend = 0;

  const uniqueActive = [];
  const repeatableActive = [];
  const uniqueInactive = [];
  const repeatableInactive = [];

  for (const [key, trait] of Object.entries(actor.system.traits)) {
    trait.key = key;

    if (trait.active > 0) {
      const pointsCost = trait.itemData?.system?.choicePointCost || 1;
      choicePointsSpend += pointsCost * trait.active; // Cost * number of times trait was taken

      if (trait.repeatable) repeatableActive.push(trait);
      else uniqueActive.push(trait);
    }
    else {
      if (trait.repeatable) repeatableInactive.push(trait);
      else uniqueInactive.push(trait);
    }
  } 

  context.traits = {
    uniqueActive: uniqueActive,
    repeatableActive: repeatableActive,
    uniqueInactive: uniqueInactive,
    repeatableInactive: repeatableInactive
  }
  context.choicePointsSpend = choicePointsSpend;
}

function _prepareItemAsResource(item, charages, quantity) {
  _prepareItemChargesAsResource(item, charages);
  _prepareItemQuantityAsResource(item, quantity);
}

function _prepareItemChargesAsResource(item, charages) {
  if (!item.system.costs) return;
  if (!item.system.costs.charges.showAsResource) return;

  const itemCharges = item.system.costs.charges;
  charages[item.id] = {
    img: item.img,
    name: item.name,
    value: itemCharges.current,
    max: itemCharges.max
  }
}

function _prepareItemQuantityAsResource(item, quantity) {
  if (item.type !== "consumable") return;
  if (item.system.quantity === undefined) return;
  if (!item.system.showAsResource) return;

  quantity[item.id] = {
    img: item.img,
    name: item.name,
    quantity: item.system.quantity
  }
}

function _checkIfItemIsIdentified(item) {
  const identified = item.system.statuses ? item.system.statuses.identified : true;
  if (!identified) {
    item.unidefined = true;
    item.name = game.i18n.localize("dc20rpg.item.sheet.unidentified");
    item.system.description = game.i18n.localize("dc20rpg.item.sheet.unidentifiedDescription");
  }
  else {
    item.unidefined = false;
  }
}

function _sortAndPrepareTables(tables) {
  const sorted = Object.entries(tables).sort((a, b) => a[1].order - b[1].order);
  const headers = {};
  
  for(let i = 0; i < sorted.length; i++) {
    const siblingBefore = sorted[i-1] ? sorted[i-1][0] : undefined;
    const siblingAfter = sorted[i+1] ? sorted[i+1][0] : undefined;

    headers[sorted[i][0]] = {
      name: sorted[i][1].name,
      custom: sorted[i][1].custom,
      items: {},
      siblings: {
        before: siblingBefore,
        after: siblingAfter
      }
    };
  }
  return headers;
}

function _prepareItemUsageCosts(item, actor) {
  item.usageCosts = getItemUsageCosts(item, actor);
  _prepareEnhUsageCosts(item);
}

function _prepareEnhUsageCosts(item) {
  const enhancements = item.system.enhancements;
  if (!enhancements) return;

  Object.values(enhancements).forEach(enh => {
    let counter = 0;
    counter += enh.resources.actionPoint || 0;
    counter += enh.resources.stamina || 0;
    counter += enh.resources.mana || 0;
    counter += enh.resources.health || 0;
    enh.enhCosts = counter;
  });
}

export function prepareItemFormulasAndEnhancements(item, actor) {
  // Collect item Enhancements and Formulas
  let enhancements = item.system.enhancements;
  let formulas = item.system.formulas;
  if (enhancements) Object.values(enhancements).forEach(enh => enh.itemId = item._id);

  // If selected collect Used Weapon Enhancements 
  const usesWeapon = item.system.usesWeapon;
  if (usesWeapon?.weaponAttack) {
    const weapon = actor.items.get(usesWeapon.weaponId);
    if (weapon) {
      const weaponEnh = weapon.system.enhancements;
      const weaponFormulas = weapon.system.formulas;
      if (weaponEnh) Object.values(weaponEnh).forEach(enh => {
        enh.itemId = usesWeapon.weaponId
        enh.fromWeapon = true;
      });
      enhancements = {
        ...enhancements,
        ...weaponEnh
      }
      formulas = {
        ...weaponFormulas,
        ...formulas
      }
    }
  }

  if (!enhancements) item.enhancements = {};
  else item.enhancements = enhancements;

  if (!formulas) item.formulas = {};
  else item.formulas = formulas;
}

function _addItemToTable(item, headers, fallback) {
  const headerName = item.flags.dc20rpg.tableName;

  if (!headerName || !headers[headerName]) {
    if (headers[fallback]) headers[fallback].items[item.id] = item;
    else headers[item.type].items[item.id] = item;
  }
  else headers[headerName].items[item.id] = item;
}

function _filterItems(filter, items) {
  if (!filter) return items;
  
  const tableKeys = Object.keys(items);
  for (const table of tableKeys) {
    let itemEntries = Object.entries(items[table].items);
    itemEntries = itemEntries.filter(([key, item]) => item.name.toLowerCase().includes(filter.toLowerCase()));
    items[table].items = Object.fromEntries(itemEntries);
  }
  return items;
}