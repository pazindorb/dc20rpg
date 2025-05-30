import { evaluateFormula } from "../rolls.mjs";

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
