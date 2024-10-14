export function preInitializeFlags(actor) {
	if (actor.flags.dc20rpg) return;

	const flags = {
		editMode: false,
		showInactiveEffects: true,
		showUnknownSkills: true,
		showUnknownKnowledgeSkills: true,
		showUnknownTradeSkills: false,
		showUnknownLanguages: false,
		showEmptyReductions: false,
		showEmptyConditions: false,
		onelinerModeDMR: true,
		onelinerModeCI: true,
		showBasicActions: false,
		advancementCounter: 0,
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
		apCost: 0,
		d8: 0,
		d6: 0,
		d4: 0,
		initative: false
	}
}

function _initializeFlagsForCharacter(flags) {
		flags.headerFilters = {
			inventory: "",
			features: "",
			techniques: "",
			spells: "",
			favorites: ""
		}
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
	flags.headerFilters = {
		main: "",
	}
	flags.headersOrdering = {
		main: {
			action: {
				name: "Actions",
				order: 0,
				custom: false
			},
			feature: {
				name: "Features",
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
			inventory: {
				name: "Inventory",
				order: 4,
				custom: false
			}
		}
	}
}