export function initFlags(actor) {
  if (!actor.flags.dc20rpg) actor.flags.dc20rpg = {};

	const flags = actor.flags.dc20rpg;
	if (flags.showUnknownSkills === undefined) flags.showUnknownSkills = true;
	if (flags.showUnknownTradeSkills === undefined) flags.showUnknownTradeSkills = false;
	if (flags.showUnknownLanguages === undefined) flags.showUnknownLanguages = false;
	if (flags.showEmptyReductions === undefined) flags.showEmptyReductions = false;

	// Header Ordering (to be repleaced with different implementation)
	if (actor.type === 'character') _initializeFlagsForCharacter(actor);
	else _initializeFlagsForNpc(actor);
}

function _initializeFlagsForCharacter(actor) {
	const coreFlags = actor.flags.dc20rpg;
	// Flags describing item table headers ordering
	if (coreFlags.headersOrdering === undefined) { 
		coreFlags.headersOrdering = {
			inventory: {
				Weapons: 0,
				Equipment: 1,
				Consumables: 2,
				Tools: 3,
				Loot: 4
			},
			features: {
				Features: 0
			},
			techniques: {
				Techniques: 0
			},
			spells: {
				Spells: 0
			}
		}
	}
}

function _initializeFlagsForNpc(actor) {
	const coreFlags = actor.flags.dc20rpg;
	// Flags describing item table headers ordering
	if (coreFlags.headersOrdering === undefined) { 
		coreFlags.headersOrdering = {
			items: {
				Actions: 0,
				Features: 1,
				Techniques: 2,
				Inventory: 3,
				Spells: 4,
			}
		}
	}
}