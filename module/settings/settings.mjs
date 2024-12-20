//=============================================================================
//																	SCOPES																		=
// types: Supported types: "string", "number", "boolean", "object"						=
// scopes: 																																		=
//		- "world" - system-specific settings																		=
//		- "client" - client-side settings - not synchronized between users. 		=
//								 They are only stored locally and are not saved to the 			=
//								 server. These settings are typically used for interface 		=
//								 customization or client-specific behavior.									=
//		- "user" - individual-user settings	- synchronized between devices for 	=
//							 that user.	They are stored on the server and can be accessed =
//							 from any device where the user is logged in. These settings 	=						
// 							 are often used for personal preferences or configurations.		=
//=============================================================================

import { ColorSetting, defaultColorPalette } from "./colors.mjs";

// For more custom settings (with popups for example) see DND5e system
export function registerGameSettings(settings) {
  game.settings.register("dc20rpg", "lastMigration", {
    name: "Latest System Migration Applied",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("dc20rpg", "suppressAdvancements", {
    name: "Suppress Advancements",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  settings.register("dc20rpg", "disableDifficultTerrain", {
    name: "Disable Difficult Terrain",
    hint: "If selected Difficult Terrain won't influence token movement costs.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "showEventChatMessage", {
    name: "Show Event Chat Messages to Players",
    hint: "If selected damage/healing taken and effect removed messages will be send to public chat instead of being GM only.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "showDamageForPlayers", {
    name: "Show Damage and Healing on Chat Message",
    hint: "If false, only GM will be able to see expected damage and healing target will receive.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
	});

  settings.register("dc20rpg", "useMaxPrime", {
    name: "Use Attribute Limit as Prime",
    hint: "If selected Attribute Limit will be used as Prime attribute value. It won't matter what the values ​​of the attributes themselves are.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "outsideOfCombatRule", {
    name: "Use AP, SP and MP outside of combat rules",
    hint: "If selected Outside of Combat rules for AP, MP and SP will be respected.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  game.settings.register("dc20rpg", "selectedColor", {
    scope: "user",
    config: false,
    default: "default",
    type: String
  });

  game.settings.register("dc20rpg", "colorPaletteStore", {
    scope: "world",
    config: false,
    default: defaultColorPalette(),
    type: Object
  });

  settings.registerMenu("dc20rpg", "colorPaletteConfig", {
    name: "Select Color Palette",
    label: "Open Color Palette Selection",
    icon: "fas fa-palette",
    config: true,
    type: ColorSetting,
    restricted: false
  });
}