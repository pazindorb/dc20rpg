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
	_equipment(actor);
	_tools(actor);
	_activeEffects(actor);
	_customResources(actor);
}

/**
 * Some data is expected to be used in item formulas (ex @prime or @combatMastery). 
 * We need to provide those values before we run calculations on items.
 */
export function prepareRollDataForItems(actor) {
	_combatMatery(actor);
	_coreAttributes(actor);
	_attackModAndSaveDC(actor);
}

function _background(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;

	const background = actor.items.get(details.background.id);
	if (!background) return;

	skillPoints.skill.max = background.system.skillPoints || 0;
	skillPoints.trade.max = background.system.tradePoints || 0;
	skillPoints.language.max = background.system.langPoints || 0;
}

function _class(actor) {
	const details = actor.system.details;
	const skillPoints = actor.system.skillPoints;
	const attributePoints = actor.system.attributePoints;
	const restPoints =  actor.system.rest.restPoints;
	const actorMasteries = actor.system.masteries;
  const scaling = actor.system.scaling;

	const clazz = actor.items.get(details.class.id);
	if (!clazz) return;

  // Level and Rest Points
  const level = clazz.system.level;
	details.level = level;
	restPoints.max = level;

  // Resources for Given Level
	details.class.maxHpBonus = clazz.system.scaling.maxHpBonus.values[level - 1];
  details.class.bonusMana = clazz.system.scaling.bonusMana.values[level - 1];
  details.class.bonusStamina = clazz.system.scaling.bonusStamina.values[level - 1];

  // Custom Resources for Given Level
  Object.entries(clazz.system.scaling)
    .filter(([key, sca]) => !sca.core)
    .forEach(([key, sca]) => scaling[key] = sca.values[level - 1]);

  // Class Category
  details.martial = clazz.system.martial;
	details.spellcaster = clazz.system.spellcaster;

	// Masteries
	Object.entries(clazz.system.masteries).forEach(([key, mastery]) => actorMasteries[key] = mastery);

	// Skill Points from class 
	skillPoints.skill.max += clazz.system.scaling.skillPoints.values[level - 1];
	skillPoints.trade.max += clazz.system.scaling.tradePoints.values[level - 1];

	// Attribute Point from class
	attributePoints.max += clazz.system.scaling.attributePoints.values[level - 1];
}

function _ancestry(actor) {
	const details = actor.system.details;
	const movement = actor.system.movement;
	const size = actor.system.size;

	const ancestry = actor.items.get(details.ancestry.id);
	if (!ancestry) return;

	if (size.fromAncestry) size.size = ancestry.system.size;
	if (!movement.ground.useCustom) movement.ground.value = ancestry.system.movement.speed;
}

function _subclass(actor) {
	const details = actor.system.details;

	const subclass = actor.items.get(details.subclass.id);
	if (!subclass) return;
}

function _equipment(actor) {
	let equippedArmorBonus = 0;
	let damageReduction = 0;
	let maxAgiLimit = false;
	let speedPenalty = false;

	actor.items
		.filter(item => item.type === 'equipment')
		.forEach(item => {
			equippedArmorBonus += _getArmorBonus(item);
			damageReduction += _getDamageReduction(item);
			if (!maxAgiLimit) maxAgiLimit = _checkMaxAgiLimit(item);
			if (!speedPenalty) speedPenalty = _checkSpeedPenalty(item);
		});
	
	const defences = actor.system.defences;
	if (maxAgiLimit) defences.physical.formulaKey = "standardMaxAgi";
	if (speedPenalty)  actor.system.movement.ground.value -= 1;
	defences.physical.armorBonus = equippedArmorBonus;
	actor.system.damageReduction.pdr.number += damageReduction;
}

function _tools(actor) {
	actor.items
		.filter(item => item.type === 'tool')
		.forEach(item => {
			const tradeSkillKey = item.system.tradeSkillKey;
			const rollBonus = item.system.rollBonus;
			if (tradeSkillKey) {
				const bonus = rollBonus ? rollBonus : 0;
				actor.system.tradeSkills[tradeSkillKey].bonus += bonus;
			}
		});
}

