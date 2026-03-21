import { companionShare } from "../../helpers/actors/companion.mjs";
import { toggleCheck } from "../../helpers/items/itemConfig.mjs";

/**
 * Copies some data from actor's items to make it easier to access it later.
 */
export function prepareDataFromItems(actor) {
	const equipment = [];
	const customResources = []; 
	const targetModifiers = [];
	const itemsWithEnhancementsToCopy = [];
	const properties = [];
	let staminaFeature = false;

	actor.items.forEach(item => {
		if (item.type === 'equipment' && item.equipped) equipment.push(item);

		// Properties
		if (item.system.properties && item.equipped) {
			if (item.type === 'spellFocus') {
				if (item.system.combatTraining) properties.push(item); // For spell focus you need combat training
			}
			else properties.push(item);
		}

		// Custom Resources
		if (item.system.isResource) customResources.push(item);

		// Mark Stamina Feature
		if (item.system.staminaFeature) staminaFeature = true;

		// Target Modifiers
		const tm = item.system.targetModifiers;
		if (tm && Object.keys(tm).length > 0) targetModifiers.push(item);

		// Copies Enhacements - we only need those for reference when we run our checks on new item creation/edit
		if (item.system.copyEnhancements?.copy) itemsWithEnhancementsToCopy.push({
			itemId: item.id,
			copyFor: item.system.copyEnhancements.copyFor
		});
	});

	_equipment(equipment, actor);
	_properties(properties, actor);
	_customResources(customResources, actor);
	_targetModifiers(targetModifiers, actor);
	actor.itemsWithEnhancementsToCopy = itemsWithEnhancementsToCopy;
	actor.system.details.staminaFeature = staminaFeature;
}

export function prepareUniqueItemData(actor) {
	if (actor.type === "character") {
		_background(actor);
		_class(actor);
		_ancestry(actor);
		_subclass(actor);
	}
}

export function prepareEquippedItemsFlags(actor) {
	const equippedFlags = {
		armorEquipped: false,
		heavyEquipped: false,
		shieldEquipped: false,
		shieldBonus: {
			ad: 0,
			pd: 0
		},
	}

	actor.items.forEach(item => {
		if (item.type === 'equipment' && item.system.statuses.equipped) {
			if (["light", "heavy"].includes(item.system.equipmentType)) {
				equippedFlags.armorEquipped = true;
			}
			if (["heavy"].includes(item.system.equipmentType)) {
				equippedFlags.heavyEquipped = true;
			}
			if (["lshield", "hshield"].includes(item.system.equipmentType)) {
				equippedFlags.shieldEquipped = true;
				const properties = item.system.properties;
				
				if (properties.adIncrease.active) {
					equippedFlags.shieldBonus.ad = properties.adIncrease.value;
				}
				if (properties.pdIncrease.active) {
					equippedFlags.shieldBonus.pd = properties.pdIncrease.value;
				}
				
			}
		}
	});
	actor.system.details.armor = {
		armorEquipped: equippedFlags.armorEquipped,
		heavyEquipped: equippedFlags.heavyEquipped,
		shieldEquipped: equippedFlags.shieldEquipped,
		shieldBonus: equippedFlags.shieldBonus
	}
}

/**
 * Some data is expected to be used in item formulas (ex @prime or @combatMastery). 
 * We need to provide those values before we run calculations on items.
 */
export function prepareRollDataForItems(actor) {
	_combatMatery(actor);
	_coreAttributes(actor);
	_modifierAndSaveDC(actor);
	_combatTraining(actor);
}

function _background(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;

	if (skillPoints.skill.override) skillPoints.skill.max = skillPoints.skill.overridenMax;
	if (skillPoints.trade.override) skillPoints.trade.max = skillPoints.trade.overridenMax;
	if (skillPoints.language.override) skillPoints.language.max = skillPoints.language.overridenMax;

	const background = actor.items.get(details.background.id);
	if (!background) return;

	if (!skillPoints.skill.override) skillPoints.skill.max = background.system.skillPoints || 0;
	if (!skillPoints.trade.override) skillPoints.trade.max = background.system.tradePoints || 0;
	if (!skillPoints.language.override) skillPoints.language.max = background.system.langPoints || 0
}

