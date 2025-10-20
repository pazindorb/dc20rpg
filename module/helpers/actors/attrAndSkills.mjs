import { DC20Roll } from "../../roll/rollApi.mjs";

//===========================================
//=				PREPARE CHECKS AND SAVES					=
//===========================================
/** @deprecated since v0.9.8 until 0.10.0 */
export function prepareCheckDetailsFor(key, against, statuses, rollTitle, customLabel) {
	foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.prepareCheckDetailsFor' method is deprecated, and will be removed in the later system version. Use 'DC20.DC20Roll.prepareCheckDetails' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
	return DC20Roll.prepareCheckDetails(key, {against: against, statuses: statuses, rollTitle: rollTitle, customLabel: customLabel});
}

/** @deprecated since v0.9.8 until 0.10.0 */
export function prepareSaveDetailsFor(key, dc, statuses, rollTitle, customLabel) {
	foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.rolls.prepareSaveDetailsFor' method is deprecated, and will be removed in the later system version. Use 'DC20.DC20Roll.prepareSaveDetails' instead.", { since: " 0.9.8", until: "0.10.0", once: true });
	return DC20Roll.prepareSaveDetails(key, {against: dc, statuses: statuses, rollTitle: rollTitle, customLabel: customLabel});
}