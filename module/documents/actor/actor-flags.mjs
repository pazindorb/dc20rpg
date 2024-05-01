export function preInitializeFlags(actor) {
	if (actor.flags.dc20rpg) return;

	const flags = {
		editMode: false,
		showUnknownSkills: true,
		showUnknownKnowledgeSkills: true,
		showUnknownTradeSkills: false,
		showUnknownLanguages: false,
		showEmptyReductions: false,
		showEmptyConditions: false,
	}

	_initializeRollMenu(flags);
	if (actor.type === 'character') _initializeFlagsForCharacter(flags);
	else _initializeFlagsForNpc(flags);

	actor.update({[`flags.dc20rpg`]: flags});
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
			},
			favorites: {
				feature: {
					name: "Features",
					order: 0,
					custom: false
				},
				inventory: {
					name: "Inventory",
					order: 1,
					custom: false
				},
				technique: {
					name: "Techniques",
					order: 2,
					custom: false
				},
				spell: {
					name: "Spells",
					order: 3,
					custom: false
				},
			}
		}
}

function _initializeFlagsForNpc(flags) {
	// if (flags.headersOrdering === undefined) { 
	// 	flags.headersOrdering = {
	// 		items: {
	// 			actions: 0,
	// 			features: 1,
	// 			techniques: 2,
	// 			inventory: 3,
	// 			spells: 4,
	// 		}
	// 	}
	// }
}