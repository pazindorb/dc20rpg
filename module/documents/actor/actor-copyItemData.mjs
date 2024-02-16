/**
 * Copies some data from actor's items to make it easier to access it later.
 */
export function prepareDataFromItems(actor) {
	if (actor.type === "character") {
		_class(actor);
		_ancestry(actor);
		_subclass(actor);
	}
	_equipment(actor);
	_tools(actor);
	_activeEffects(actor);
}

function _class(actor) {
	const details = actor.system.details;
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
    .filter(([key, sca]) => !["maxHpBonus", "bonusMana", "bonusStamina"].includes(key))
    .forEach(([key, sca]) => scaling[key] = sca.values[level - 1]);

  // Class Category
  details.martial = clazz.system.martial;
	details.spellcaster = clazz.system.spellcaster;

	// Masteries
	Object.entries(clazz.system.masteries).forEach(([key, mastery]) => actorMasteries[key] = mastery);
}

function _ancestry(actor) {
	const details = actor.system.details;
	const movement = actor.system.movement;

	const ancestry = actor.items.get(details.ancestry.id);
	if (!ancestry) return;

	details.size = ancestry.system.size;
	movement.speed.value = ancestry.system.movement.speed;
}

function _subclass(actor) {
	const details = actor.system.details;

	const subclass = actor.items.get(details.subclass.id);
	if (!subclass) return;
}

function _equipment(actor) {
	let equippedArmorBonus = 0;
	let damageReduction = 0;

	actor.items
		.filter(item => item.type === 'equipment')
		.forEach(item => {
			equippedArmorBonus += _getArmorBonus(item);
			damageReduction += _getDamageReduction(item);
		});
	
	actor.system.defences.physical.armorBonus = equippedArmorBonus;
	actor.system.damageReduction.pdr.number = damageReduction;
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

function _getDamageReduction(item) {
  if (!item.system.statuses.equipped) return 0;
  const hasReduction = item.system.properties.damageReduction.active;
  const reductionValue = item.system.properties.damageReduction.value ? item.system.properties.damageReduction.value : 0;
  return hasReduction ? reductionValue : 0;
}