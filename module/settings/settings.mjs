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
// For more custom settings (with popups for example) see DND5e system
export function registerGameSettings(settings) {
  settings.register("dc20rpg", "showDamageChatMessage", {
    name: "Show Damage/Healing Chat Messages to Players",
    hint: "If selected damage/healing taken messages will be send to public chat instead of being GM only.",
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
}