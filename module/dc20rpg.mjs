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
import { DC20RPG, initDC20Config } from "./helpers/config.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars/helpers.mjs";
import { createItemMacro, rollItemWithName, runCustomTriggerMacro } from "./helpers/macros.mjs";
import { getSelectedTokens } from "./helpers/actors/tokens.mjs";
import { registerDC20Statues } from "./statusEffects/statusEffects.mjs";
import { createEffectOn, createOrDeleteEffect, deleteEffectFrom, getEffectById, getEffectByKey, getEffectByName, toggleEffectOn } from "./helpers/effects.mjs";
import { registerGameSettings } from "./settings/settings.mjs";
import { registerHandlebarsCreators } from "./helpers/handlebars/creators.mjs";
import { DC20ChatMessage, sendDescriptionToChat } from "./chat/chat-message.mjs";
import DC20RpgActiveEffect from "./documents/activeEffects.mjs";
import { emitSystemEvent, registerSystemSockets, responseListener } from "./helpers/sockets.mjs";
import { DC20RpgTokenHUD } from "./placeable-objects/token-hud.mjs";
import { DC20RpgToken } from "./placeable-objects/token.mjs";
import { prepareColorPalette } from "./settings/colors.mjs";
import { DC20RpgActiveEffectConfig } from "./sheets/active-effect-config.mjs";
import { createTokenEffectsTracker } from "./sidebar/token-effects-tracker.mjs";
import { forceRunMigration, runMigrationCheck, testMigration } from "./settings/migrationRunner.mjs";
import { DC20CharacterData, DC20CompanionData, DC20NpcData } from "./dataModel/actorData.mjs";
import * as itemDM from "./dataModel/itemData.mjs";
import { characterWizardButton } from "./sidebar/actor-directory.mjs";
import { DC20RpgTokenDocument } from "./documents/tokenDoc.mjs";
import { promptItemRoll, promptRoll, promptRollToOtherPlayer } from "./dialogs/roll-prompt.mjs";
import { compendiumBrowserButton } from "./sidebar/compendium-directory.mjs";
import { DC20RpgMacroConfig } from "./sheets/macro-config.mjs";
import { getSimplePopup, sendSimplePopupToUsers } from "./dialogs/simple-popup.mjs";
import DC20RpgMeasuredTemplate from "./placeable-objects/measuredTemplate.mjs";
import { makeMoveAction, prepareHelpAction } from "./helpers/actors/actions.mjs";
import { createRestDialog } from "./dialogs/rest.mjs";
import { createGmToolsMenu } from "./sidebar/gm-tools-menu.mjs";
import { reenableEventsOn, registerEventReenableTrigger, registerEventTrigger, registerEventType, runEventsFor } from "./helpers/actors/events.mjs";
import { DC20RpgTokenConfig } from "./sheets/token-config.mjs";
import { expandEnrichHTML, registerGlobalInlineRollListener } from "./helpers/inlineRolls.mjs";
import { getItemFromActorByKey } from "./helpers/actors/itemsOnActor.mjs";
import { addStatusWithIdToActor, doomedToggle, exhaustionToggle, getStatusWithId, hasStatusWithId, removeStatusWithIdFromActor } from "./statusEffects/statusUtils.mjs";
import { canSubtractBasicResource, canSubtractCustomResource, regainBasicResource, regainCustomResource, subtractAP, subtractBasicResource, subtractCustomResource } from "./helpers/actors/costManipulator.mjs";
import { getActiveActorOwners } from "./helpers/users.mjs";
import { calculateForTarget, tokenToTarget } from "./helpers/targets.mjs";
import { applyDamage, applyHealing } from "./helpers/actors/resources.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {
  registerGameSettings(game.settings); // Register game settings
  prepareColorPalette(); // Prepare Color Palette

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.dc20rpg = {
    DC20RpgActor,
    DC20RpgItem,
    DC20RpgCombatant,
    DC20RpgMeasuredTemplate,
    rollItemMacro,
    forceRunMigration,
    effects: {
      createEffectOn,
      deleteEffectFrom,
      getEffectByName,
      getEffectById,
      getEffectByKey,
      toggleEffectOn,
      createOrDeleteEffect,
      doomedToggle,
      exhaustionToggle
    },
    statuses: {
      hasStatusWithId,
      getStatusWithId,
      addStatusWithIdToActor,
      removeStatusWithIdFromActor
    },
    resources: {
      regainBasicResource,
      regainCustomResource,
      subtractBasicResource,
      subtractCustomResource,
      canSubtractBasicResource,
      canSubtractCustomResource,
      subtractAP,
    },
    tools: {
      getSelectedTokens,
      getItemFromActorByKey,
      promptRoll,
      promptItemRoll,
      promptRollToOtherPlayer,
      getSimplePopup,
      sendSimplePopupToUsers,
      getActiveActorOwners,
      tokenToTarget,
      calculateForTarget,
      applyDamage,
      applyHealing,
      makeMoveAction,
      prepareHelpAction,
      createRestDialog,
      runCustomTriggerMacro,
      sendDescriptionToChat
    },
    events: {
      runEventsFor,
      reenableEventsOn,
      registerEventTrigger,
      registerEventType,
      registerEventReenableTrigger
    }
  };
  game.dc20rpg.compendiumBrowser = {
    hideItems: new Set(),
    hideActors: new Set()
  }; 
  
  CONFIG.DC20RPG = DC20RPG;
  initDC20Config();
  CONFIG.DC20Events = {};
  CONFIG.statusEffects = registerDC20Statues();
  CONFIG.specialStatusEffects.BLIND = "blinded";

  // Define custom Document classes
  CONFIG.Actor.documentClass = DC20RpgActor;
  CONFIG.Item.documentClass = DC20RpgItem;
  CONFIG.Combatant.documentClass  = DC20RpgCombatant;
  CONFIG.Combat.documentClass = DC20RpgCombat;
  CONFIG.ui.combat = DC20RpgCombatTracker;
  CONFIG.ChatMessage.documentClass = DC20ChatMessage;
  CONFIG.ActiveEffect.documentClass = DC20RpgActiveEffect;
  CONFIG.ActiveEffect.legacyTransferral = false;
  CONFIG.Token.documentClass = DC20RpgTokenDocument;
  CONFIG.Token.hudClass = DC20RpgTokenHUD;
  CONFIG.Token.objectClass = DC20RpgToken;
  CONFIG.MeasuredTemplate.objectClass = DC20RpgMeasuredTemplate;

  // Register data models
  CONFIG.Actor.dataModels.character = DC20CharacterData;
  CONFIG.Actor.dataModels.npc = DC20NpcData;
  CONFIG.Actor.dataModels.companion = DC20CompanionData;
  CONFIG.Item.dataModels.basicAction = itemDM.DC20BasicActionData
  CONFIG.Item.dataModels.weapon = itemDM.DC20WeaponData;
  CONFIG.Item.dataModels.equipment = itemDM.DC20EquipmentData;
  CONFIG.Item.dataModels.consumable = itemDM.DC20ConsumableData;
  CONFIG.Item.dataModels.loot = itemDM.DC20LootData;
  CONFIG.Item.dataModels.feature = itemDM.DC20FeatureData;
  CONFIG.Item.dataModels.technique = itemDM.DC20TechniqueData;
  CONFIG.Item.dataModels.spell = itemDM.DC20SpellData;
  CONFIG.Item.dataModels.class = itemDM.DC20ClassData;
  CONFIG.Item.dataModels.subclass = itemDM.DC20SubclassData;
  CONFIG.Item.dataModels.ancestry = itemDM.DC20AncestryData;
  CONFIG.Item.dataModels.background = itemDM.DC20BackgroundData;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dc20rpg", DC20RpgActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("dc20rpg", DC20RpgItemSheet, { makeDefault: true });
  DocumentSheetConfig.unregisterSheet(ActiveEffect, "dc20rpg", ActiveEffectConfig);
  DocumentSheetConfig.registerSheet(ActiveEffect, "dc20rpg", DC20RpgActiveEffectConfig, { makeDefault: true });
  DocumentSheetConfig.unregisterSheet(Macro, "dc20rpg", MacroConfig);
  DocumentSheetConfig.registerSheet(Macro, "dc20rpg", DC20RpgMacroConfig, { makeDefault: true });
  DocumentSheetConfig.unregisterSheet(TokenDocument, "dc20rpg", TokenConfig);
  DocumentSheetConfig.registerSheet(TokenDocument, "dc20rpg", DC20RpgTokenConfig, { makeDefault: true });

  // Register Handlebars helpers and creators
  registerHandlebarsHelpers();
  registerHandlebarsCreators();

  // Register extended enrichHTML method
  TextEditor.enrichHTML = expandEnrichHTML(TextEditor.enrichHTML);
  registerGlobalInlineRollListener();

  // Preload Handlebars templates
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */
Hooks.once("ready", async function() {
  // await runMigrationCheck();
  // await testMigration("0.8.5", "0.9.0");

  /* -------------------------------------------- */
  /*  Hotbar Macros                               */
  /* -------------------------------------------- */
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type === "Item") {
      createItemMacro(data, slot);
      return false;
    }
    if (data.type === "Macro") {
      let macro = game.macros.find(macro => (macro.uuid === data.uuid));
      if(macro) game.user.assignHotbarMacro(macro, slot);
    }
    return true; 
  });

  registerSystemSockets();
  createTokenEffectsTracker();

  if(game.user.isGM) await createGmToolsMenu();

  // Override error notification to ignore "Item does not exist" error.
  ui.notifications.error = (message, options) => {
    if (message.includes("does not exist!")) return;
    return ui.notifications.notify(message, "error", options);
  }

  // Hide tooltip when releasing button
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Alt') {
      const tooltip = document.getElementById("tooltip-container")
      if (tooltip && tooltip.style.visibility === "visible") {
        tooltip.style.opacity = 0;
        tooltip.style.visibility = "hidden";
      }
    }
  });
});

Hooks.on("renderActorDirectory", (app, html, data) => characterWizardButton(html));
Hooks.on("renderCompendiumDirectory", (app, html, data) => compendiumBrowserButton(html));
Hooks.on("renderDialog", (app, html, data) => {
  // We want to remove "basicAction" from "Create Item Dialog"
  if (html.find('[name="type"]').length > 0) {
    const typeSelect = html.find('[name="type"]');
    const typesToRemove = ["basicAction"];

    typesToRemove.forEach(type => {
      typeSelect.find(`option[value="${type}"]`).remove();
    });
  }
});

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemName) {
  rollItemWithName(itemName);
}