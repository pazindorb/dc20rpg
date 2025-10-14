import { DC20RpgActor } from "./documents/actor.mjs";
import { DC20RpgItem } from "./documents/item.mjs";
import { DC20RpgCombatant } from "./documents/combatant.mjs";
import { DC20RpgCombat } from "./documents/combat.mjs";
import { DC20RpgActorSheet } from "./sheets/actor-sheet.mjs";
import { DC20RpgItemSheet } from "./sheets/item-sheet.mjs";
import { DC20RpgCombatTracker } from "./sidebar/combat-tracker.mjs";
import { preloadHandlebarsTemplates } from "./helpers/handlebars/templates.mjs";
import { DC20RPG, initDC20Config, prepareDC20tools } from "./helpers/config.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars/helpers.mjs";
import { createItemHotbarDropMacro } from "./helpers/macros.mjs";
import { registerDC20Statues } from "./statusEffects/statusEffects.mjs";
import { registerGameSettings } from "./settings/settings.mjs";
import { registerHandlebarsCreators } from "./helpers/handlebars/creators.mjs";
import { DC20ChatMessage } from "./chat/chat-message.mjs";
import DC20RpgActiveEffect from "./documents/activeEffects.mjs";
import { registerSystemSockets } from "./helpers/sockets.mjs";
import { DC20RpgTokenHUD } from "./placeable-objects/token-hud.mjs";
import { DC20RpgToken } from "./placeable-objects/token.mjs";
import { prepareColorPalette } from "./settings/colors.mjs";
import { DC20RpgActiveEffectConfig } from "./sheets/active-effect-config.mjs";
import { DC20CharacterData, DC20CompanionData, DC20NpcData, DC20StorageData } from "./dataModel/actorData.mjs";
import * as itemDM from "./dataModel/itemData.mjs";
import { DC20RpgTokenDocument } from "./documents/tokenDoc.mjs";
import { compendiumBrowserButton } from "./sidebar/compendium-directory.mjs";
import { DC20RpgMacroConfig } from "./sheets/macro-config.mjs";
import DC20RpgMeasuredTemplate from "./placeable-objects/measuredTemplate.mjs";
import { DC20PrototypeTokenConfig, DC20RpgTokenConfig } from "./sheets/token-config.mjs";
import { expandEnrichHTML, registerGlobalInlineRollListener } from "./helpers/textEnrichments.mjs";
import { DC20MeasuredTemplateDocument } from "./documents/measuredTemplate.mjs";
import { registerUniqueSystemItems } from "./subsystems/character-progress/advancement/advancements.mjs";
import { SimplePopup } from "./dialogs/simple-popup.mjs";
import { createGmToolsMenu } from "./sidebar/gm-tools/gm-tools-menu.mjs";
import { runMigrationCheck, testMigration } from "./settings/migrationRunner.mjs";
import { characterWizardButton } from "./sidebar/actor-directory.mjs";
import { canvasItemDrop } from "./helpers/actors/tokens.mjs";
import { registerDC20ConditionalHelpers } from "./helpers/conditionals.mjs";
import DC20Hotbar from "./sidebar/hotbar.mjs";
import { overrideCoreKeybindActions, registerSystemKeybindings } from "./settings/keybindings.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */
Hooks.once('init', async function() {
  registerGameSettings(game.settings); // Register game settings
  registerSystemKeybindings();
  prepareColorPalette(); // Prepare Color Palette
  
  CONFIG.DC20RPG = DC20RPG;
  initDC20Config();
  prepareDC20tools();
  registerDC20ConditionalHelpers();
  CONFIG.DC20Events = {};
  CONFIG.statusEffects = registerDC20Statues();
  CONFIG.specialStatusEffects.BLIND = "blinded";
  game.dc20rpg.compendiumBrowser = {
    hideItems: new Set(),
    hideActors: new Set()
  }; 

  // Define custom Document classes
  CONFIG.Actor.documentClass = DC20RpgActor;
  CONFIG.Item.documentClass = DC20RpgItem;
  CONFIG.Combatant.documentClass  = DC20RpgCombatant;
  CONFIG.Combat.documentClass = DC20RpgCombat;
  CONFIG.ui.combat = DC20RpgCombatTracker;
  CONFIG.ChatMessage.documentClass = DC20ChatMessage;
  CONFIG.ActiveEffect.documentClass = DC20RpgActiveEffect;
  CONFIG.ActiveEffect.legacyTransferral = false;
  CONFIG.Token.prototypeSheetClass = DC20PrototypeTokenConfig;
  CONFIG.Token.documentClass = DC20RpgTokenDocument;
  CONFIG.Token.hudClass = DC20RpgTokenHUD;
  CONFIG.Token.objectClass = DC20RpgToken;
  CONFIG.Token.movement.actions = DC20RpgToken.movementActions();
  CONFIG.Token.movement.defaultAction = "ground";
  CONFIG.Token.movement.defaultSpeed = 5;
  CONFIG.MeasuredTemplate.objectClass = DC20RpgMeasuredTemplate;
  CONFIG.MeasuredTemplate.documentClass = DC20MeasuredTemplateDocument;
  CONFIG.MeasuredTemplate.TEMPLATE_REFRESH_TIMEOUT = 200;
  CONFIG.ui.hotbar = DC20Hotbar;

  // Register data models
  CONFIG.Actor.dataModels.character = DC20CharacterData;
  CONFIG.Actor.dataModels.npc = DC20NpcData;
  CONFIG.Actor.dataModels.companion = DC20CompanionData;
  CONFIG.Actor.dataModels.storage = DC20StorageData;
  CONFIG.Item.dataModels.basicAction = itemDM.DC20BasicActionData
  CONFIG.Item.dataModels.weapon = itemDM.DC20WeaponData;
  CONFIG.Item.dataModels.equipment = itemDM.DC20EquipmentData;
  CONFIG.Item.dataModels.consumable = itemDM.DC20ConsumableData;
  CONFIG.Item.dataModels.loot = itemDM.DC20LootData;
  CONFIG.Item.dataModels.container = itemDM.DC20ContainerData;
  CONFIG.Item.dataModels.feature = itemDM.DC20FeatureData;
  CONFIG.Item.dataModels.technique = itemDM.DC20TechniqueData;
  CONFIG.Item.dataModels.spell = itemDM.DC20SpellData;
  CONFIG.Item.dataModels.infusion = itemDM.DC20InfusionData;
  CONFIG.Item.dataModels.class = itemDM.DC20ClassData;
  CONFIG.Item.dataModels.subclass = itemDM.DC20SubclassData;
  CONFIG.Item.dataModels.ancestry = itemDM.DC20AncestryData;
  CONFIG.Item.dataModels.background = itemDM.DC20BackgroundData;

  // Register sheet application classes
  foundry.documents.collections.Actors.registerSheet("dc20rpg", DC20RpgActorSheet, { makeDefault: true });
  foundry.documents.collections.Items.registerSheet("dc20rpg", DC20RpgItemSheet, { makeDefault: true });
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.registerSheet(ActiveEffect, "dc20rpg", DC20RpgActiveEffectConfig, { makeDefault: true });
  DocumentSheetConfig.registerSheet(Macro, "dc20rpg", DC20RpgMacroConfig, { makeDefault: true });
  DocumentSheetConfig.registerSheet(TokenDocument, "dc20rpg", DC20RpgTokenConfig, { makeDefault: true });

  // Register Handlebars helpers and creators
  registerHandlebarsHelpers();
  registerHandlebarsCreators();

  // Register extended enrichHTML method
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
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
  // await testMigration("0.9.7.3", "0.9.8.0", new Set(["dc20-core-rulebook"]));

  /* -------------------------------------------- */
  /*  Hotbar Macros                               */
  /* -------------------------------------------- */
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type === "Item") {
      createItemHotbarDropMacro(data, slot);
      return false;
    }
    if (data.type === "Macro") {
      let macro = game.macros.find(macro => (macro.uuid === data.uuid));
      if(macro) game.user.assignHotbarMacro(macro, slot);
    }
    return true; 
  });

  registerSystemSockets();
  registerUniqueSystemItems();
  overrideCoreKeybindActions();

  if(game.user.isGM) await createGmToolsMenu();

  // Override error notification to ignore "Item does not exist" error.
  ui.notifications.error = (message, options) => {
    if (message.includes("does not exist!")) return;
    return ui.notifications.info(message, "error", options);
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
Hooks.on("renderCompendiumDirectory", (application, element, context, option) => compendiumBrowserButton(element));
Hooks.on("renderActorDirectory", (application, element, context, option) => characterWizardButton(element));
Hooks.on("renderDialogV2", (app, element, context, option) => {
  // We want to remove "basicAction" from "Create Item Dialog"
  const selector = element.querySelector('[name="type"]');
  if (selector) {
    const basicActionOption = selector.querySelector('[value="basicAction"]');
    if (basicActionOption) selector.removeChild(basicActionOption);
  }
});
Hooks.on("createScene", async (scene, options, userId) => {
  if (userId !== game.userId) return;

  if (scene.grid.distance !== 1) {
    const confirmed = await SimplePopup.open("confirm", {header: "Incorrect grid distance", information: [`Looks like the '${scene.name}' scene is using a different than default grid distance. This may cause problems with distance calculations. Would you like to replace the distance with the default for this system?`]});
    if (confirmed) scene.update({
      ["grid.units"]: "Space",
      ["grid.distance"]: 1
    });
  }
});
Hooks.on("dropCanvasData", async (canvas, data, event) => canvasItemDrop(canvas, data, event));