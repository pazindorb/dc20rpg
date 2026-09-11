export function preInitializeFlags(actor) {
	if (actor.flags.dc20rpg) return;

	const flags = {advancementCounter: 0}

	actor.update({[`flags.dc20rpg`]: flags});
}
