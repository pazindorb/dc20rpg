import { DC20RPG } from "../../helpers/config.mjs";
import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(actor) {
	_skillModifiers(actor);

	if (actor.type === "character") {
		_maxHp(actor);
		_maxMana(actor);
		_maxStamina(actor);
		_maxGrit(actor);

		_skillPoints(actor);
		_attributePoints(actor);
		_restPoints(actor);
	}
	_currentHp(actor);

	_vision(actor);
	_movement(actor);
	_jump(actor);

	_physicalDefence(actor);
	_mysticalDefence(actor);
	_damageReduction(actor);
	_deathsDoor(actor);
}

function _skillModifiers(actor) {
	const exhaustion = actor.system.exhaustion;
	const attributes = actor.system.attributes;

	// Calculate skills modifiers
	for (let [key, skill] of Object.entries(actor.system.skills)) {
		skill.modifier = attributes[skill.baseAttribute].value + (2 * skill.mastery) + skill.bonus + (2 * skill.expertise) - exhaustion;
	}

	// Calculate trade skill modifiers
	if (actor.type === "character") {
		for (let [key, skill] of Object.entries(actor.system.tradeSkills)) {
			skill.modifier = attributes[skill.baseAttribute].value + (2 * skill.mastery) + skill.bonus + (2 * skill.expertise) - exhaustion;
		}
	}
}

function _maxHp(actor) {
	const details = actor.system.details;
	const health = actor.system.resources.health;
	const might = actor.system.attributes.mig.value;
	const hpFromClass = details.class.maxHpBonus || 0;
	
	health.max = 6 + details.level + might + hpFromClass + health.bonus;
}

function _maxMana(actor) {
	const details = actor.system.details;
	const mana = actor.system.resources.mana;
	const prime = actor.system.attributes.prime.value;
	const manaFromClass = details.class.bonusMana || 0;
	
	mana.max = (details.spellcaster ? prime : 0) + manaFromClass + mana.bonus;
}

function _maxStamina(actor) {
	const details = actor.system.details;
	const stamina = actor.system.resources.stamina;
	const staminaFromClass = details.class.bonusStamina || 0;

	stamina.max = staminaFromClass + stamina.bonus;
}

function _maxGrit(actor) {
	const grit = actor.system.resources.grit;
	const charisma = actor.system.attributes.cha.value;
	grit.max = 2 + charisma;
}

function _skillPoints(actor) {
	const int = actor.system.attributes.int.value;
	const spentPoints = _collectSpentPoints(actor);
	Object.entries(actor.system.skillPoints).forEach(([key, type]) => {
		if (key === "skill") type.max += int;
		type.max += type.extra;
		type.spent += spentPoints[key] + type.converted;
		type.left = type.max - type.spent;
	});
}

function _attributePoints(actor) {
	const attributePoints = actor.system.attributePoints;
	attributePoints.max += attributePoints.extra;
	Object.entries(actor.system.attributes)
						.filter(([key, atr]) => key !== "prime")
						.forEach(([key, atr]) => {
							attributePoints.spent += atr.value +2;
							// +2 is being added because player can start with -2 in stat and spend points from there
						});
	attributePoints.left = attributePoints.max - attributePoints.spent;
}

function _collectSpentPoints(actor) {
	const actorSkills = actor.system.skills;
	const actorTrades = actor.system.tradeSkills;
	const actorLanguages = actor.system.languages;
	const collected = {
		skill: 0,
		trade: 0,
		knowledge: 0,
		language: 0,
		expertise: 0
	}

	Object.values(actorSkills)
		.forEach(skill => {
			if (skill.expertise) collected.expertise++;
			if (skill.knowledgeSkill) collected.knowledge += skill.mastery;
			else collected.skill += skill.mastery;
		})

	Object.values(actorTrades)
		.forEach(skill => {
			if (skill.expertise) collected.expertise++;
			collected.trade += skill.mastery;
		})

	Object.entries(actorLanguages)
		.filter(([key, lang]) => key !== "com")
		.forEach(([key, lang]) => collected.language += lang.mastery)

	return collected;
}

function _currentHp(actor) {
	const health = actor.system.resources.health;
	health.value = health.current + health.temp;
}

function _vision(actor) {
	const visionTypes = actor.system.vision;

	visionTypes.darkvision.value = visionTypes.darkvision.range + visionTypes.darkvision.bonus; 
	visionTypes.tremorsense.value = visionTypes.tremorsense.range + visionTypes.tremorsense.bonus; 
	visionTypes.blindsight.value = visionTypes.blindsight.range + visionTypes.blindsight.bonus; 
	visionTypes.truesight.value = visionTypes.truesight.range + visionTypes.truesight.bonus; 
}

function _movement(actor) {
	const exhaustion = actor.system.exhaustion;
	const movements = actor.system.movement;

	const groundSpeed = movements.ground.value + movements.ground.bonus - exhaustion;
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

function _physicalDefence(actor) {
	const pd = actor.system.defences.physical;
	if (pd.formulaKey !== "flat") {
		const formula = pd.formulaKey === "custom" ? pd.customFormula : DC20RPG.physicalDefenceFormulas[pd.formulaKey];
		pd.normal = evaluateDicelessFormula(formula, actor.getRollData()).total;
	}
	
	// Calculate Hit Thresholds
	pd.value = pd.normal + pd.bonus;
	pd.heavy = pd.value + 5;
	pd.brutal = pd.value + 10;
}

function _mysticalDefence(actor) {
	const md = actor.system.defences.mystical;
	if (md.formulaKey !== "flat") {
		const formula = md.formulaKey === "custom" ? md.customFormula : DC20RPG.mysticalDefenceFormulas[md.formulaKey];
		md.normal = evaluateDicelessFormula(formula, actor.getRollData()).total;
	}
	
	// Calculate Hit Thresholds
	md.value = md.normal + md.bonus;
	md.heavy = md.value + 5;
	md.brutal = md.value + 10;
}

function _damageReduction(actor) {
	const dmgReduction = actor.system.damageReduction;
	dmgReduction.pdr.value = dmgReduction.pdr.number + dmgReduction.pdr.bonus;
	dmgReduction.mdr.value = dmgReduction.mdr.number + dmgReduction.mdr.bonus;
}

function _deathsDoor(actor) {
	const death = actor.system.death;
	const currentHp = actor.system.resources.health.current;
	const prime = actor.system.attributes.prime.value;

	const treshold = -prime + death.doomed - death.bonus;
	death.treshold = treshold < 0 ? treshold : 0;
	if (currentHp <= 0) death.active = true;
	else death.active = false;
}

function _restPoints(actor) {
	const restPoints = actor.system.rest.restPoints;
	const level = actor.system.details.level;
	const mig = actor.system.attributes.mig.value;
	const prime = actor.system.attributes.prime.value;
	restPoints.max = level + restPoints.bonus + (restPoints.usePrime ? prime : mig);
}