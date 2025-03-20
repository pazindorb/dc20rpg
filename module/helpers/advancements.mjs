import { actorAdvancementDialog } from "../dialogs/actor-advancement.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { actorAdvancementDialogNEW } from "../subsystems/character-progress/advancement/advancement-dialog.mjs";

export function createNewAdvancement() {
	return { 
		name: "Advancement",
		customTitle: "",
		tip: "",
		level: 1,
		applied: false,
		additionalAdvancement: false,
		repeatable: false,
		repeatAt: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		progressPath: false,
		mustChoose: false,
		pointAmount: 1,
		allowToAddItems: false,
		addItemsOptions: {
			itemType: "",
			preFilters: "",
			talentFilter: false,
			helpText: ""
 		},
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

	actorAdvancementDialogNEW(actor, advForItems, oldSystem);
}

function _collectAdvancementsFromItem(level, item) {
	const advancements = item.system.advancements;
	return Object.fromEntries(Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level <= level)
		.filter(([key, advancement]) => !advancement.applied));
}

export async function removeAdvancements(actor, level, clazz, subclass, ancestry, background, itemDeleted) {
	const dialog =  new SimplePopup("non-closable", {header: "Removing advancements", message: "Removing advancements - it might take a moment, please wait."}, {title: "Popup"});
	await dialog._render(true);
	if (clazz) await _removeAdvancementsFrom(actor, level, clazz, itemDeleted);
	if (subclass) await _removeAdvancementsFrom(actor, level, subclass, itemDeleted);
	if (ancestry) await _removeAdvancementsFrom(actor, level, ancestry, itemDeleted);
	if (background) await _removeAdvancementsFrom(actor, level, background, itemDeleted);
	dialog.close();
}

async function _removeAdvancementsFrom(actor, level, item, itemDeleted) {
	const advancements = item.system.advancements;
	const entries = Object.entries(advancements)
		.filter(([key, advancement]) => advancement.level >= level)
		.filter(([key, advancement]) => {
			if (advancement.applied) return true;
			if (advancement.level === level && advancement.additionalAdvancement) return true;
		});

	for (const [key, advancement] of entries) {
		await _removeItemsFromActor(actor, advancement.items);
		if (!itemDeleted) {
			// We dont need to mark advancement if parent was removed.
			await _markAdvancementAsNotApplied(advancement, key, actor, item._id);
		}
	}
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
			if (key === "martialExpansion") item.update({["system.maneuversProvided"]: false});
			await item.update({[`system.advancements.-=${key}`]: null});
		}
		else {
			advancement.applied = false;
			await item.update({[`system.advancements.${key}`]: advancement});
		}
	}
}