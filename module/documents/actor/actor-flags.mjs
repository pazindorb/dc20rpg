export function initFlags(actor) {
  if (!actor.flags.dc20rpg) actor.flags.dc20rpg = {};

	const flags = actor.flags.dc20rpg;
	if (flags.showUnknownSkills === undefined) flags.showUnknownSkills = true;
	if (flags.showUnknownKnowledgeSkills === undefined) flags.showUnknownKnowledgeSkills = true;
	if (flags.showUnknownTradeSkills === undefined) flags.showUnknownTradeSkills = false;
	if (flags.showUnknownLanguages === undefined) flags.showUnknownLanguages = false;
	if (flags.showEmptyReductions === undefined) flags.showEmptyReductions = false;
	if (flags.showEmptyConditions === undefined) flags.showEmptyConditions = false;
	if (flags.editMode === undefined) flags.editMode = false;
	if (flags.rollMenu === undefined) _initializeRollMenu(flags);

	// Header Ordering (to be repleaced with different implementation)
	if (actor.type === 'character') _initializeFlagsForCharacter(flags);
	else _initializeFlagsForNpc(flags);
}

function _initializeRollMenu(flags) {
	flags.rollMenu = {
		dis: 0,
		adv: 0,
		d8: 0,
		d6: 0,
		d4: 0,
		initative: false
	}
}

function _initializeFlagsForCharacter(flags) {
	if (flags.headersOrdering === undefined) { 
		flags.headersOrdering = {
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

function _initializeFlagsForNpc(flags) {
	if (flags.headersOrdering === undefined) { 
		flags.headersOrdering = {
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