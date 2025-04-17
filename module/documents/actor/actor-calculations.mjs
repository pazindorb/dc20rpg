import { companionShare } from "../../helpers/actors/companion.mjs";
import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";

export function makeCalculations(actor) {
	_skillModifiers(actor);
	_specialRollTypes(actor);
	_maxHp(actor);

	if (actor.type === "character") {
		_maxMana(actor);
		_maxStamina(actor);
		_maxGrit(actor);
		_maxRestPoints(actor);

		_skillPoints(actor);
		_attributePoints(actor);
		_spellsAndTechniquesKnown(actor);
		_weaponStyles(actor);
	}
	if (actor.type === "companion") {
		_actionPoints(actor);
	}
	_currentHp(actor);

	_senses(actor);
	_movement(actor);
	_jump(actor);

	_precisionDefence(actor);
	_areaDefence(actor);
	_damageReduction(actor);
	_deathsDoor(actor);
	_basicConditionals(actor);
}

function _skillModifiers(actor) {
	const exhaustion = actor.exhaustion;
	const attributes = actor.system.attributes;
	const expertise = new Set([...actor.system.expertise.automated, ...actor.system.expertise.manual]);

	// Calculate skills modifiers
	const overrideMasteryWithOwner = companionShare(actor, "skills");
	for (let [key, skill] of Object.entries(actor.system.skills)) {
		if (overrideMasteryWithOwner) {
			skill.mastery = actor.companionOwner.system.skills[key].mastery;
		}
		skill.modifier = attributes[skill.baseAttribute].value + (2 * skill.mastery) + skill.bonus - exhaustion;
		if (expertise.has(key)) skill.expertise = true;
	}

	// Calculate trade skill modifiers
	if (actor.type === "character") {
		for (let [key, skill] of Object.entries(actor.system.tradeSkills)) {
			skill.modifier = attributes[skill.baseAttribute].value + (2 * skill.mastery) + skill.bonus - exhaustion;
			if (expertise.has(key)) skill.expertise = true;
		}
	}
}

function _specialRollTypes(actor) {
	const special = {};
	const data = actor.system;

	// precision Save
	const mig = data.attributes.mig;
	const agi = data.attributes.agi;
	special.phySave = Math.max(mig.save, agi.save);
	
	// Mental Save
	const int = data.attributes.int;
	const cha = data.attributes.cha;
	special.menSave = Math.max(int.save, cha.save);

	// Martial Check
	const acr = data.skills.acr;
	const ath = data.skills.ath;
	if (acr && ath) special.marCheck = Math.max(acr.modifier, ath.modifier);

	// Initiative Check
	const CM = actor.system.details.combatMastery;
	special.initiative = agi.check + CM;

	data.special = special;
}

function _actionPoints(actor) {
	if (companionShare(actor, "ap")) {
		actor.system.resources.ap = actor.companionOwner.system.resources.ap;
	}
}

function _maxHp(actor) {
	const details = actor.system.details;
	const health = actor.system.resources.health;
	const might = actor.system.attributes.mig.value;
	const hpFromClass = details.class?.maxHpBonus || 6;
	
	if (health.useFlat) return;
	else {
		health.max = hpFromClass + might + health.bonus;
	}
}

function _maxMana(actor) {
	const mana = actor.system.resources.mana;
	mana.max = evaluateDicelessFormula(mana.maxFormula, actor.getRollData()).total
}

function _maxStamina(actor) {
	const stamina = actor.system.resources.stamina;
	stamina.max = evaluateDicelessFormula(stamina.maxFormula, actor.getRollData()).total
}

function _maxGrit(actor) {
	const grit = actor.system.resources.grit;
	grit.max = evaluateDicelessFormula(grit.maxFormula, actor.getRollData()).total
}

function _maxRestPoints(actor) {
	const restPoints = actor.system.resources.restPoints;
	restPoints.max =  evaluateDicelessFormula(restPoints.maxFormula, actor.getRollData()).total
}

function _skillPoints(actor) {
	const int = actor.system.attributes.int.value;
	const spentPoints = _collectSpentPoints(actor);
	Object.entries(actor.system.skillPoints).forEach(([key, type]) => {
		if (key === "skill") type.max += int;
		type.max += type.extra + type.bonus;
		type.spent += spentPoints[key] + type.converted;
		type.left = type.max - type.spent;
	});
}

