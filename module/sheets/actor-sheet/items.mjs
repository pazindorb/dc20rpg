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
    source.update({["system.tableName"]: dropTarget.dataset.tableName});
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
    source.update({["system.tableName"]: target.system.tableName});
  }

  // Perform the update
  return actor.updateEmbeddedDocuments("Item", updateData);
}

export async function prepareItemsForCharacter(context, actor) {
  const headersOrdering = context.flags.dc20rpg.headersOrdering;

  const inventory = _prepareTableHeadersInOrder(headersOrdering.inventory);
  const features = _prepareTableHeadersInOrder(headersOrdering.features);
  const techniques = _prepareTableHeadersInOrder(headersOrdering.techniques);
  const spells = _prepareTableHeadersInOrder(headersOrdering.spells);

  for (const item of context.items) {
    item.img = item.img || DEFAULT_TOKEN;
    const tableName = item.system.tableName;

    if (['weapon', 'equipment', 'consumable', 'loot', 'tool'].includes(item.type)) {
      if (!inventory[tableName]) _addNewTableHeader(actor, tableName, "inventory");
      else inventory[tableName].items[item.id] = item;
    }
    else if (item.type === 'feature') {
      if (!features[tableName]) _addNewTableHeader(actor, tableName, "features");
      else features[tableName].items[item.id] = item;
    }
    else if (item.type === 'technique') {
      if (!techniques[tableName]) _addNewTableHeader(actor, tableName, "techniques");
      else  techniques[tableName].items[item.id] = item;
    }
    else if (item.type === 'spell') {
      if (!spells[tableName]) _addNewTableHeader(actor, tableName, "spells");
      else spells[tableName].items[item.id] = item;
    }
    else if (item.type === 'class') context.class = item;
    else if (item.type === 'subclass') context.subclass = item;
    else if (item.type === 'ancestry') context.ancestry = item;
    else if (item.type === 'background') context.background = item;

    _prepareItemUsageCosts(item, actor);
    _prepareItemEnhancements(item);
  }

  // Remove empty tableNames (except for core that should stay) and assign
  context.inventory = _enhanceItemTab(inventory, ["Weapons", "Equipment", "Consumables", "Tools", "Loot"]);
  context.features = _enhanceItemTab(features, ["Features"]);
  context.techniques = _enhanceItemTab(techniques, ["Techniques"]);
  context.spells = _enhanceItemTab(spells, ["Spells"]);
}

export async function prepareItemsForNpc(context) {
  const headersOrdering = context.flags.dc20rpg.headersOrdering;
  const items = this._prepareTableHeadersInOrder(headersOrdering.items);

  for (const item of context.items) {
    item.img = item.img || DEFAULT_TOKEN;
    let tableName = capitalize(item.system.tableName);

    if (["Weapons", "Equipment", "Consumables", "Tools", "Loot"].includes(tableName)) {
      const itemCosts = item.system.costs;
      if (itemCosts && itemCosts.resources.actionPoint !== null) items["Actions"].items[item.id] = item;
      else items["Inventory"].items[item.id] = item;
    }
    else {
      if (!items[tableName]) _addNewTableHeader(this.actor, tableName, "items");
      else items[tableName].items[item.id] = item;
    }

    _prepareItemUsageCosts(item);
    _prepareItemEnhancements(item);
  }
  // Remove empty tableNames (except for core that should stay) and assign
  context.items = enhanceItemTab(items, ["Actions", "Features", "Techniques", "Inventory", "Spells"]);
}

function _prepareTableHeadersInOrder(order) {
  // Sort
  let sortedTableHeaders = Object.entries(order).sort((a, b) => a[1] - b[1]);

  let tableHeadersInOrder = {};
  sortedTableHeaders.forEach(tableName => {
    tableHeadersInOrder[tableName[0]] = {
      items: {},
      siblings: {}
    };
  })

  return tableHeadersInOrder;
}

function _prepareItemUsageCosts(item, actor) {
  item.usageCosts = getItemUsageCosts(item, actor);
}

function _prepareItemEnhancements(item) {
  // Collect item Enhancements
  let enhancements = item.system.enhancements;
  if (enhancements) Object.values(enhancements).forEach(enh => enh.itemId = item._id);

  // If selected collect Used Weapon Enhancements 
  const usesWeapon = item.system.usesWeapon;
  if (usesWeapon) {
    const weapon = this.actor.items.get(usesWeapon);
    if (weapon) {
      let weaponEnh = weapon.system.enhancements;
      if (weaponEnh) Object.values(weaponEnh).forEach(enh => {
        enh.itemId = usesWeapon
        enh.fromWeapon = true;
      });
      enhancements = {
        ...enhancements,
        ...weaponEnh
      }
    }
  }

  if (!enhancements) item.enhancements = {};
  else item.enhancements = enhancements;
}

function _addNewTableHeader(actor, headerName, tab) {
  const headersOrdering = actor.flags.dc20rpg.headersOrdering;
  const currentTabOrdering = headersOrdering[tab];

  const sortedHeaders = Object.entries(currentTabOrdering).sort((a, b) => a[1] - b[1]);
  const lastNumberInOrder = sortedHeaders[sortedHeaders.length - 1][1];

  headersOrdering[tab] = {
    ...currentTabOrdering, 
    [headerName]: lastNumberInOrder + 1
  }

  actor.update({[`flags.dc20rpg.headersOrdering`]: headersOrdering });
}

function _enhanceItemTab(tab, coreHeaders) {
  let headersAsEntries = _hideEmptyTableHeaders(tab, coreHeaders);
  _addSiblings(headersAsEntries);
  return Object.fromEntries(headersAsEntries);
}

function _hideEmptyTableHeaders(tab, coreHeaders) {
  let filteredEntries = Object.entries(tab).filter(
                header => Object.keys(header[1].items).length !== 0 
                      ? true : 
                      coreHeaders.includes(header[0])
                );
  return filteredEntries;
}

function _addSiblings(headersAsEntries) {
  for(let i = 0; i < headersAsEntries.length; i++) {
    let siblingBefore = headersAsEntries[i-1] ? headersAsEntries[i-1][0] : undefined;
    let siblingAfter = headersAsEntries[i+1] ? headersAsEntries[i+1][0] : undefined;

    headersAsEntries[i][1].siblings = {
      before: siblingBefore,
      after: siblingAfter
    }
  }
  return headersAsEntries;
}