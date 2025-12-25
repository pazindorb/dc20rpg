import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";

//===============================
//=      TEMPORARY MACROS       =
//===============================
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

export async function runTemporaryItemMacro(item, trigger, actor, additionalFields, preventGlobalCall=false) {
  if (!actor) return;
  await _runTemporaryItemMacro(item, trigger, actor, additionalFields, false);

  // Global Macro
  if (preventGlobalCall) return;
  for (const sourceItem of actor.items) {
    await _runTemporaryItemMacro(sourceItem, trigger, actor, {...additionalFields, triggeringItem: item}, true);
  }
}

async function _runTemporaryItemMacro(item, trigger, actor, additionalFields, global) {
  const macros = item?.system?.macros;
  if (!macros) return;
  
  const triggered = Object.values(macros).filter(macro => macro.trigger === trigger && !macro.disabled && (!!macro.global) === (!!global));
  // For On demand macro you can call only one per item
  if (trigger === "onDemand" && triggered.length > 0) {
    let command = null;
    if (triggered.length === 1) {
      if (triggered[0]?.command) command = triggered[0].command;
    }
    else {
      const options = {};
      for (let i = 0; i < triggered.length; i++) options[i] = triggered[i].title;
      const selected = await SimplePopup.select("Select on Demand Macro you want to trigger", options);
      if (triggered[selected]?.command) command = triggered[selected].command;
    }
    if (command) await runTemporaryMacro(command, item, {item: item, actor: actor, ...additionalFields});
  }
  else {
    for (const macro of triggered) {
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
  const scope = {}
  if (additionalFields) {
    for (const [key, field] of Object.entries(additionalFields)) {
      scope[key] = field;
    }
  }
  macro.params = scope;
  return await macro.execute(scope);
}

//=================================
//=     CUSTOM MACRO TRIGGERS     =
//=================================
export function registerItemMacroTrigger(trigger, displayedLabel) {
  CONFIG.DC20RPG.macroTriggers[trigger] = displayedLabel;
}

//=============================
//=       HOTBAR MACROS       =
//=============================
/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
export async function createItemHotbarDropMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create roll macro for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.dc20rpg.rollItemWithName("${item.name}");`;
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

  return await item.roll();
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

    RollDialog.open(actor, item);
  }
}