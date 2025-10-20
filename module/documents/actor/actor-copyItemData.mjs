import { companionShare } from "../../helpers/actors/companion.mjs";
import { toggleCheck } from "../../helpers/items/itemConfig.mjs";

/**
 * Copies some data from actor's items to make it easier to access it later.
 */
export function prepareDataFromItems(actor) {
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
		const conds = item.system.conditionals;
		if (conds && Object.keys(conds).length > 0) conditionals.push(item);

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
	_attackModAndSaveDC(actor);
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
	actor.system.defences.precision.bonuses.always += bonusPD;
} 

function _equipment(items, actor) {
	let collectedData = {
		adBonus: 0,
		pdBonus: 0,
		shieldBonus: {
			adBonus: 0,
			pdBonus: 0,
			shieldsWielded: 0
		},
		pdr: false,
		edr: false,
		speedPenalty: 0,
		agiCheckDis: 0,
		lackArmorTraining: false,
		lackShieldTraining: false,
	}
	items.forEach(item => _armorData(item, collectedData, actor));
	_implementEquipmentData(actor, collectedData);
}

function _armorData(item, data, actor) {
	if (!item.system.statuses.equipped) return data;

	const combatTraining = actor.system.combatTraining;
	const properties = item.system.properties;
	const equipmentType = item.system.equipmentType;

	if (properties.pdr.active) data.pdr = true;
	if (properties.edr.active) data.edr = true;
	if (properties.bulky.active) data.speedPenalty++;
	if (properties.rigid.active) data.agiCheckDis++;

	if (["light", "heavy"].includes(equipmentType)) {
		if (equipmentType === "heavy") {
			if (!combatTraining.heavyArmor) data.lackArmorTraining = true;
		}
		else {
			if (!combatTraining.lightArmor) data.lackArmorTraining = true;
		}
	}
	if (["lshield", "hshield"].includes(item.system.equipmentType)) {
		if (properties.pdIncrease.active) data.shieldBonus.pdBonus = properties.pdIncrease.value;
		if (properties.adIncrease.active) data.shieldBonus.adBonus = properties.adIncrease.value;
		data.shieldBonus.shieldsWielded++;

		if (equipmentType === "hshield") {
			if (!combatTraining.heavyShield) data.lackShieldTraining = true;
		}
		else {
			if (!combatTraining.lightShield) data.lackShieldTraining = true;
		}
	}
	else {
		if (properties.pdIncrease.active) data.pdBonus += properties.pdIncrease.value;
		if (properties.adIncrease.active) data.adBonus += properties.adIncrease.value;
	}
	return data;
}

function _implementEquipmentData(actor, collectedData) {
	const pd = actor.system.defences.precision;
	const ad = actor.system.defences.area;
	const details = actor.system.details;

	if (collectedData.speedPenalty > 0) actor.system.movement.ground.value -= collectedData.speedPenalty;
	for (let i = 0; i < collectedData.agiCheckDis; i++) {
		actor.system.rollLevel.onYou.checks.agi.push('"value": 1, "type": "dis", "label": "Equipped Armor/Shield"');
	}

	// Lack Shield Training
	if (collectedData.lackShieldTraining) {
		actor.system.rollLevel.onYou.martial.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.rollLevel.onYou.martial.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.rollLevel.onYou.spell.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.rollLevel.onYou.spell.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.rollLevel.onYou.checks.att.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
		actor.system.rollLevel.onYou.checks.spe.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Shield"');
	}

	// Lack Armor Training
	if (collectedData.lackArmorTraining) {
		actor.system.rollLevel.onYou.martial.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.rollLevel.onYou.martial.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.rollLevel.onYou.spell.melee.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.rollLevel.onYou.spell.ranged.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.rollLevel.onYou.checks.att.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
		actor.system.rollLevel.onYou.checks.spe.push('"value": 1, "type": "dis", "label": "You lack Combat Training in equipped Armor"');
	}

	// Armor bonus
	pd.bonuses.always += collectedData.pdBonus + collectedData.shieldBonus.pdBonus;
	ad.bonuses.always += collectedData.adBonus + collectedData.shieldBonus.adBonus;

	// Wielding Two Shields makes player ignore flanking
	if (collectedData.shieldBonus.shieldsWielded >= 2) {
		actor.system.globalModifier.ignore.flanking = true;
	}

	// PDR and EDR
	if (collectedData.pdr) actor.system.damageReduction.pdr.active = true;
	if (collectedData.edr) actor.system.damageReduction.edr.active = true;
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
	for (const item of items) {
		if (item.type === "infusion") continue; // We want to skip conditionals from infusons
		for (const cond of Object.values(item.system.conditionals)) {
			if (toggleCheck(item, cond.linkWithToggle)) {
				actor.system.conditionals.push(cond);
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

function _attackModAndSaveDC(actor) {
	const exhaustion = actor.exhaustion;
	const prime = actor.system.attributes.prime.value;
	const CM = actor.system.details.combatMastery;

	// Attack Modifier
	const attackMod = actor.system.attackMod;
	const mod = attackMod.value;
	if (companionShare(actor, "attackMod")) {
		mod.martial = actor.companionOwner.system.attackMod.value.martial + attackMod.bonus.martial;
		mod.spell = actor.companionOwner.system.attackMod.value.spell + attackMod.bonus.spell;
	}
	else if (!attackMod.flat) {
		mod.martial = prime + CM + attackMod.bonus.martial;
		mod.spell = prime + CM + attackMod.bonus.spell;
	}
	mod.martial -= exhaustion;
	mod.spell -= exhaustion;

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
	} 
}