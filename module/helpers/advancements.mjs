import { actorAdvancementDialog } from "../dialogs/actor-advancement.mjs";

export function createNewAdvancement() {
	return { 
		name: "Advancement",
		mustChoose: false,
		pointAmount: 1,
		level: 1,
		applied: false,
		talent: false,
		allowToAddItems: false,
		items: {}
	};
}

export function deleteAdvancement(item, key) {
	item.update({[`system.advancements.-=${key}`]: null})
}

export function applyAdvancements(actor, level, clazz, subclass, ancestry, background, oldSystem) {
	let advForItems = {};

	if (clazz) {
		const advancements = _collectAdvancementsFromItem(level, clazz);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, clazz: {item: clazz, advancements: advancements}};
	}
	if (subclass) {
		const advancements = _collectAdvancementsFromItem(level, subclass);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, subclass: {item: subclass, advancements: advancements}};
	}
	if (ancestry) {
		const advancements = _collectAdvancementsFromItem(level, ancestry);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, ancestry: {item: ancestry, advancements: advancements}};
	}
	if (background) {
		const advancements = _collectAdvancementsFromItem(level, background);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, background: {item: background, advancements: advancements}};
	}

	actorAdvancementDialog(actor, advForItems, oldSystem);
}

function _collectAdvancementsFromItem(level, item) {
	const advancements = item.system.advancements;
	return Object.fromEntries(Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level <= level)
		.filter(([key, advancement]) => !advancement.applied));
}

export function removeAdvancements(actor, level, clazz, subclass, ancestry, background, itemDeleted) {
	if (clazz) _removeAdvancementsFrom(actor, level, clazz, itemDeleted);
	if (subclass) _removeAdvancementsFrom(actor, level, subclass, itemDeleted);
	if (ancestry) _removeAdvancementsFrom(actor, level, ancestry, itemDeleted);
	if (background) _removeAdvancementsFrom(actor, level, background, itemDeleted);
}

async function _removeAdvancementsFrom(actor, level, item, itemDeleted) {
	const advancements = item.system.advancements;
	Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level >= level)
		.filter(([key, advancement]) => advancement.applied)
		.forEach(async ([key, advancement]) => {
			await _removeItemsFromActor(actor, advancement.items);
			if (!itemDeleted) {
				// We dont need to mark advancement if parent was removed.
				await _markAdvancementAsNotApplied(advancement, key, actor, item._id);
			}
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
	const itemStillExist = await actor.items.has(id);
	if (itemStillExist) {
		const item = await actor.items.get(id);

		// If advancement does not come from base item we want to remove it instad of marking it as not applied
		if (advancement.additionalAdvancement) {
			await item.update({[`system.advancements.-=${key}`]: null});
		}
		else {
			advancement.applied = false;
			await item.update({[`system.advancements.${key}`]: advancement});
		}
	}
}