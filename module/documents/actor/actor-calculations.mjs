import { skillMasteryValue, skillPointsSpendForMastery } from "../../helpers/actors/skills.mjs";
import { DC20RPG } from "../../helpers/config.mjs";
import { evaluateDicelessFormula } from "../../helpers/rolls.mjs";

export function makeCalculations(actor) {
	_combatMatery(actor);
	_coreAttributes(actor)
	_skillModifiers(actor);
	_attackModAndSaveDC(actor);

	if (actor.type === "character") {
		_maxHp(actor);
		_maxMana(actor);
		_maxStamina(actor);
		_maxGrit(actor);

		_skillPoints(actor);
	}
	_currentHp(actor);

	_vision(actor);
	_movement(actor);
	_jump(actor);

	_physicalDefence(actor);
	_mysticalDefence(actor);
	_damageReduction(actor);
	_deathsDoor(actor);
	_restPoints(actor);
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

function _skillModifiers(actor) {
	const exhaustion = actor.system.exhaustion;
	const attributes = actor.system.attributes;

	// Calculate skills modifiers
	for (let [key, skill] of Object.entries(actor.system.skills)) {
		skill.modifier = attributes[skill.baseAttribute].value + skillMasteryValue(skill.skillMastery) + skill.bonus + (2 * skill.expertise) - exhaustion;
	}

	// Calculate trade skill modifiers
	if (actor.type === "character") {
		for (let [key, skill] of Object.entries(actor.system.tradeSkills)) {
			skill.modifier = attributes[skill.baseAttribute].value + skillMasteryValue(skill.skillMastery) + skill.bonus + (2 * skill.expertise) - exhaustion;
		}
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
	})
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
		.filter(skill => skill.skillMastery !== "")
		.forEach(skill => {
			if (skill.expertise) collected.expertise++;
			if (skill.knowledgeSkill) collected.knowledge += skillPointsSpendForMastery(skill.skillMastery);
			else collected.skill += skillPointsSpendForMastery(skill.skillMastery);
		})

	Object.values(actorTrades)
		.filter(skill => skill.skillMastery !== "")
		.forEach(skill => {
			if (skill.expertise) collected.expertise++;
			collected.trade += skillPointsSpendForMastery(skill.skillMastery);
		})

	Object.entries(actorLanguages)
		.filter(([key, lang]) => key !== "com")
		.filter(([key, lang]) => lang.languageMastery !== 0)
		.forEach(([key, lang]) => {
			collected.language += lang.languageMastery;
		})

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

	const groundSpeed = movements.speed.value + movements.speed.bonus - exhaustion;
	movements.speed.current = groundSpeed > 0 ? groundSpeed : 0;
	for (const [key, movement] of Object.entries(movements)) {
		if (key === "speed") continue;
		
		if (actor.type === "character") {
			if (movement.hasSpeed) {
				movement.current = groundSpeed + movement.bonus;
			}
			else {
				const speed = movement.bonus - exhaustion;
				movement.current = speed > 0 ? speed : 0;
			}
		}
		else {
			movement.current = movement.value + movement.bonus - exhaustion;
		}
	}
}

function _jump(actor) {
	const jump = actor.system.jump;
	const attribute = actor.system.attributes[jump.attribute].value;
	jump.value = (attribute >= 1 ? attribute : 1) + jump.bonus;
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
	const level = actor.system.details.level;
	const mig = actor.system.attributes.mig.value;
	actor.system.rest.restPoints.max = level + mig;

}