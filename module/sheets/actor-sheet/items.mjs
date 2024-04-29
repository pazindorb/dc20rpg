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

export async function prepareItemsForCharacter(context, actor) {
  const headersOrdering = context.flags.dc20rpg.headersOrdering;

  const inventory = _sortAndPrepareTables(headersOrdering.inventory);
  const features = _sortAndPrepareTables(headersOrdering.features);
  const techniques = _sortAndPrepareTables(headersOrdering.techniques);
  const spells = _sortAndPrepareTables(headersOrdering.spells);

  for (const item of context.items) {
    _prepareItemUsageCosts(item, actor);
    _prepareItemEnhancements(item, actor);
    item.img = item.img || DEFAULT_TOKEN;

    switch (item.type) {
      case 'weapon': case 'equipment': case 'consumable': case 'loot': case 'tool':
        _addItemToTable(item, inventory); break;
      case 'feature': _addItemToTable(item, features, item.system.featureType); break;
      case 'technique': _addItemToTable(item, techniques, item.system.techniqueType); break;
      case 'spell': _addItemToTable(item, spells, item.system.spellType); break;
      
      case 'class': context.class = item; break;
      case 'subclass': context.subclass = item; break;
      case 'ancestry': context.ancestry = item; break;
      case 'background': context.background = item; break;
    }
  }

  context.inventory = inventory;
  context.features = features;
  context.techniques = techniques;
  context.spells = spells;
}

export async function prepareItemsForNpc(context) {
  const headersOrdering = context.flags.dc20rpg.headersOrdering;
  const items = _prepareTableHeadersInOrder(headersOrdering.items);

  for (const item of context.items) {
    item.img = item.img || DEFAULT_TOKEN;
    const tableName = item.flags.dc20rpg.tableName;

    if (["Weapons", "Equipment", "Consumables", "Tools", "Loot"].includes(tableName)) {
      const itemCosts = item.system.costs;
      if (itemCosts && itemCosts.resources.actionPoint !== null) items["Actions"].items[item.id] = item;
      else items["Inventory"].items[item.id] = item;
    }
    else {
      if (!items[tableName]) _addNewTableHeader(actor, tableName, "items");
      else items[tableName].items[item.id] = item;
    }

    _prepareItemUsageCosts(item, actor);
    _prepareItemEnhancements(item, actor);
  }
  // Remove empty tableNames (except for core that should stay) and assign
  context.items = enhanceItemTab(items, ["Actions", "Features", "Techniques", "Inventory", "Spells"]);
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

function _prepareItemEnhancements(item, actor) {
  // Collect item Enhancements
  let enhancements = item.system.enhancements;
  if (enhancements) Object.values(enhancements).forEach(enh => enh.itemId = item._id);

  // If selected collect Used Weapon Enhancements 
  const usesWeapon = item.system.usesWeapon;
  if (usesWeapon) {
    const weapon = actor.items.get(usesWeapon);
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

function _addItemToTable(item, headers, fallback) {
  const headerName = item.flags.dc20rpg.tableName;

  if (!headerName || !headers[headerName]) {
    if (headers[fallback]) headers[fallback].items[item.id] = item;
    else headers[item.type].items[item.id] = item;
  }
  else headers[headerName].items[item.id] = item;
}