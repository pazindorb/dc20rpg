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
import { registerHandlebarsHelpers } from "./helpers/handlebars/helpers.mjs";
import { addItemToActorInterceptor, modifiyItemOnActorInterceptor, removeItemFromActorInterceptor } from "./helpers/actors/itemsOnActor.mjs";
import { createItemMacro, rollItemWithName } from "./helpers/macros.mjs";
import { getSelectedTokens, preConfigurePrototype, updateActorHp } from "./helpers/actors/tokens.mjs";
import { registerDC20Statues } from "./statusEffects/statusEffects.mjs";
import { effectMacroHelper } from "./helpers/effects.mjs";
import { registerGameSettings } from "./settings/settings.mjs";
import { registerHandlebarsCreators } from "./helpers/handlebars/creators.mjs";
import { preInitializeFlags } from "./documents/actor/actor-flags.mjs";
import { DC20ChatMessage } from "./chat/chat-message.mjs";
import DC20RpgActiveEffect from "./documents/activeEffects.mjs";
import { registerSystemSockets } from "./helpers/sockets.mjs";
import { DC20TokenHUD } from "./token/token-hud.mjs";
import { DC20Token } from "./token/token.mjs";
import { createRollRequestButton } from "./sidebar/roll-request-button.mjs";
import { prepareColorPalete } from "./settings/colors.mjs";
import { DC20RpgActiveEffectConfig } from "./sheets/active-effect-config.mjs";
import { createTokenEffectsTracker } from "./sidebar/token-effects-tracker.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {
  registerGameSettings(game.settings); // Register game settings
  prepareColorPalete(); // Prepare Color Palete

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
  CONFIG.ChatMessage.documentClass = DC20ChatMessage;
  CONFIG.ActiveEffect.documentClass = DC20RpgActiveEffect;
  CONFIG.Token.hudClass = DC20TokenHUD;
  CONFIG.Token.objectClass = DC20Token;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dc20rpg", DC20RpgActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dc20rpg", DC20RpgItemSheet, { makeDefault: true });
  DocumentSheetConfig.unregisterSheet(ActiveEffect, "dc20rpg", ActiveEffectConfig);
  DocumentSheetConfig.registerSheet(ActiveEffect, "dc20rpg", DC20RpgActiveEffectConfig, { makeDefault: true });

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
    return true; 
  });

  registerSystemSockets();
  createTokenEffectsTracker();
  if(game.user.isGM) await createRollRequestButton();
});

Hooks.on("createActor", (actor, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  preConfigurePrototype(actor);
  preInitializeFlags(actor);
});
Hooks.on("createItem", (item, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  addItemToActorInterceptor(item);
});
Hooks.on("updateItem", (item, updateData, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  modifiyItemOnActorInterceptor(item, updateData);
});
Hooks.on("preDeleteItem", (item, options, userID) => {
  if (userID != game.user.id) return; // Check current user is the one that triggered the hook
  removeItemFromActorInterceptor(item);
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