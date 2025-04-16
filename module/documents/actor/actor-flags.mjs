export function preInitializeFlags(actor) {
	if (actor.flags.dc20rpg) return;

	const flags = {
		editMode: false,
		hideNonessentialEffects: false,
		showInactiveEffects: true,
		showUnknownSkills: true,
		showUnknownTradeSkills: false,
		showUnknownLanguages: false,
		showEmptyReductions: false,
		showEmptyConditions: false,
		onelinerModeDMR: true,
		onelinerModeCI: true,
		showBasicActions: false,
		advancementCounter: 0,
		effectsToRemoveAfterRoll: [],
		actionHeld: {
			isHeld: false,
			itemId: null,
			itemImg: null,
			apForAdv: null,
			enhancements: null,
			mcp: null,
			rollsHeldAction: false
		}
	}

	_initializeRollMenu(flags);
	if (actor.type === 'character') _initializeFlagsForCharacter(flags);
	else _initializeFlagsForNpc(flags);

	actor.update({[`flags.dc20rpg`]: flags});
}

function _initializeRollMenu(flags) {
	flags.rollMenu = {
		autoCrit: false,
		autoFail: false,
		dis: 0,
		adv: 0,
		apCost: 0,
		gritCost: 0,
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
			favorites: "",
			basic: "",
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
				loot: {
					name: "Loot",
					order: 3,
					custom: false
				}
			},
			features: {
				class: {
					name: "Class Features",
					order: 0,
					custom: false
				},
				subclass: {
					name: "Subclass Features",
					order: 1,
					custom: false
				},
				ancestry: {
					name: "Ancestry Traits",
					order: 2,
					custom: false
				},
				feature: {
					name: "Features",
					order: 3,
					custom: false
				},
				passive: {
					name: "Passives",
					order: 4,
					custom: false
				}
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
			basic: {
				offensive: {
					name: "Offensive",
					order: 0,
					custom: false
				},
				defensive: {
					name: "Defensive",
					order: 1,
					custom: false
				},
				utility: {
					name: "Utility",
					order: 2,
					custom: false
				},
				reaction: {
					name: "Reaction",
					order: 3,
					custom: false
				},
				skillBased: {
					name: "Skill Based",
					order: 4,
					custom: false
				},
			},
			favorites: {
				basic: {
					name: "Basic Actions",
					order: 0,
					custom: false
				},
				feature: {
					name: "Features",
					order: 1,
					custom: false
				},
				inventory: {
					name: "Inventory",
					order: 2,
					custom: false
				},
				technique: {
					name: "Techniques",
					order: 3,
					custom: false
				},
				spell: {
					name: "Spells",
					order: 4,
					custom: false
				},
			}
		}
}

function _initializeFlagsForNpc(flags) {
	flags.headerFilters = {
		main: "",
		basic: "",
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
		},
		basic: {
			offensive: {
				name: "Offensive",
				order: 0,
				custom: false
			},
			defensive: {
				name: "Defensive",
				order: 1,
				custom: false
			},
			utility: {
				name: "Utility",
				order: 2,
				custom: false
			},
			reaction: {
				name: "Reaction",
				order: 3,
				custom: false
			},
			skillBased: {
				name: "Skill Based",
				order: 4,
				custom: false
			},
		}
	}
}