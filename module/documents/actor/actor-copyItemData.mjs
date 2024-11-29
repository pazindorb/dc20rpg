import { toggleCheck } from "../../helpers/items/itemConfig.mjs";
import { getValueFromPath } from "../../helpers/utils.mjs";

/**
 * Copies some data from actor's items to make it easier to access it later.
 */
export function prepareDataFromItems(actor) {
	if (actor.type === "character") {
		_background(actor);
		_class(actor);
		_ancestry(actor);
		_subclass(actor);
	}

	const weapon = [];
	const equipment = [];
	const customResources = []; 
	const conditionals = [];
	const itemsWithEnhancementsToCopy = [];

	actor.items.forEach(item => {
		// Inventory
		if (item.type === 'weapon') weapon.push(item);
		if (item.type === 'equipment') equipment.push(item);

		// Custom Resources
		if (item.system.isResource) customResources.push(item);

		// Conditionals
		if (item.system.conditional?.hasConditional) conditionals.push(item);

		// Copies Enhacements - we only need those for reference when we run our checks on new item creation/edit
		if (item.system.copyEnhancements?.copy) itemsWithEnhancementsToCopy.push({
			itemId: item.id,
			copyFor: item.system.copyEnhancements.copyFor
		});
	});

	_weapon(weapon, actor);
	_equipment(equipment, actor);
	_customResources(customResources, actor);
	_conditionals(conditionals, actor);
	actor.itemsWithEnhancementsToCopy = itemsWithEnhancementsToCopy;
}

/**
 * Some data is expected to be used in item formulas (ex @prime or @combatMastery). 
 * We need to provide those values before we run calculations on items.
 */
export function prepareRollDataForItems(actor) {
	_combatMatery(actor);
	_coreAttributes(actor);
	_attackModAndSaveDC(actor);
	_masteries(actor);
}

function _background(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;

	if (skillPoints.skill.override) skillPoints.skill.max = skillPoints.skill.overridenMax;
	if (skillPoints.trade.override) skillPoints.trade.max = skillPoints.trade.overridenMax;
	if (skillPoints.language.override) skillPoints.language.max = skillPoints.language.overridenMax;
	if (skillPoints.knowledge.override) skillPoints.knowledge.max = skillPoints.knowledge.overridenMax;

	const background = actor.items.get(details.background.id);
	if (!background) return;

	if (!skillPoints.skill.override) skillPoints.skill.max = background.system.skillPoints || 0;
	if (!skillPoints.trade.override) skillPoints.trade.max = background.system.tradePoints || 0;
	if (!skillPoints.language.override) skillPoints.language.max = background.system.langPoints || 0;
	if (!skillPoints.knowledge.override) skillPoints.knowledge.max = 0;
}

