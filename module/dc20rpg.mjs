// Import document classes.
import { DC20RpgActor } from "./documents/actor.mjs";
import { DC20RpgItem } from "./documents/item.mjs";
// Import sheet classes.
import { DC20RpgActorSheet } from "./sheets/actor-sheet.mjs";
import { DC20RpgItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/handlebars/handlebarsTemplates.mjs";
import { DC20RPG } from "./helpers/config.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars/handlebarsHelpers.mjs";
import { initChatMessage } from "./chat/chat.mjs";
import { addClassToActor, removeClassFromActor, checkProficiencies } from "./helpers/actors/itemsOnActor.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.DC20RPG = DC20RPG;

  // Define custom Document classes
  CONFIG.Actor.documentClass = DC20RpgActor;
  CONFIG.Item.documentClass = DC20RpgItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dc20rpg", DC20RpgActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dc20rpg", DC20RpgItemSheet, { makeDefault: true });

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Preload Handlebars templates
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once("ready", async function() {
  /* -------------------------------------------- */
  /*  Hotbar Macros                               */
  /* -------------------------------------------- */
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Render Chat Message Hook                    */
/* -------------------------------------------- */
Hooks.on("renderChatMessage", (app, html, data) => {initChatMessage(html)});

Hooks.on("createItem", (item) => addClassToActor(item));
Hooks.on("preDeleteItem", (item) => removeClassFromActor(item));
Hooks.on('createItem', (item) => checkProficiencies(item));
Hooks.on('updateItem', (item) => checkProficiencies(item));

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.dc20rpg.rollItemMacro("${data.uuid}");`;
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

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.roll();
  });
}