function _activeEffects(actor) {
	const equippedEffects = [];
	const attunedEffects = [];
	const activableEffects = [];

	actor.items.forEach(item => {
		// Activable Effects
		const hasEffects = item.system.activableEffect?.hasEffects;
		if (hasEffects) activableEffects.push(item);

		// Equipped and Attuned Items Effects
		const hasStatuses = item.system.statuses;
		const hasAttunement = item.system.properties?.attunement.active;
		if (hasStatuses && hasAttunement) attunedEffects.push(item); 
		else if (hasStatuses) equippedEffects.push(item);
	});

	_activableEffects(activableEffects, actor);
	_equippedEffects(equippedEffects, actor);
	_attunedEffects(attunedEffects, actor);
}

function _activableEffects(items, actor) {
	items.forEach(item => {
		const activableEffect = item.system.activableEffect;
		const origin = `Actor.${actor._id}.Item.${item._id}`;
		actor.effects.forEach(effect => {
			if(effect.origin === origin) effect.update({["disabled"]: !activableEffect.active});
		});
	});
}

function _equippedEffects(items, actor) {
	items.forEach(item => {
		const statuses = item.system.statuses;
		const origin = `Actor.${actor._id}.Item.${item._id}`;
		actor.effects.forEach(effect => {
			if(effect.origin === origin) effect.update({["disabled"]: !statuses.equipped});
		});
	});
}

function _attunedEffects(items, actor) {
	items.forEach(item => {
		const statuses = item.system.statuses;
		const equippedAndAttuned = statuses.equipped && statuses.attuned;
		const origin = `Actor.${actor._id}.Item.${item._id}`;
		actor.effects.forEach(effect => {
			if(effect.origin === origin) effect.update({["disabled"]: !equippedAndAttuned});
		});
	});
}

function _getArmorBonus(item) {
  if (!item.system.statuses.equipped) return 0;
  return item.system.armorBonus ? item.system.armorBonus : 0;
}

function _checkMaxAgiLimit(item) {
	if (!item.system.statuses.equipped) return 0;
	return item.system.properties.maxAgiLimit.active;
}

function _checkSpeedPenalty(item) {
	if (!item.system.statuses.equipped) return 0;
	return item.system.properties.speedPenalty.active;
}

function _getDamageReduction(item) {
  if (!item.system.statuses.equipped) return 0;
  const hasReduction = item.system.properties.damageReduction.active;
  const reductionValue = item.system.properties.damageReduction.value ? item.system.properties.damageReduction.value : 0;
  return hasReduction ? reductionValue : 0;
}

function _customResources(actor) {
	const scaling = actor.system.scaling;
	const level = actor.system.details.level;

	actor.items
		.filter(item => item.system.isResource)
		.forEach(item => {
			const resource = item.system.resource;
			scaling[resource.resourceKey] = resource.values[level - 1];
		});
}

function _combatMatery(actor) {
  const level = actor.system.details.level;
  actor.system.details.combatMastery = Math.ceil(level/2);
}

function _coreAttributes(actor) {
	const exhaustion = actor.system.exhaustion;
	const attributes = actor.system.attributes;
	const details = actor.system.details;

	let primeAttrKey = "mig";
	for (let [key, attribute] of Object.entries(attributes)) {
		let save = attribute.saveMastery ? details.combatMastery : 0;
		save += attribute.value + attribute.bonuses.save - exhaustion;
		attribute.save = save;

		const check = attribute.value + attribute.bonuses.check - exhaustion;
		attribute.check = check;

		if (attribute.value >= attributes[primeAttrKey].value) primeAttrKey = key;
	}
	details.primeAttrKey = primeAttrKey;
	attributes.prime = foundry.utils.deepClone(attributes[primeAttrKey]);
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
	if (!attackMod.flat) {
		mod.martial = prime + CM + attackMod.bonus.martial;
		mod.spell = prime + CmOrZero + attackMod.bonus.spell;
	}
	mod.martial -= exhaustion;
	mod.spell -= exhaustion;

	// Save DC
	const saveDC = actor.system.saveDC;
	const save = saveDC.value;
	if (!saveDC.flat) {
		save.martial = 8 + prime + CM + saveDC.bonus.martial;
		save.spell = 8 + prime + CmOrZero + saveDC.bonus.spell;
	}
	save.martial -= exhaustion;
	save.spell -= exhaustion;
}