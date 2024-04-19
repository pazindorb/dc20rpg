// Import document classes.
import { DC20RpgActor } from "./documents/actor.mjs";
import { DC20RpgItem } from "./documents/item.mjs";
import { DC20RpgCombatant } from "./documents/combatant.mjs";
import { DC20RpgCombat } from "./documents/combat.mjs";
// Import sheet classes.
import { DC20RpgActorSheet } from "./sheets/actor-sheet.mjs";
import { DC20RpgItemSheet } from "./sheets/item-sheet.mjs";
import { DC20RpgCombatTracker } from "./sidebar/combat-tracker.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/handlebars/templates.mjs";
import { DC20RPG } from "./helpers/config.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars/handlebarsHelpers.mjs";
import { initChatMessage } from "./chat/chat.mjs";
import { checkProficiencies, addUniqueItemToActor, removeUniqueItemFromActor } from "./helpers/actors/itemsOnActor.mjs";
import { addObserverToCustomResources } from "./helpers/actors/resources.mjs";
import { createItemMacro, rollItemWithName } from "./helpers/macros.mjs";
import { getSelectedTokens, preConfigurePrototype, updateActorHp } from "./helpers/actors/tokens.mjs";
import { registerDC20Statues } from "./statusEffects/statusEffects.mjs";
import { effectMacroHelper } from "./helpers/effects.mjs";
import { registerGameSettings } from "./settings/settings.mjs";
import { registerHandlebarsCreators } from "./helpers/handlebars/creators.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {
  
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    DC20RpgCombatant,
    rollItemMacro,
    getSelectedTokens,
    effectMacroHelper
  };
  
  CONFIG.statusEffects = registerDC20Statues();
  // Add custom constants for configuration.
  CONFIG.DC20RPG = DC20RPG;

  // Define custom Document classes
  CONFIG.Actor.documentClass = DC20RpgActor;
  CONFIG.Item.documentClass = DC20RpgItem;
  CONFIG.Combatant.documentClass  = DC20RpgCombatant;
  CONFIG.Combat.documentClass = DC20RpgCombat;
  CONFIG.ui.combat = DC20RpgCombatTracker;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dc20rpg", DC20RpgActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dc20rpg", DC20RpgItemSheet, { makeDefault: true });

  // Register Handlebars helpers and creators
  registerHandlebarsHelpers();
  registerHandlebarsCreators();

  // Preload Handlebars templates
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once("ready", async function() {
  // Register game settings
  registerGameSettings(game.settings);

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
Hooks.on("renderChatMessage", (message, html, data) => initChatMessage(message, html, data));
Hooks.on('renderActorSheet', (app, html, data) => addObserverToCustomResources(html));

Hooks.on("createActor", (actor, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  preConfigurePrototype(actor)
});
Hooks.on("createItem", (item, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  addUniqueItemToActor(item);
  checkProficiencies(item);
});
Hooks.on("updateItem", (item, updateData, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  checkProficiencies(item);
});
Hooks.on("preDeleteItem", (item, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  removeUniqueItemFromActor(item);
});
Hooks.on("preUpdateActor", (actor, updateData) => updateActorHp(actor, updateData));

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemName) {
  rollItemWithName(itemName);
}