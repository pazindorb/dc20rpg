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
import { defaultSkillList, SkillConfiguration } from "./skillConfig.mjs";

// For more custom settings (with popups for example) see DND5e system
export function registerGameSettings(settings) {
  settings.register("dc20rpg", "lastMigration", {
    name: "Latest System Migration Applied",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  settings.register("dc20rpg", "suppressAdvancements", {
    name: "Suppress Advancements",
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  settings.register("dc20rpg", "useMovementPoints", {
    name: "Use Movement Points",
    hint: "Select, when Movement Points should be subtracted.",
    scope: "world",
    config: true,
    default: "onTurn",
    type: new foundry.data.fields.StringField({required: true, blank: false, initial: "onTurn", choices: {
      onTurn: "Only on Actor's Turn",
      onCombat: "When Actor in Combat",
      always: "Always",
      never: "Never"
    }}),
	});

  settings.register("dc20rpg", "snapMovement", {
    name: "Snap Movement",
    hint: "If selected, Token will move to the closest space when there is not enough Move Points to its final destination.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  settings.register("dc20rpg", "askToSpendMoreAP", {
    name: "Allow for Move Action popup",
    hint: "If selected, Not enough Move Points will cause a popup to appear asking to spend more AP for the movement.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  settings.register("dc20rpg", "disableDifficultTerrain", {
    name: "Disable Difficult Terrain",
    hint: "If selected, Difficult Terrain won't influence token movement costs.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "positionCheckNeutral", {
    name: "Neutral Tokens Position Check",
    hint: "How neutral disposition tokens should be treated during a position checks (e.g. Flanking check).",
    scope: "world",
    config: true,
    default: "separated",
    type: new foundry.data.fields.StringField({required: true, blank: false, initial: "separated", choices: {
      separated: "Separated Group",
      hostile: "Part of the Hostile Group",
      friendly: "Part of the Friendly Group"
    }}),
	});

  settings.register("dc20rpg", "autoRollLevelCheck", {
    name: "Run Roll Level Check Automatically",
    hint: "If selected, Roll Level Check will run automatically when performing a roll.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "runRollLevelCheckOnRangeSwap", {
    name: "Run Roll Level Check On Weapon Range Swap",
    hint: "If selected, Roll Level Check will run automatically when swaping attack range type.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "enableRangeCheck", {
    name: "Enable Range Check",
    hint: "If selected, Normal/Long/Out of Range rulles will be respected (e.g. Weapon Ranges).",
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
    hint: "If selected Attribute Limit will be used as Prime attribute value. It won't matter what the values of the attributes themselves are.",
    scope: "world",
    config: false,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "outsideOfCombatRule", {
    name: "Use Outside of combat rules",
    hint: "If selected 'Outside of Combat' rules for AP, MP and SP will be respected. See 'Combat Resources' chapter.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "selectedColor", {
    scope: "user",
    config: false,
    default: "default",
    type: String
  });

  settings.register("dc20rpg", "colorPaletteStore", {
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

  settings.register("dc20rpg", "skillStore", {
    scope: "world",
    config: false,
    default: defaultSkillList(),
    type: Object
  });

  settings.registerMenu("dc20rpg", "skillConfig", {
    name: "Customize Skill List",
    label: "Open Skill List Customization",
    icon: "fas fa-table-list",
    config: true,
    type: SkillConfiguration,
    restricted: true  
  });

}