function _attributePoints(actor) {
	const attributePoints = actor.system.attributePoints;
	if (attributePoints.override) attributePoints.max = attributePoints.overridenMax;
	attributePoints.max += attributePoints.extra + attributePoints.bonus;
	Object.entries(actor.system.attributes)
						.filter(([key, atr]) => key !== "prime")
						.forEach(([key, atr]) => {
								attributePoints.spent += atr.current +2;
							// players start with -2 in the attribute and spend points from there
						});
	attributePoints.left = attributePoints.max - attributePoints.spent;
}

function _spellsAndTechniquesKnown(actor) {
	const items = actor.items;
	if (items.size <= 0) return;

	const known = actor.system.known;
	const maxCantrips = known.cantrips.max;
	let spells = 0;
	let cantrips = 0;
	let maneuvers = 0;
	let techniques = 0;
	actor.items
		.filter(item => item.system.knownLimit)
		.forEach(item => {
			if (item.type === "technique") {
				if (item.system.techniqueType === "maneuver") maneuvers++;
				else techniques++;
			}
			else if (item.type === "spell") {
				if (item.system.spellType === "cantrip" && cantrips < maxCantrips) cantrips++;
				else spells++;
			}
		});

	known.spells.current = spells;
	known.cantrips.current = cantrips;
	known.maneuvers.current = maneuvers;
	known.techniques.current = techniques;
}

function _collectSpentPoints(actor) {
	const actorSkills = actor.system.skills;
	const actorTrades = actor.system.tradeSkills;
	const actorLanguages = actor.system.languages;
	const manualExpertise = new Set(actor.system.expertise.manual);
	const collected = {
		skill: 0,
		trade: 0,
		language: 0
	}

	// We need to collect skills and expertise (but only from manual)
	Object.entries(actorSkills)
		.forEach(([key, skill]) => {
			collected.skill += skill.mastery;
			if (manualExpertise.has(key)) collected.skill++;
		})

	Object.entries(actorTrades)
		.forEach(([key, trade]) => {
			collected.trade += trade.mastery;
			if (manualExpertise.has(key)) collected.trade++;
		})

	Object.entries(actorLanguages)
		.filter(([key, lang]) => key !== "com")
		.forEach(([key, lang]) => collected.language += lang.mastery)

	return collected;
}

function _currentHp(actor) {
	if (companionShare(actor, "health")) {
		actor.system.resources.health = actor.companionOwner.system.resources.health;
	}
	else {
		const health = actor.system.resources.health;
		if (health.current > health.max) health.current = health.max;
		health.value = health.current + health.temp;
	}
}

function _senses(actor) {
	const sensesTypes = actor.system.senses;

	for (const sense of Object.values(sensesTypes)) {
		let range = sense.override ? sense.overridenRange : sense.range;
		let bonus = sense.bonus;

		// We need to deal with effects like Subterranean Favorite Terrain feature for Ranger
		if (range > 0) bonus += sense.orOption.bonus;
		else range = sense.orOption.range;
		
		sense.value = range + bonus;
	}
}

function _movement(actor) {
	const exhaustion = actor.exhaustion;
	const movements = actor.system.movement;

	const groundSpeed = companionShare(actor, "speed")
												? actor.companionOwner.system.movement.ground.current - exhaustion
												: movements.ground.value + movements.ground.bonus - exhaustion;
	movements.ground.current = groundSpeed > 0 ? groundSpeed : 0;
	for (const [key, movement] of Object.entries(movements)) {
		if (key === "ground") continue;
		
		if (movement.useCustom) {
			const speed = movement.value + movement.bonus - exhaustion;
			movement.current = speed > 0 ? speed : 0;
		}
		else {
			if (movement.fullSpeed) movement.current = groundSpeed + movement.bonus;
			else if (movement.halfSpeed) movement.current = Math.ceil(groundSpeed/2) + movement.bonus;
			else {
				const speed = movement.bonus - exhaustion;
				movement.current = speed > 0 ? speed : 0;
			}
		}
	}
}

function _jump(actor) {
	const jump = actor.system.jump;
	if (jump.key === "flat") {
		jump.current = jump.value + jump.bonus;
	}
	else {
		const attribute = actor.system.attributes[jump.key].value;
		jump.current = (attribute >= 1 ? attribute : 1) + jump.bonus;
	}
}

function _precisionDefence(actor) {
	const pd = actor.system.defences.precision;
	if (companionShare(actor, "defences.precision")) {
		pd.normal = actor.companionOwner.system.defences.precision.value;
	}
	else if (pd.formulaKey !== "flat") {
		const formula = pd.formulaKey === "custom" ? pd.customFormula : CONFIG.DC20RPG.SYSTEM_CONSTANTS.precisionDefenceFormulas[pd.formulaKey];
		pd.normal = evaluateDicelessFormula(formula, actor.getRollData()).total;
	}

	// Add bonueses to defence deppending on equipped armor
	const details = actor.system.details;
	let bonus = pd.bonuses.always;
	if (!details.armorEquipped) bonus += pd.bonuses.noArmor;
	if (!details.heavyEquipped) bonus += pd.bonuses.noHeavy;
	pd.bonuses.final = bonus;
	
	// Calculate Hit Thresholds
	pd.value = pd.normal + bonus;
	pd.heavy = pd.value + 5;
	pd.brutal = pd.value + 10;
}

