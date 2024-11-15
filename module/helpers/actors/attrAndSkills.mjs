import { DC20RPG } from "../config.mjs";
import { generateKey, getLabelFromKey, getValueFromPath } from "../utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export async function toggleSkillMastery(skillType, pathToValue, which, actor) {
	const skillMasteryLimit = getSkillMasteryLimit(actor, skillType);
	const currentValue = getValueFromPath(actor, pathToValue);
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, skillMasteryLimit)
    : _switchMastery(currentValue, false, 0, skillMasteryLimit);

  await actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export async function toggleLanguageMastery(pathToValue, which, actor) {
  let currentValue = getValueFromPath(actor, pathToValue);
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, 2)
    : _switchMastery(currentValue, false, 0, 2);

  await actor.update({[pathToValue] : newValue});
}

export function getSkillMasteryLimit(actor, skillType) {
	if (actor.type === "character") {
		const level = actor.system.details.level;
		const expertiseLevel = Math.min(actor.system.expertise[skillType], 1);
		const skillMasteryLimit = 1 + Math.floor(level/5) + expertiseLevel; 
		return Math.min(skillMasteryLimit, 5) // Grandmaster is a limit
	}
	return 5; // For non PC is always 5;
}

function _switchMastery(mastery, goDown, min, max) {
	if (mastery === max && !goDown) return 0;
	if (mastery === min && goDown) return max;
	if (goDown) return mastery - 1;
	return mastery + 1;
}

export function addCustomSkill(actor) {
	const skillKey = generateKey();
	const skill = {
		label: "New Skill",
		modifier: 0,
		baseAttribute: "int",
		bonus: 0,
		mastery: 0,
		knowledgeSkill: true,
		custom: true
	}
	actor.update({[`system.skills.${skillKey}`] : skill});
}

export function removeCustomSkill(skillKey, actor) {
	actor.update({[`system.skills.-=${skillKey}`]: null });
}

export function addCustomLanguage(actor) {
	const languageKey = generateKey();
	const language = {
		label: "New Language",
		mastery: 0,
		custom: true
	}
	actor.update({[`system.languages.${languageKey}`] : language});
}

export function removeCustomLanguage(languageKey, actor) {
	actor.update({[`system.languages.-=${languageKey}`]: null });
}

export async function convertSkillPoints(actor, from, to, opertaion, rate) {
	const skillFrom = actor.system.skillPoints[from];
	const skillTo = actor.system.skillPoints[to];
	
	if (opertaion === "convert") {
		const updateData = {
			[`system.skillPoints.${from}.converted`]: skillFrom.converted + 1,
			[`system.skillPoints.${to}.extra`]: skillTo.extra + parseInt(rate)
		}
		await actor.update(updateData);
	}
	if (opertaion === "revert") {
		const newExtra = skillFrom.extra - parseInt(rate);
		if (newExtra < 0) {
			ui.notifications.error("Cannot revert more points!");
			return;
		}
		const updateData = {
			[`system.skillPoints.${from}.extra`]: newExtra,
			[`system.skillPoints.${to}.converted`]: skillTo.converted - 1 
		}
		await actor.update(updateData);
	}
}

export async function manipulateAttribute(key, actor, subtract) {
  const value = actor.system.attributes[key].current;
	if (subtract) {
		const newValue = Math.max(-2, value - 1);
		await actor.update({[`system.attributes.${key}.current`]: newValue})
	}
	else {
		const level = actor.system.details.level;
		const upperLimit = 3 + Math.floor(level/5);
		const newValue = Math.min(upperLimit, value + 1);
		await actor.update({[`system.attributes.${key}.current`]: newValue})
	}
}

//===========================================
//=				PREPARE CHECKS AND SAVES					=
//===========================================
export function prepareCheckDetailsFor(actor, key, against, statuses, rollTitle) {
	if (!actor) return;

	let modifier = "";
	let rollType = "";
	switch (key) {
		case "mig": case "agi": case "int": case "cha": 
			modifier = actor.system.attributes[key].value;
			rollType = "attributeCheck";
			break;

		case "att":
			modifier = actor.system.attackMod.value.martial;
			rollType = "attackCheck";
			break;

		case "spe":
			modifier = actor.system.attackMod.value.spell;
			rollType = "spellCheck";
			break;

		case "mar": 
			const acrModifier = actor.system.skills.acr.modifier;
			const athModifier = actor.system.skills.ath.modifier;
			modifier = acrModifier >= athModifier ? acrModifier : athModifier;
			rollType = "skillCheck";
			break;

		default:
			modifier = actor.system.skills[key].modifier;
			rollType = "skillCheck";
			break;
  } 

	return {
		roll: `d20 + ${modifier}`,
		label: getLabelFromKey(key, DC20RPG.checks),
		rollTitle: rollTitle,
		type: rollType,
		against: parseInt(against),
		checkKey: key,
		statuses: statuses
	}
}

export function prepareSaveDetailsFor(actor, key, dc, statuses, rollTitle) {
	if (!actor) return;

	let save = "";
	switch (key) {
		case "phy": 
			const migSave = actor.system.attributes.mig.save;
			const agiSave = actor.system.attributes.agi.save;
			save = migSave >= agiSave ? migSave : agiSave;
			break;
		
		case "men": 
			const intSave = actor.system.attributes.int.save;
			const chaSave = actor.system.attributes.cha.save;
			save = intSave >= chaSave ? intSave : chaSave;
			break;

		default:
			save = actor.system.attributes[key].save;
			break;
	}

	return {
		roll: `d20 + ${save}`,
		label: getLabelFromKey(key, DC20RPG.saveTypes) + " Save",
		rollTitle: rollTitle,
		type: "save",
		against: parseInt(dc),
		checkKey: key,
		statuses: statuses
	}
}