function _class(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;
	const attributePoints = actor.system.attributePoints;
	const known = actor.system.known;
	const combatTraining = actor.system.combatTraining;
  const scaling = actor.system.scaling;

	const clazz = actor.items.get(details.class.id);
	if (!clazz) return;

  // Level
  const level = clazz.system.level;
	details.level = level;

	const classScaling = clazz.system.scaling;

  // Resources for Given Level
	details.class.maxHpBonus = _getAllUntilIndex(classScaling.maxHpBonus.values, level - 1);
  details.class.bonusMana = _getAllUntilIndex(classScaling.bonusMana.values, level - 1);
  details.class.bonusStamina = _getAllUntilIndex(classScaling.bonusStamina.values, level - 1);
	details.class.classKey = clazz.system.itemKey;

  // Custom Resources for Given Level
  Object.entries(clazz.system.scaling)
    .forEach(([key, sca]) => scaling[key] = sca.values[level - 1]);

  // Class Category
  details.martial = clazz.system.martial;
	details.spellcaster = clazz.system.spellcaster;

	// Combat Training
	Object.entries(clazz.system.combatTraining).forEach(([key, training]) => combatTraining[key] = training);

	// Skill Points from class 
	skillPoints.skill.max += _getAllUntilIndex(classScaling.skillPoints.values, level - 1);
	skillPoints.trade.max += _getAllUntilIndex(classScaling.tradePoints.values, level - 1);

	// Attribute Point from class
	attributePoints.max += _getAllUntilIndex(classScaling.attributePoints.values, level - 1);

	// Maneuvers and Spells Known
	known.spells.max = _getAllUntilIndex(classScaling.spellsKnown.values, level - 1);
	known.maneuvers.max = _getAllUntilIndex(classScaling.maneuversKnown.values, level - 1);

	// Class Filters
	details.class.filters = clazz.system.filters;
	details.class.hasSpellList = clazz.system.hasSpellList;
}

function _ancestry(actor) {
	const details = actor.system.details;
	const movement = actor.system.movement;

	const ancestry = actor.items.get(details.ancestry.id);
	if (!ancestry) return;

	if (!movement.ground.useCustom) movement.ground.value = ancestry.system.movement.speed;
}

function _subclass(actor) {
	const details = actor.system.details;

	const subclass = actor.items.get(details.subclass.id);
	if (!subclass) return;
}

function _properties(items, actor) {
	const activeProperties = new Map();

	// Collect active properties
	for (const item of items) {
		const properties = item.system.properties;
		for (const [key, property] of Object.entries(properties)) {
			if (!property.active) continue;

			if (activeProperties.has(key)) {
				const arr = activeProperties.get(key);
				arr.push({property: property, item: item});
				activeProperties.set(key, arr)
			}
			else {
				activeProperties.set(key, [{property: property, item: item}]);
			}
		}
	}

	// Run methods for active properties
	for (const [key, array] of activeProperties) {
		const applyProperty = CONFIG.DC20RPG.PROPERTIES[key].applyProperty;
		if (applyProperty) applyProperty(actor, array);
	}
}

function _equipment(items, actor) {
	let lackShieldTraining = false;
	let lackArmorTraining = false;
	let shieldWielded = 0;

	// Collect Equipment Data
	for (const item of items) {
		const type = item.system.equipmentType;
		const combatTraining = item.system.combatTraining;
		if (["light", "heavy"].includes(type)) { 
			if (!combatTraining) lackArmorTraining = true;
		}
		if (["lshield", "hshield"].includes(type)) { 
			if (!combatTraining) lackShieldTraining = true;
			shieldWielded++;
		}
	}

	// Lack Shield Training
	if (lackShieldTraining) {
		actor.system.dynamicRollModifier.onYou.martial.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.martial.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.martial.area.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.spell.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.spell.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.spell.area.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.checks.att.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.checks.mar.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.dynamicRollModifier.onYou.checks.spe.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
	}

	// Lack Armor Training
	if (lackArmorTraining) {
		actor.system.dynamicRollModifier.onYou.martial.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.martial.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.martial.area.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.spell.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.spell.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.spell.area.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.checks.att.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.checks.mar.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.dynamicRollModifier.onYou.checks.spe.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
	}

	// Wielding Two Shields makes player ignore flanking
	if (shieldWielded >= 2) {
		actor.system.globalModifier.ignore.flanking = true;
	}
}

function _customResources(items, actor) {
	const scaling = actor.system.scaling;
	const level = actor.system.details.level;

	items.forEach(item => {
		const resource = item.system.resource;
		scaling[resource.resourceKey] = _getAllUntilIndex(resource.values, level - 1);
	});
}

function _targetModifiers(items, actor) {
	for (const item of items) {
		if (item.type === "infusion") continue; // We want to skip target modifier from infusons
		for (const tm of Object.values(item.system.targetModifiers)) {
			if (toggleCheck(item, tm.linkWithToggle)) {
				actor.system.targetModifiers.push(tm);
			}
		}
	}
}

function _combatMatery(actor) {
	if (companionShare(actor, "combatMastery")) {
		actor.system.details.combatMastery = actor.companionOwner.system.details.combatMastery;
	}
	else {
		const level = actor.system.details.level;
		actor.system.details.combatMastery = Math.ceil(level/2);
	}
}

