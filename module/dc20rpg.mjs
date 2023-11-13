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
import { checkProficiencies, addUniqueItemToActor, removeUniqueItemFromActor } from "./helpers/actors/itemsOnActor.mjs";
import { addObserverToCustomResources } from "./helpers/actors/resources.mjs";
import { createItemMacro, rollItemWithName } from "./helpers/macros.mjs";
import { getSelectedTokens, preConfigurePrototype, updateActorHp } from "./helpers/actors/tokens.mjs";
import { addEffectToActor, deleteEffectWithName, effectWithNameExists } from "./helpers/effects.mjs";
import { registerDC20Statues } from "./statusEffects/statusEffects.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {
  
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    rollItemMacro,
    addEffectToActor,
    effectWithNameExists,
    deleteEffectWithName,
    getSelectedTokens
  };
  
  CONFIG.statusEffects = registerDC20Statues();
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
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if(data.type === "Item") createItemMacro(data, slot);
    if(data.type === "Macro") {
      let macro = game.macros.find(macro => (macro.uuid === data.uuid));
      if(macro) game.user.assignHotbarMacro(macro, slot);
    }
    return false; 
  });
});

/* -------------------------------------------- */
/*  Render Chat Message Hook                    */
/* -------------------------------------------- */
Hooks.on("renderChatMessage", (app, html, data) => {initChatMessage(html)});
Hooks.on('renderActorSheet', (app, html, data) => addObserverToCustomResources(html));

Hooks.on("createActor", (actor) => {preConfigurePrototype(actor)})
Hooks.on("createItem", (item) => addUniqueItemToActor(item));
Hooks.on("preDeleteItem", (item) => removeUniqueItemFromActor(item));
Hooks.on('createItem', (item) => checkProficiencies(item));
Hooks.on('updateItem', (item) => checkProficiencies(item));

Hooks.on("preUpdateActor", (actor, updateData) => updateActorHp(actor, updateData));

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemName) {
  rollItemWithName(itemName);
}