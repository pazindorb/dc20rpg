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
		_manaSpendLimit(actor);
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
	// Calculate skills modifiers
	for (let [key, skill] of Object.entries(actor.system.skills)) {
		if (actor.shouldShareWithOwner("skills")) {
			skill.mastery = actor.companionOwner.system.skills[key].mastery;
		}
		_skillModifier(skill, key, actor);
	}

	// Calculate trade skill modifiers
	if (actor.type === "character") {
		for (let [key, skill] of Object.entries(actor.system.trades)) {
			_skillModifier(skill, key, actor);
		}
	}

	// Prepare Language label
	for (let [key, language] of Object.entries(actor.system.languages)) {
		language.masteryLimit = 2;
    language.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.languageMasteryLabel[language.mastery];
	}
}

function _skillModifier(skill, key, actor) {
	const attributes = actor.system.attributes;
	const expertise = new Set([...actor.system.expertise.automated, ...actor.system.expertise.manual]);
	const levelIncrease = new Set(actor.system.expertise.levelIncrease);

	if (levelIncrease.has(key)) {
		skill.mastery += 1;
		skill.expertiseIncrease = true;				
	}
	if (skill.baseAttribute === "max") {
		skill.baseAttribute = _highestAttribute(skill.attributes, actor);
		skill.highestSelected = true;
	}
	if (expertise.has(key)) skill.expertise = true;
	skill.modifier = attributes[skill.baseAttribute].value + (2 * skill.mastery) + skill.bonus - actor.exhaustion;
	skill.masteryLimit = _masteryLimit(actor, skill.expertise);
	skill.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.skillMasteryLabel[skill.mastery];
}

function _highestAttribute(attributes, actor) {
	let highestKey = "";
	if (!attributes) return "int"; // fallback for outdated actors - remove one day :)

	const actorAtt = actor.system.attributes;
	for (const key of attributes) {
		if (!highestKey) {
			highestKey = key;
		}

		if (actorAtt[highestKey].value < actorAtt[key].value) {
			highestKey = key;
		}
	}
	return highestKey;
}

function _masteryLimit(actor, expertise) {
  if (actor.type !== "character") return 5;

  const level = actor.system.details.level;
  const masteryLimit = 1 + Math.floor(level/5) + (expertise ? 1 : 0);
  return Math.min(masteryLimit, 5); // Grandmaster is a limit for now
}

function _specialRollTypes(actor) {
	const special = {};
	const data = actor.system;

	// Physical Save
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

	// Language Check
	special.languageCheck = Math.max(int.check, cha.check);

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
	mana.max = evaluateDicelessFormula(mana.maxFormula, actor.getRollData()).total - mana.infusions;
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
	actor.system.resources.restPoints.max =  actor.system.resources.health.max;
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
	const maxInfusions = known.infusions.max;
	let spells = 0;
	let cantrips = 0;
	let infusions = 0;
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
			else if (item.type === "infusion") {
				if (infusions < maxInfusions) infusions++;
				else spells++;
			}
		});

	known.spells.current = spells;
	known.cantrips.current = cantrips;
	known.infusions.current = infusions;
	known.maneuvers.current = maneuvers;
	known.techniques.current = techniques;
}

function _collectSpentPoints(actor) {
	const actorSkills = actor.system.skills;
	const actorTrades = actor.system.trades;
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
	let value = jump.key === "flat" ? jump.value : actor.system.attributes[jump.key].value; 
	if (value <= 0) value = 1;
	jump.current = (value + jump.bonus) * jump.multiplier;
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
	const details = actor.system.details.armor;
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
	const details = actor.system.details.armor;
	let bonus = ad.bonuses.always;
	if (!details.armorEquipped) bonus += ad.bonuses.noArmor;
	if (!details.heavyEquipped) bonus += ad.bonuses.noHeavy;
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

function _manaSpendLimit(actor) {
	const combatMastery = actor.system.details.combatMastery;
	const msl = actor.system.details.manaSpendLimit;
	msl.value = combatMastery + msl.bonus;
}

function _basicConditionals(actor) {
	// Impact property
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
			ignoreImmune: {},
			reduceAd: "",
			reducePd: ""
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
	});

	// Impactful Unarmed Strikes
	if (actor.system.details.armor.heavyEquipped) {
		actor.system.conditionals.push({
			condition: `hit >= 5`, 
			bonus: '1', 
			useFor: `system.itemKey=["unarmedStrike"]`, 
			name: "Impactful Unarmed Strikes",
			linkWithToggle: false,
			flags: {
				ignorePdr: false,
				ignoreEdr: false,
				ignoreMdr: false,
				ignoreResistance: {},
				ignoreImmune: {},
				reduceAd: "",
				reducePd: ""
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
		});
	}
}

function _weaponStyles(actor) {
	const conditionals = [
		_conditionBuilder("axe", `target.hasAnyCondition(["bleeding"])`),
		_conditionBuilder("bow", `target.hasAnyCondition(["slowed"])`),
		_conditionBuilder("fist", `target.hasAnyCondition(["grappled"])`),
		_conditionBuilder("hammer", `target.hasAnyCondition(["dazed", "petrified"])`),
		_conditionBuilder("pick", `target.hasAnyCondition(["impaired"])`),
		_conditionBuilder("staff", `target.hasAnyCondition(["hindered"])`),
		_conditionBuilder("sword", `target.hasAnyCondition(["exposed"])`),
		_conditionBuilder("chained", `target.system.details.armor.shieldEquipped`, "@target.system.details.armor.shieldBonus.ad", "@target.system.details.armor.shieldBonus.pd"),
		_conditionBuilder("whip", `helpers.whipHelper("${actor.id}", target)`),
		_conditionBuilder("crossbow", `helpers.crossbowHelper("${actor.id}", target)`),
		_conditionBuilder("spear", `helpers.spearHelper(target)`),
	];
	conditionals.forEach(conditional => actor.system.conditionals.push(conditional));
}

function _conditionBuilder(weaponStyle, condition, reduceAd, reducePd) {
	const weaponStyleLabel = getLabelFromKey(weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)
	return {
		condition: condition, 
		bonus: '1', 
		useFor: `system.weaponStyle=["${weaponStyle}"]&&system.weaponStyleActive=[${true}]`, 
		name: `${weaponStyleLabel} Passive`,
		linkWithToggle: false,
		flags: {
			ignorePdr: false,
			ignoreEdr: false,
			ignoreMdr: false,
			ignoreResistance: {},
			ignoreImmune: {},
			reduceAd: reduceAd,
			reducePd: reducePd
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