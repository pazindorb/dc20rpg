export function preInitializeFlags(actor) {
	if (actor.flags.dc20rpg) return;

	const flags = {
		advancementCounter: 0,
		afterRollEffects: [],
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

	actor.update({[`flags.dc20rpg`]: flags});
}