function _coreAttributes(actor) {
	const exhaustion = actor.exhaustion;
	const attributes = actor.system.attributes;
	const details = actor.system.details;
	
	let primeAttrKey = "mig";
	for (let [key, attribute] of Object.entries(attributes)) {
		if (key === "prime") continue;
		const current = companionShare(actor, `attributes.${key}`) 
											? actor.companionOwner.system.attributes[key].value
											: attribute.current
		// Final value (after respecting bonuses) (-2 is a lower limit for characters)
		attribute.value = current + attribute.bonuses.value;
		if (actor.type === "character") attribute.value = Math.max(attribute.value, -2);

		// Save Modifier
		if (companionShare(actor, `saves.${key}`)) {
			attribute.saveMastery = actor.companionOwner.system.attributes[key].saveMastery
		}
		const save = attribute.value + details.combatMastery + attribute.bonuses.save - exhaustion;
		attribute.save = save;

		// Check Modifier
		const check = attribute.value + attribute.bonuses.check - exhaustion;
		attribute.check = check;

		if (attribute.value >= attributes[primeAttrKey].value) primeAttrKey = key;
	}
	const useMaxPrime = game.settings.get("dc20rpg", "useMaxPrime");
	if (useMaxPrime && actor.type === "character") {
		details.primeAttrKey = "maxPrime";
		const level = actor.system.details.level;
		const limit = 3 + Math.floor(level/5);
		attributes.prime = {
			saveMastery: true,
			current: limit,
			value: limit,
			save: limit + details.combatMastery - exhaustion,
			check: limit - exhaustion,
			label: "Prime",
			bonuses: {
				check: 0,
				value: 0,
				save: 0
			}
		}
	}
	else {
		if (companionShare(actor, "prime")) {
			const ownerPrime = actor.companionOwner.system.attributes.prime;
			if (ownerPrime) {
				details.primeAttrKey = "prime";
				attributes.prime = foundry.utils.deepClone(ownerPrime);
			}
			else {
				details.primeAttrKey = primeAttrKey;
				attributes.prime = foundry.utils.deepClone(attributes[primeAttrKey]);
			}
		}
		else {
			details.primeAttrKey = primeAttrKey;
			attributes.prime = foundry.utils.deepClone(attributes[primeAttrKey]);
		}
	}
}

function _modifierAndSaveDC(actor) {
	const exhaustion = actor.exhaustion;
	const prime = actor.system.attributes.prime.value;
	const CM = actor.system.details.combatMastery;

	// Attack Modifier
	const attackMod = actor.system.attackMod;
	const attack = attackMod.value;
	if (companionShare(actor, "attackMod")) {
		attack.martial = actor.companionOwner.system.attackMod.value.martial + attackMod.bonus.martial;
		attack.spell = actor.companionOwner.system.attackMod.value.spell + attackMod.bonus.spell;
	}
	else if (!attackMod.flat) {
		attack.martial = prime + CM + attackMod.bonus.martial;
		attack.spell = prime + CM + attackMod.bonus.spell;
	}
	attack.martial -= exhaustion;
	attack.spell -= exhaustion;

	// Check Modifier
	const checkMod = actor.system.checkMod;
	const check = checkMod.value;
	if (companionShare(actor, "checkMod")) {
		check.martial = actor.companionOwner.system.checkMod.value.martial + checkMod.bonus.martial;
		check.spell = actor.companionOwner.system.checkMod.value.spell + checkMod.bonus.spell;
	}
	else if (!checkMod.flat) {
		check.martial = prime + CM + checkMod.bonus.martial;
		check.spell = prime + CM + checkMod.bonus.spell;
	}
	check.martial -= exhaustion;
	check.spell -= exhaustion;

	// Save DC
	const saveDC = actor.system.saveDC;
	const save = saveDC.value;
	if (companionShare(actor, "saveDC")) {
		save.martial = actor.companionOwner.system.saveDC.value.martial + saveDC.bonus.martial;
		save.spell = actor.companionOwner.system.saveDC.value.spell + saveDC.bonus.spell;
	}
	else if (!saveDC.flat) {
		save.martial = 10 + prime + CM + saveDC.bonus.martial;
		save.spell = 10 + prime + CM + saveDC.bonus.spell;
	}
	save.martial -= exhaustion;
	save.spell -= exhaustion;
}

function _getAllUntilIndex(table, index) {
	if (table.length <= 0) return 0;

	let sum = 0;
	for (let i = 0; i <= index; i++) {
		sum += table[i];
	}
	return sum;
}

function _combatTraining(actor) {
	if (companionShare(actor, "combatTraining")) {
		actor.system.combatTraining = actor.companionOwner.system.combatTraining;
		return;
	} 

	// Martial/Spellcaster path gives you weapon/spellFocus training
	if (actor.type === "character" && actor.class) {
		const advancements = Object.values(actor.class.system.advancements);
		for (const advancement of advancements) {
			if (!advancement.applied) continue;
			if (advancement.mastery === "spellcaster") actor.system.combatTraining.spellFocuses = true;
			if (advancement.mastery === "martial") actor.system.combatTraining.weapons = true;
		}
	}
}