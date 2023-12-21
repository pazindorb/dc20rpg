import { actorAdvancementDialog } from "../dialogs/actor-advancement.mjs";

export function deleteAdvancement(item, key) {
	item.update({[`system.advancements.-=${key}`]: null})
}

export function applyAdvancements(actor, level, clazz, subclass, ancestry) {
	if (clazz) _applyAdvancementsFrom(actor, level, clazz);
	if (subclass) _applyAdvancementsFrom(actor, level, subclass);
	if (ancestry) _applyAdvancementsFrom(actor, level, ancestry);
}

function _applyAdvancementsFrom(actor, level, item) {
	const advancements = item.system.advancements;
	Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level <= level)
		.filter(([key, advancement]) => !advancement.applied)
		.forEach(async ([key, advancement]) => await actorAdvancementDialog(actor, item, key, advancement));
}

export function removeAdvancements(actor, level, clazz, subclass, ancestry) {
	if (clazz) _removeAdvancementsFrom(actor, level, clazz);
	if (subclass) _removeAdvancementsFrom(actor, level, subclass);
	if (ancestry) _removeAdvancementsFrom(actor, level, ancestry);
}

async function _removeAdvancementsFrom(actor, level, item) {
	const advancements = item.system.advancements;
	Object.entries(advancements)
		.filter(([key, advancement]) => {
			if (level) return advancement.level >= level;
			else return true;	// If no level provided then remove all advancements
		})
		.filter(([key, advancement]) => advancement.applied)
		.forEach(async ([key, advancement]) => {
			await _removeItemsFromActor(actor, advancement.items);
			await _markAdvancementAsNotApplied(advancement, key, actor, item._id);
		});
}

async function _removeItemsFromActor(actor, items) {
	for (const [key, record] of Object.entries(items)) {
		const itemExist = await actor.items.has(record.createdItemId);
		if (itemExist) {
			const item = await actor.items.get(record.createdItemId);
			record.createdItemId = "";
			await item.delete();
		}	
	}
}

async function _markAdvancementAsNotApplied(advancement, key, actor, id) {
	const itemStillEgsist = await actor.items.has(id);
	if (itemStillEgsist) {
		const item = await actor.items.get(id);
		advancement.applied = false;
		await item.update({[`system.advancements.${key}`]: advancement})
	}
}