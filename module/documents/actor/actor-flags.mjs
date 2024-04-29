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
	_initializeRollMenu(flags);

	// Header Ordering (to be repleaced with different implementation)
	if (actor.type === 'character') _initializeFlagsForCharacter(flags);
	else _initializeFlagsForNpc(flags);
}

function _initializeRollMenu(flags) {
	if (flags.rollMenu === undefined) flags.rollMenu = {};
	if (flags.rollMenu.dis === undefined) flags.rollMenu.dis = 0;
	if (flags.rollMenu.adv === undefined) flags.rollMenu.adv = 0;
	if (flags.rollMenu.d8 === undefined) flags.rollMenu.d8 = 0;
	if (flags.rollMenu.d6 === undefined) flags.rollMenu.d6 = 0;
	if (flags.rollMenu.d4 === undefined) flags.rollMenu.d4 = 0;
	if (flags.rollMenu.initative === undefined) flags.rollMenu.initative = false;
}

function _initializeFlagsForCharacter(flags) {
	if (flags.headersOrdering === undefined) { 
		flags.headersOrdering = {
			inventory: {
				weapon: {
					name: "Weapons",
					order: 0,
					custom: false
				},
				equipment: {
					name: "Equipments",
					order: 1,
					custom: false
				},
				consumable: {
					name: "Consumables",
					order: 2,
					custom: false
				},
				tool: {
					name: "Tools",
					order: 3,
					custom: false
				},
				loot: {
					name: "Loot",
					order: 4,
					custom: false
				}
			},
			features: {
				feature: {
					name: "Features",
					order: 1,
					custom: false
				},
				class: {
					name: "Class Features",
					order: 0,
					custom: false
				},
				ancestry: {
					name: "Ancestry Traits",
					order: 2,
					custom: false
				},
			},
			techniques: {
				maneuver: {
					name: "Maneuvers",
					order: 0,
					custom: false
				},
				technique: {
					name: "Techniques",
					order: 1,
					custom: false
				},
			},
			spells: {
				cantrip: {
					name: "Cantrips",
					order: 0,
					custom: false
				},
				spell: {
					name: "Spells",
					order: 1,
					custom: false
				},
			}
		}
	}
}

function _initializeFlagsForNpc(flags) {
	if (flags.headersOrdering === undefined) { 
		flags.headersOrdering = {
			items: {
				actions: 0,
				features: 1,
				techniques: 2,
				inventory: 3,
				spells: 4,
			}
		}
	}
}