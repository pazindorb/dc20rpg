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

  // Look for Table Name
  let tableTarget = event.target.parentElement;
  while (tableTarget) {
    if (tableTarget.classList.contains("table-name")) break;
    tableTarget = tableTarget.parentElement;
  }
  if (tableTarget) {
    const tableName = tableTarget.children[0]?.dataset?.tableName;
    if (tableName) source.update({["system.tableName"]: tableName});
  }
  
  // Sort Item
  const itemTarget = event.target.closest("[data-item-id]");
  if (!itemTarget) return;
  const target = items.get(itemTarget.dataset.itemId);

  // Don't sort on yourself
  if ( source.id === target.id ) return;

  // Identify sibling items based on adjacent HTML elements
  const siblings = [];
  for ( let el of itemTarget.parentElement.children ) {
    const siblingId = el.dataset.itemId;
    if ( siblingId && (siblingId !== source.id) ) {
      siblings.push(items.get(el.dataset.itemId));
    } 
  }

  // Perform the sort
  const sortUpdates = foundry.utils.performIntegerSort(source, {target, siblings});
  const updateData = sortUpdates.map(u => {
    const update = u.update;
    update._id = u.target._id;
    return update;
  });
  
  // Perform the update
  return actor.updateEmbeddedDocuments("Item", updateData);
}

export function prepareItemsForCharacter(context, actor) {
  const headersOrdering = context.system.sheetData.header.order;
  if (!headersOrdering) return;

  const inventory = _sortAndPrepareTables(headersOrdering.inventory);
  const features = _sortAndPrepareTables(headersOrdering.features);
  const known = _sortAndPrepareTables(headersOrdering.known);
  const favorites = _sortAndPrepareTables(headersOrdering.favorites);

  const itemChargesAsResources = {};
  const itemQuantityAsResources = {};
  const containers = [];

  for (const item of context.items) {
    const isFavorite = item.flags.dc20rpg.favorite;
    _prepareItemUsageCosts(item);
    prepareItemFormulas(item, actor);
    _prepareItemAsResource(item, itemChargesAsResources, itemQuantityAsResources);
    _checkIfItemIsIdentified(item);
    item.img = item.img || DEFAULT_TOKEN;

    switch (item.type) {
      case 'container':
        containers.push(item);
        break;
      case 'weapon': case 'equipment': case 'consumable': case 'loot':
        _addItemToTable(item, inventory); 
        if (isFavorite) _addItemToTable(item, favorites, "inventory");
        break;
      case 'feature': 
        _addItemToTable(item, features, item.system.featureType); 
        if (isFavorite) _addItemToTable(item, favorites, "feature");
        break;
      case 'maneuver': 
        _addItemToTable(item, known, "maneuver"); 
        if (isFavorite) _addItemToTable(item, favorites, "maneuver");
        break;
      case 'spell': 
        _addItemToTable(item, known, item.system.spellType); 
        if (isFavorite) _addItemToTable(item, favorites, "spell");
        break;
      case 'infusion': 
        _addItemToTable(item, known, "infusion"); 
        if (isFavorite) _addItemToTable(item, favorites, "spell");
        break;
      case 'basicAction': 
        if (isFavorite) _addItemToTable(item, favorites, "basic");
        break;
      
      case 'class': context.class = item; break;
      case 'subclass': context.subclass = item; break;
      case 'ancestry': context.ancestry = item; break;
      case 'background': context.background = item; break;
    }
  }

  const filters = actor.system.sheetData.header.filter;
  context.containers = containers;
  context.inventory = _filterItems(filters.inventory, inventory);
  context.features = _filterItems(filters.features, features);
  context.known = _filterItems(filters.known, known);
  context.favorites = _filterItems(filters.favorites, favorites);
  context.itemChargesAsResources = itemChargesAsResources;
  context.itemQuantityAsResources = itemQuantityAsResources;
}

export function prepareItemsForNpc(context, actor) {
  const headersOrdering = context.system.sheetData.header.order;
  if (!headersOrdering) return;
  const main = _sortAndPrepareTables(headersOrdering.main);

  const itemChargesAsResources = {};
  const itemQuantityAsResources = {};
  const containers = [];

  for (const item of context.items) {
    _prepareItemUsageCosts(item);
    prepareItemFormulas(item, actor);
    _prepareItemAsResource(item, itemChargesAsResources, itemQuantityAsResources);
    item.img = item.img || DEFAULT_TOKEN;

    const hasApCost = item.system.costs?.resources?.ap != null;
    switch (item.type) {
      case 'container':
        containers.push(item);
        break;

      case 'weapon': case 'equipment': case 'consumable': case 'loot':
        if (hasApCost) _addItemToTable(item, main, "action");
        else _addItemToTable(item, main, "inventory");
        break;

      case 'spell': case 'maneuver': case 'feature':
        if (hasApCost) _addItemToTable(item, main, "action");
        else _addItemToTable(item, main, "feature");
        break;

      case 'basicAction': 
        if (item.flags.dc20rpg.favorite) _addItemToTable(item, main, "action");
        break;
    }
  }
 
  context.containers = containers;
  context.main = _filterItems(actor.system.sheetData.header.filter.main, main);
  context.itemChargesAsResources = itemChargesAsResources;
  context.itemQuantityAsResources = itemQuantityAsResources;
}

export function prepareItemsForStorage(context, actor) {
  const headersOrdering = context.system.sheetData.header.order;
  if (!headersOrdering) return;

  const inventory = _sortAndPrepareTables(headersOrdering.inventory);
  const containers = [];

   for (const item of context.items) {
    _prepareItemUsageCosts(item);
    prepareItemFormulas(item, actor);
    _checkIfItemIsIdentified(item);
    item.img = item.img || DEFAULT_TOKEN;

    switch (item.type) {
      
      case 'weapon': case 'equipment': case 'consumable': case 'loot':
        _addItemToTable(item, inventory); 
        break;
      case 'container':
        containers.push(item);
        break;
    }
   }
   context.containers = containers;
   context.inventory = _filterItems(actor.system.sheetData.header.filter.inventory, inventory);
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

function _prepareItemUsageCosts(item) {
  if (!item.use) return;
  item.useCost = item.use.useCostDisplayData(true);
}

export function prepareItemFormulas(item, actor) {
  let formulas = item.system.formulas;

  // If selected collect Used Weapon Enhancements 
  const usesWeapon = item.system.usesWeapon;
  if (usesWeapon?.weaponAttack) {
    const weapon = actor.items.get(usesWeapon.weaponId);
    if (weapon) {
      formulas = {
        ...formulas,
        ...weapon.system.formulas
      }
    }
  }
  
  if (!formulas) item.formulas = {};
  else item.formulas = formulas;
}

function _addItemToTable(item, headers, fallback) {
  const headerName = item.system.tableName;

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