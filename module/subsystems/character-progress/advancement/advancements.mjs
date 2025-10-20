import { collectItemsForType } from "../../../dialogs/compendium-browser/browser-utils.mjs";
import { SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { actorAdvancementDialog } from "./advancement-dialog.mjs";

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
			ancestryFilter: false,
			helpText: "",
			itemLimit: null,
 		},
		macro: "",
		items: {}
	};
}

export function deleteAdvancement(item, key) {
	item.update({[`system.advancements.-=${key}`]: null})
}

export function applyAdvancements(actor, level, clazz, subclass, ancestry, background, oldSystem) {
	const advancements = [];

	if (ancestry) {
		const fromItem = collectAdvancementsFromItem(level, ancestry);
		advancements.push(...fromItem);
	}
	if (background) {
		const fromItem = collectAdvancementsFromItem(level, background);
		advancements.push(...fromItem);
	}
	if (subclass) {
		const fromItem = collectAdvancementsFromItem(level, subclass);
		advancements.push(...fromItem);
	}
	if (clazz) {
		const fromItem = collectAdvancementsFromItem(level, clazz);
		advancements.push(...fromItem);
	}

	const subclassId = actor.system.details.subclass.id;
	actorAdvancementDialog(actor, advancements, oldSystem, (level === 3 && !subclassId));
}

export function collectAdvancementsFromItem(level, item) {
	const advancements = item.system.advancements;

	return Object.entries(advancements)
							.filter(([key, advancement]) => advancement.level <= level)
							.filter(([key, advancement]) => !advancement.applied)
							.map(([key, advancement]) => {
								advancement.key = key;
								advancement.parentItem = item;
								return advancement;
							});
}

export async function removeAdvancements(actor, level, clazz, subclass, ancestry, background, itemDeleted) {
	const dialog = new SimplePopup("info", {hideButtons: true, header: "Removing advancements", information: ["Removing advancements - it might take a moment, please wait."]});
	await dialog.render(true);
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
		await removeItemsFromActor(actor, advancement.items);
		await removeMulticlassInfoFromActor(actor, key);
		if (!itemDeleted) {
			// We dont need to mark advancement if parent was removed.
			await _markAdvancementAsNotApplied(advancement, key, actor, item._id);
		}
	}
}

export async function removeItemsFromActor(actor, items) {
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
			if (key === "martialExpansion") {
				await actor.update({["system.details.martialExpansionProvided"]: false});
				item.martialExpansionProvided = false;
			}
			await item.update({[`system.advancements.-=${key}`]: null});
		}
		else {
			advancement.applied = false;
			await item.update({[`system.advancements.${key}`]: advancement});
		}
	}
}

export async function removeMulticlassInfoFromActor(actor, key) {
	const clazz = actor.class;
	if (!clazz) return;

	const multiclassTalents = clazz.system.multiclass;
	if (multiclassTalents[key]) await clazz.update({[`system.multiclass.-=${key}`]: null})
}


export async function registerUniqueSystemItems() {
	CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS = {
		class: {},
		subclass: {},
		ancestry: {},
		background: {}
	}
	CONFIG.DC20RPG.UNIQUE_ITEM_IDS = {
		class: {},
		subclass: {},
		ancestry: {},
		background: {}
	};
	CONFIG.DC20RPG.SUBCLASS_CLASS_LINK = {};

	const clazz = await collectItemsForType("class");
	clazz.forEach(item => {
		CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.class[item.uuid] = item.name;
		const itemKey = item.system.itemKey;
		if (itemKey) CONFIG.DC20RPG.UNIQUE_ITEM_IDS.class[itemKey] = item.name;
	});
	const subclass = await collectItemsForType("subclass");
	subclass.forEach(item => {
		CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.subclass[item.uuid] = item.name;
		const itemKey = item.system.itemKey;
		const classKey = item.system.forClass.classSpecialId;
		if (itemKey) {
			CONFIG.DC20RPG.UNIQUE_ITEM_IDS.subclass[itemKey] = item.name;
			if (classKey) CONFIG.DC20RPG.SUBCLASS_CLASS_LINK[itemKey] = classKey;
		}
	});
	const ancestry = await collectItemsForType("ancestry");
	ancestry.forEach(item => {
		CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.ancestry[item.uuid] = item.name;
		const itemKey = item.system.itemKey;
		if (itemKey) CONFIG.DC20RPG.UNIQUE_ITEM_IDS.ancestry[itemKey] = item.name;
	});
	const background = await collectItemsForType("background");
	background.forEach(item => {
		CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.background[item.uuid] = item.name;
		const itemKey = item.system.itemKey;
		if (itemKey) CONFIG.DC20RPG.UNIQUE_ITEM_IDS.background[itemKey] = item.name;
	});
}