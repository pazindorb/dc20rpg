import { rollItemToChat } from "../chat/chat.mjs";
import { handleStandardRoll } from "./actors/rollsFromActor.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create roll macro for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.dc20rpg.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "dc20rpg.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

export async function rollItemFromUuid(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };

  // Load the item from the uuid.
  let item = null;
  try {
    item = await Item.fromDropData(dropData);
  } catch (error) {
    return ui.notifications.warn(`Could not find item. You may need to delete and recreate this macro.`);
  }

  if (!item || !item.parent) {
    const itemName = item?.name ?? itemUuid;
    return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
  }

  const evaulatedData = await handleStandardRoll(item.parent, item);
  rollItemToChat(evaulatedData, item, actor);
  return evaulatedData.roll;
}

export async function rollItemWithName(itemName) {
  const seletedTokens = await getSelectedTokens();
  if (!seletedTokens) return ui.notifications.warn(`No selected or assigned actor could be found to target with macro.`);

  
  for (let token of seletedTokens) {
    const actor = await token.actor;
    const item = await actor.items.getName(itemName);
    if (!item) {
      ui.notifications.warn(`Actor '${actor.name}' does not own item named '${itemName}'.`);
      continue;
    }

    const evaulatedData = await handleStandardRoll(actor, item);
    rollItemToChat(evaulatedData, item, actor);
  }
}