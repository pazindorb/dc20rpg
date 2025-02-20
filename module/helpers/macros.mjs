import { promptItemRoll } from "../dialogs/roll-prompt.mjs";
import { rollFromItem } from "./actors/rollsFromActor.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";
import { generateKey } from "./utils.mjs";

export function addItemMacro(item) {
  const macros = item.system.macros;
  const macro = {
    command: "",
    trigger: "",
    disabled: false,
    name: "New Macro",
    title: "",
  }

  let key = "";
  do {
    key = generateKey();
  } while (macros[key]);
  item.update({[`system.macros.${key}`]: macro});
}

export function removeItemMacro(item, key) {
  item.update({ [`system.macros.-=${key}`]: null });
}

export function createTemporaryMacro(command, object, flagsToSet={}) {
  const flags = {
    dc20rpg: {
      temporaryMacro: true,
      ...flagsToSet
    }
  }

  try {
    return new Macro({
      name: object.name,
      type: "script",
      img: object.img,
      command: command,
      flags: flags
    });
  }
  catch(e) {
    ui.notifications.error(`Your macro had validation errors and was reseted, reason: '${e}'`);
    return new Macro({
      name: object.name,
      type: "script",
      img: object.img,
      command: "",
      flags: flags
    });
  }
}

export async function runTemporaryItemMacro(item, trigger, actor, additionalFields) {
  if (!actor) return;
  const macros = item.system.macros;
  if (!macros) return;
  
  for (const macro of Object.values(macros)) {
    if (macro.trigger === trigger && !macro.disabled) {
      const command = macro.command;
      if (command) {
        await runTemporaryMacro(command, item, {item: item, actor: actor, ...additionalFields});
      }
    }
  }
}

export async function runTemporaryMacro(command, object, additionalFields) {
  if (!command) return;
  const macro = createTemporaryMacro(command, object);
  if (additionalFields) {
    for (const [key, field] of Object.entries(additionalFields)) {
      macro[key] = field;
    }
  }
  await macro.execute(macro);
}

//=================================
//=     CUSTOM MACRO TRIGGERS     =
//=================================
export function registerItemMacroTrigger(trigger, displayedLabel) {
  CONFIG.DC20RPG.macroTriggers[trigger] = displayedLabel;
}

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
  const matchingMacros = game.macros.filter(m => (m.name === item.name) && (m.command === command));
  let macro = undefined;
  for (const match of matchingMacros) {
    if (match.isOwner) macro = match;
  }
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

  return await rollFromItem(item._id, item.parent);
}

export async function rollItemWithName(itemName) {
  const seletedTokens = getSelectedTokens();
  if (!seletedTokens) return ui.notifications.warn(`No selected or assigned actor could be found to target with macro.`);

  for (let token of seletedTokens) {
    const actor = await token.actor;
    const item = await actor.items.getName(itemName);
    if (!item) {
      ui.notifications.warn(`Actor '${actor.name}' does not own item named '${itemName}'.`);
      continue;
    }

    promptItemRoll(actor, item);
  }
}