function _class(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;
	const attributePoints = actor.system.attributePoints;
	const known = actor.system.known;
	const actorMasteries = actor.system.masteries;
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

  // Custom Resources for Given Level
  Object.entries(clazz.system.scaling)
    .forEach(([key, sca]) => scaling[key] = sca.values[level - 1]);

  // Class Category
  details.martial = clazz.system.martial;
	details.spellcaster = clazz.system.spellcaster;

	// Masteries
	Object.entries(clazz.system.masteries).forEach(([key, mastery]) => actorMasteries[key] = mastery);

	// Skill Points from class 
	skillPoints.skill.max += _getAllUntilIndex(classScaling.skillPoints.values, level - 1);
	skillPoints.trade.max += _getAllUntilIndex(classScaling.tradePoints.values, level - 1);

	// Attribute Point from class
	attributePoints.max += _getAllUntilIndex(classScaling.attributePoints.values, level - 1);

	// Techniques and Spells Known
	known.cantrips.max = _getAllUntilIndex(classScaling.cantripsKnown.values, level - 1);
	known.spells.max = _getAllUntilIndex(classScaling.spellsKnown.values, level - 1);
	known.maneuvers.max = _getAllUntilIndex(classScaling.maneuversKnown.values, level - 1);
	known.techniques.max = _getAllUntilIndex(classScaling.techniquesKnown.values, level - 1);
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

function _weapon(items, actor) {
	let bonusPD = 0;
	items.forEach(item => {
		if (item.system.properties?.guard.active && item.system.statuses.equipped) bonusPD++;
	});
	actor.system.defences.physical.bonuses.always += bonusPD;
} 

function _equipment(items, actor) {
	let collectedData = {
		armorBonus: 0,
		dr: 0,
		maxAgiLimit: false,
		speedPenalty: false,
		armorEquipped: false,
		heavyEquipped: false,
		shieldBonus: 0,
	}
	items.forEach(item => collectedData = _armorData(item, collectedData));

	const physical = actor.system.defences.physical;
	if (collectedData.maxAgiLimit) physical.formulaKey = "standardMaxAgi";
	if (collectedData.speedPenalty)  actor.system.movement.ground.value -= 1;
	physical.bonuses.armor = collectedData.armorBonus;
	physical.bonuses.always += collectedData.shieldBonus;
	actor.system.damageReduction.pdr.number += collectedData.dr;
	actor.system.details.heavyEquipped = collectedData.heavyEquipped;
	actor.system.details.armorEquipped = collectedData.armorEquipped;
}

function _armorData(item, data) {
	if (!item.system.statuses.equipped) return data;

	// Check armor/shield bonus PD
	if (["light", "heavy"].includes(item.system.equipmentType)) data.armorBonus += item.system.armorBonus ? item.system.armorBonus : 0;
	if (["lshield", "hshield"].includes(item.system.equipmentType)) data.shieldBonus += item.system.armorBonus ? item.system.armorBonus : 0;
	
	// Check damage reduction
	data.dr += _getDamageReduction(item);

	// Check armor properties
	if (!data.maxAgiLimit) data.maxAgiLimit = item.system.properties.reinforced.active;
	if (!data.speedPenalty) data.speedPenalty = item.system.properties.dense.active;

	// Check if and which armor is equipped (some effects need that)
	if (!data.armorEquipped && ["light", "heavy"].includes(item.system.equipmentType)) data.armorEquipped = true;
	if (!data.heavyEquipped && ["heavy"].includes(item.system.equipmentType)) data.heavyEquipped = true;
	return data;
}

function _getDamageReduction(item) {
  const hasReduction = item.system.properties.damageReduction.active;
  const reductionValue = item.system.properties.damageReduction.value ? item.system.properties.damageReduction.value : 0;
  return hasReduction ? reductionValue : 0;
}

function _customResources(items, actor) {
	const scaling = actor.system.scaling;
	const level = actor.system.details.level;

	items.forEach(item => {
		const resource = item.system.resource;
		scaling[resource.resourceKey] = _getAllUntilIndex(resource.values, level - 1);
	});
}

function _conditionals(items, actor) {
	items
			.filter(item => toggleCheck(item, item.system.conditional.linkWithToggle))
			.forEach(item => {
				const conditional = item.system.conditional;
				actor.system.conditionals.push(conditional);
			});
}

function _companionCondition(actor, keyToCheck) {
	if (actor.type !== "companion") return false;
	if (!actor.companionOwner) return false;
	return getValueFromPath(actor, `system.shareWithCompanionOwner.${keyToCheck}`);
}

function _combatMatery(actor) {
	if (_companionCondition(actor, "combatMastery")) {
		actor.system.details.combatMastery = actor.companionOwner.system.details.combatMastery;
	}
	else {
		const level = actor.system.details.level;
		actor.system.details.combatMastery = Math.ceil(level/2);
	}
}

function _coreAttributes(actor) {
	const exhaustion = actor.system.exhaustion;
	const attributes = actor.system.attributes;
	const details = actor.system.details;
	
	let primeAttrKey = "mig";
	for (let [key, attribute] of Object.entries(attributes)) {
		if (key === "prime") continue;
		const current = _companionCondition(actor, `attributes.${key}`) 
											? actor.companionOwner.system.attributes[key].value
											: attribute.current
		// Final value (after respecting bonuses)
		attribute.value = current + attribute.bonuses.value;

		// Save Modifier
		if (_companionCondition(actor, `saves.${key}`)) {
			attribute.saveMastery = actor.companionOwner.system.attributes[key].saveMastery
		}
		let save = attribute.saveMastery ? details.combatMastery : 0;
		save += attribute.value + attribute.bonuses.save - exhaustion;
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
			saveMastery: false,
			current: limit,
			value: limit,
			save: limit,
			check: limit,
			bonuses: {
				check: 0,
				value: 0,
				save: 0
			}
		}
	}
	else {
		details.primeAttrKey = primeAttrKey;
		attributes.prime = foundry.utils.deepClone(attributes[primeAttrKey]);
	}
}

function _attackModAndSaveDC(actor) {
	const exhaustion = actor.system.exhaustion;
	const prime = actor.system.attributes.prime.value;
	const CM = actor.system.details.combatMastery;
	const hasSpellcastingMastery = actor.system.masteries.spellcasting;
	const CmOrZero = hasSpellcastingMastery ? CM : 0;

	// Attack Modifier
	const attackMod = actor.system.attackMod;
	const mod = attackMod.value;
	if (_companionCondition(actor, "attackMod")) {
		mod.martial = actor.companionOwner.system.attackMod.value.martial + attackMod.bonus.martial;
		mod.spell = actor.companionOwner.system.attackMod.value.spell + attackMod.bonus.spell;
	}
	else if (!attackMod.flat) {
		mod.martial = prime + CM + attackMod.bonus.martial;
		mod.spell = prime + CmOrZero + attackMod.bonus.spell;
	}
	mod.martial -= exhaustion;
	mod.spell -= exhaustion;

	// Save DC
	const saveDC = actor.system.saveDC;
	const save = saveDC.value;
	if (_companionCondition(actor, "saveDC")) {
		save.martial = actor.companionOwner.system.saveDC.value.martial + saveDC.bonus.martial;
		save.spell = actor.companionOwner.system.saveDC.value.spell + saveDC.bonus.spell;
	}
	else if (!saveDC.flat) {
		save.martial = 10 + prime + CM + saveDC.bonus.martial;
		save.spell = 10 + prime + CmOrZero + saveDC.bonus.spell;
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

function _masteries(actor) {
	if (_companionCondition(actor, "masteries")) {
		actor.system.masteries = actor.companionOwner.system.masteries;
	} 
}