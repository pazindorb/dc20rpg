import { actorAdvancementDialog } from "../dialogs/actor-advancement.mjs";

export function deleteAdvancement(item, key) {
	item.update({[`system.advancements.-=${key}`]: null})
}

export function applyAdvancements(actor, level, clazz, subclass, ancestry) {
	let advForItems = {};
	let scalingValues = {};

	if (clazz) {
		const advancements = _collectAdvancementsFromItem(level, clazz);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, clazz: {item: clazz, advancements: advancements}};
		scalingValues = {...scalingValues, ..._collectScalingValuesForItem(level, clazz)};
	}
	if (subclass) {
		const advancements = _collectAdvancementsFromItem(level, subclass);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, subclass: {item: subclass, advancements: advancements}};
		scalingValues = {...scalingValues, ..._collectScalingValuesForItem(level, subclass)};
	}
	if (ancestry) {
		const advancements = _collectAdvancementsFromItem(level, ancestry);
		if (Object.keys(advancements).length !== 0) advForItems = {...advForItems, ancestry: {item: ancestry, advancements: advancements}};
		scalingValues = {...scalingValues, ..._collectScalingValuesForItem(level, ancestry)};
	}

	actorAdvancementDialog(actor, advForItems, scalingValues);
}

function _collectAdvancementsFromItem(level, item) {
	const advancements = item.system.advancements;
	return Object.fromEntries(Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level <= level)
		.filter(([key, advancement]) => !advancement.applied));
}

function _collectScalingValuesForItem(level, item) {
	const scaling = item.system.scaling;
	return Object.fromEntries(Object.entries(scaling).map(([key, value]) => {
		const label = value.label;
		const current = value.values[level];
		const previous = value.values[level-1] || 0;

		return [key, {
			label: label,
			current: current,
			previous: previous,
		}];
	}));
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
	const itemStillExist = await actor.items.has(id);
	if (itemStillExist) {
		const item = await actor.items.get(id);
		advancement.applied = false;
		await item.update({[`system.advancements.${key}`]: advancement})
			.then((updatedItem) => updatedItem)
			.catch((error) => {/*Sometimes we are to fast with deleting item and update finds nothing. This error should be ignored.*/});
	}
}