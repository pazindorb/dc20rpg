import { getSimplePopup } from "../../dialogs/simple-popup.mjs";
import { calculateItemsCost, currencyTransfer } from "../../dialogs/transfer.mjs";
import { evaluateFormula } from "../rolls.mjs";
import { createItemOnActor, deleteItemFromActor, handleStackableItem } from "./itemsOnActor.mjs";

export async function generateRandomLootTable(storage) {
  const numberOfItems = storage.system.randomLoot.numberOfItems;
  if (numberOfItems >= storage.items.size) return;

  const rollDice = storage.system.randomLoot.rollDice;
  const formula = `d${rollDice}`;
  const items = _prepareItems(storage.items, rollDice);

  const itemsToStay = new Set();
  while(itemsToStay.size < numberOfItems) {
    const roll = await evaluateFormula(formula, {}, true);
    const index = roll.total;
    const item = items.get(index);
    if (item) itemsToStay.add(item._id);
  }

  const allItems = storage.items.map(item => item._id);
  const itemsToRemove = new Set(allItems).difference(itemsToStay);
  await storage.deleteEmbeddedDocuments("Item", Array.from(itemsToRemove));
}

function _prepareItems(items, maxValue) {
  const itemMap = new Map();

  for (const item of items) {
    const lootRoll = item.system.lootRoll;
    if (lootRoll <= maxValue) {
      itemMap.set(lootRoll, item);   
    }
  }

  // Fill the gaps
  let currentItem = null;
  for (let i = maxValue; i > 0; i--) {
    if (itemMap.has(i)) currentItem = itemMap.get(i);
    else itemMap.set(i, currentItem);
  }
  return itemMap;
}

export async function itemTransfer(event, data, actor) {
    const originalItem = await fromUuid(data.uuid);

    // Storage accepts only inventory items
    if (!CONFIG.DC20RPG.DROPDOWN_DATA.inventoryTypes[originalItem.type]) {
      ui.notifications.error("Storage actor can only store: 'weapons', 'equipment', 'consumables' and 'loot'");
      return;
    }

    const quantity = originalItem.system.quantity;
    if (quantity < 0) {
      ui.notifications.error("You cannot transfer item with less then 1 quantity");
      return;
    }
    let stacks = 1;
    if (quantity > 1) {
      const provided = await getSimplePopup("input", {header: "How many stack you want to transfer?"});
      stacks = parseInt(provided) > quantity ? quantity : parseInt(provided);
    }

    const actorFrom = originalItem.actor;
    if (actorFrom.system.storageType === "vendor" || actor.system.storageType === "vendor") {
      const itemData = originalItem.toObject();
      itemData.system.quantity = stacks;
      const traded = await _handleTrade(actorFrom, actor, [itemData]);
      if (!traded) return;
    }

    const stackable = originalItem.system.stackable;
    if (stackable) {
      await handleStackableItem(originalItem, actor, event, true, stacks);
      return;
    }

    const infiniteStock = originalItem.actor.system?.vendor?.infiniteStock;
    const itemData = originalItem.toObject();
    await createItemOnActor(actor, itemData);
    if (!infiniteStock) await deleteItemFromActor(originalItem.id, originalItem.actor);
}

async function _handleTrade(vendor, buyer, items) {
  let priceMultiplier = 1;
  if (buyer.system.storageType === "vendor") {
    if (!buyer.system?.vendor?.allowSelling) {
      ui.notifications.error("This vendor cannot buy items.");
      return false;
    }
    priceMultiplier = buyer.system?.vendor?.sellCostPercent/100 || 1;
  }

  const finalCost = calculateItemsCost(items, priceMultiplier);
  const transfered = await currencyTransfer(buyer, vendor, finalCost, true);
  if (!transfered) {
    ui.notifications.error("Not enough currency to transfer");
    return false;
  }
  return true;
}