function _areaDefence(actor) {
	const ad = actor.system.defences.area;
	if (companionShare(actor, "defences.area")) {
		ad.normal = actor.companionOwner.system.defences.area.value;
	}
	else if (ad.formulaKey !== "flat") {
		const formula = ad.formulaKey === "custom" ? ad.customFormula : CONFIG.DC20RPG.SYSTEM_CONSTANTS.areaDefenceFormulas[ad.formulaKey];
		ad.normal = evaluateDicelessFormula(formula, actor.getRollData()).total;
	}

	// Add bonueses to defence deppending on equipped armor
	const details = actor.system.details;
	let bonus = ad.bonuses.always;
	if (!details.armorEquipped) {
		if (!details.heavyEquipped) bonus += ad.bonuses.noHeavy;
		bonus += ad.bonuses.noArmor;
	}
	ad.bonuses.final = bonus;
	
	// Calculate Hit Thresholds
	ad.value = ad.normal + bonus;
	ad.heavy = ad.value + 5;
	ad.brutal = ad.value + 10;
}

function _damageReduction(actor) {
	if (companionShare(actor, "damageReduction.pdr")) actor.system.damageReduction.pdr.active = actor.companionOwner.system.damageReduction.pdr.active;
	if (companionShare(actor, "damageReduction.mdr")) actor.system.damageReduction.mdr.active = actor.companionOwner.system.damageReduction.mdr.active;
	if (companionShare(actor, "damageReduction.edr")) actor.system.damageReduction.edr.active = actor.companionOwner.system.damageReduction.edr.active;
}

function _deathsDoor(actor) {
	const death = actor.system.death;
	const currentHp = actor.system.resources.health.current;
	const prime = actor.system.attributes.prime.value;
	const combatMastery = actor.system.details.combatMastery;

	const treshold = -prime - combatMastery - death.bonus;
	death.treshold = treshold < 0 ? treshold : 0;
	if (currentHp <= 0) death.active = true;
	else death.active = false;
}

function _basicConditionals(actor) {
	actor.system.conditionals.push({
		condition: `hit >= 5`, 
		bonus: '1', 
		useFor: `system.properties.impact.active=[true]`, 
		name: "Impact",
		linkWithToggle: false,
		flags: {
			ignorePdr: false,
			ignoreEdr: false,
			ignoreMdr: false,
			ignoreResistance: {},
			ignoreImmune: {}
		},
		effect: null,
		addsNewRollRequest: false,
    rollRequest: {
      category: "",
      saveKey: "",
      contestedKey: "",
      dcCalculation: "",
      dc: 0,
      addMasteryToDC: true,
      respectSizeRules: false,
    },
	})
}

function _weaponStyles(actor) {
	const conditionals = [
		_conditionBuilder("axe", '["bleeding"]'),
		_conditionBuilder("bow", '["slowed"]'),
		_conditionBuilder("fist", '["grappled"]'),
		_conditionBuilder("hammer", '["dazed", "petrified"]'),
		_conditionBuilder("pick", '["impaired"]'),
		_conditionBuilder("staff", '["hindered"]'),
		_conditionBuilder("sword", '["exposed"]'),
	];
	conditionals.forEach(conditional => actor.system.conditionals.push(conditional));
}

function _conditionBuilder(weaponStyle, conditions) {
	const weaponStyleLabel = getLabelFromKey(weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)
	return {
		condition: `target.hasAnyCondition(${conditions})`, 
		bonus: '1', 
		useFor: `system.weaponStyle=["${weaponStyle}"]&&system.weaponStyleActive=[${true}]`, 
		name: `${weaponStyleLabel} Passive`,
		linkWithToggle: false,
		flags: {
			ignorePdr: false,
			ignoreEdr: false,
			ignoreMdr: false,
			ignoreResistance: {},
			ignoreImmune: {}
		},
		effect: null,
		addsNewRollRequest: false,
    rollRequest: {
      category: "",
      saveKey: "",
      contestedKey: "",
      dcCalculation: "",
      dc: 0,
      addMasteryToDC: true,
      respectSizeRules: false,
    },
	}
}