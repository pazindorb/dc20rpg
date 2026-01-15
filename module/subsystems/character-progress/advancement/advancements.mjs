import { collectItemsForType } from "../../../dialogs/compendium-browser/browser-utils.mjs";
import { SimplePopup } from "../../../dialogs/simple-popup.mjs";
import { actorAdvancementDialog } from "./advancement-dialog.mjs";
import { updateAdvancement } from "./advancement-util.mjs";

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
		doNotAddToKnownLimit: false,
		pointAmount: 1,
		talent: false, 
		allowToAddItems: false,
		addItemsOptions: {
			itemType: "",
			preFilters: "",
			helpText: "",
			itemLimit: null,
			classSpellFilter: false
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

export async function handleSpellList(toCheck, toUpdate) {
	// If martial picks spellcaster path he can choose any spelllist.
	// We have to handle that case - we check one class(spellcaster) but update the other(martial)
	if (!toUpdate) toUpdate = toCheck; 

	const filters = toCheck.system.filters;
	if (!filters) return;
	const choice = filters.canChoose;
	if (!choice) return;

	const selected = {
		spellSchool: [],
		spellSource: [],
		spellTags: []
	}

	// Spell Source
	if (choice.spellSource) {
		selected.spellSource = await _chooseSpellList(["arcane", "divine", "primal"], `Select Spell Source (${choice.spellSource})`, "spellSource");
	}
	else {
		selected.spellSource = Object.entries(filters.spellSource).filter(([key, value]) => value).map(([key, value]) => key);
	}

	// Spell School
	if (choice.spellSchool) {
		selected.spellSchool = await _chooseSpellList(["astromancy", "conjuration", "divination", "elemental", "enchantment", "invocation", "nullification", "transmutation"], `Select Spell School (${choice.spellSchool})`, "spellSchool");
	}
	else {
		selected.spellSchool = Object.entries(filters.spellSchool).filter(([key, value]) => value).map(([key, value]) => key);
	}

	// Spell Tags
	selected.spellTags = Object.keys(filters.spellTags);

	// UPDATE
	for (const key of selected.spellSource) {
		await toUpdate.update({[`system.filters.spellSource.${key}`]: true});
	}
	for (const key of selected.spellSchool) {
		await toUpdate.update({[`system.filters.spellSchool.${key}`]: true});
	}
	for (const key of selected.spellTags) {
		const label = CONFIG.DC20RPG.DROPDOWN_DATA.spellTags[key];
		await toUpdate.update({[`system.filters.spellTags.${key}`]: label});
	}
	return selected;
}

async function _chooseSpellList(options, header, type) {
	const inputs = [];
	for (const option of options) {
		inputs.push({
			type: "checkbox",
			label: game.i18n.localize(`dc20rpg.${type}.${option}`)
		})
	}
	const answers = await SimplePopup.open("input", {header: header, inputs: inputs});
	if (!answers) return [];

	const keys = [];
	for (let i = 0; i < answers.length; i++) {
		if (answers[i]) keys.push(options[i]);
	}
	return keys;
}

export async function clearSpellList(item, advancement) {
	const spellList = advancement.providesSpellList;
	for (const key of spellList.spellSource) {
		await item.update({[`system.filters.spellSource.${key}`]: false});
	}
	for (const key of spellList.spellSchool) {
		await item.update({[`system.filters.spellSchool.${key}`]: false});
	}
	for (const key of spellList.spellTags) {
		await item.update({[`system.filters.spellTags.-=${key}`]: null});
	}
	delete advancement.providesSpellList;
  item.update({["system.hasSpellList"]: false})
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
		if (advancement.providesSpellList) await clearSpellList(item, advancement);
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
			await item.update({[`system.advancements.-=${key}`]: null});
		}
		else {
			advancement.applied = false;
			advancement.key = key;
			await updateAdvancement(item, advancement);
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
	CONFIG.DC20RPG.SPELLCASTERS = [];
	CONFIG.DC20RPG.MARTIALS = [];

	const clazz = await collectItemsForType("class");
	clazz.forEach(item => {
		CONFIG.DC20RPG.UNIQUE_ITEM_UUIDS.class[item.uuid] = item.name;
		const itemKey = item.system.itemKey;
		if (item.system.spellcaster) CONFIG.DC20RPG.SPELLCASTERS.push(item);
		if (item.system.martial) CONFIG.DC20RPG.MARTIALS.push(item);
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