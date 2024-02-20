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
export function registerGameSettings(settings, isGM) {
	if (isGM) _registerGmOnlySettings(settings);
	_registerSettings(settings);
}

function _registerGmOnlySettings(settings) {
  settings.register("dc20rpg", "showDamageChatMessage", {
    name: "Show Damage/Healing Chat Messages to Players",
    hint: "If selected damage/healing taken messages will be send to public chat instead of being GM only.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
	});

  settings.register("dc20rpg", "showSourceOfDamageOnChatMessage", {
    name: "Show Source of Damage/Healing on Chat Messages",
    hint: "If selected damage/healing taken messages will be enhanced with sources of that calculation (enhancements, heavy/brutal, over 5, crit, etc).",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
	});

  settings.register("dc20rpg", "showTargetsOnChatMessage", {
    name: "Show Targets on Chat Message",
    hint: "If selected user targets will be shown on chat message created by rolling an item.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
	});
}

function _registerSettings(settings) {

}