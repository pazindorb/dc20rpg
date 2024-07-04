import { generateKey, getValueFromPath } from "../utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleSkillMastery(skillType, pathToValue, which, actor) {
  let expertiseLevel = 0;
	let skillMasteryLimit = 5;
	
	if (actor.type === "character") {
		expertiseLevel = Math.min(actor.system.expertise[skillType], 1); // expertise limit now equals one?
		const level = actor.system.details.level;
		// Here we can add flag in settings to make this limit 5 always.
		skillMasteryLimit = 1 + Math.floor(level/5) + expertiseLevel; 
		skillMasteryLimit = Math.max(skillMasteryLimit, 5) // Grandmaster is a limit
	}

	const currentValue = getValueFromPath(actor, pathToValue);
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, skillMasteryLimit)
    : _switchMastery(currentValue, false, 0, skillMasteryLimit);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export function toggleLanguageMastery(pathToValue, which, actor) {
  let currentValue = getValueFromPath(actor, pathToValue);
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, 2)
    : _switchMastery(currentValue, false, 0, 2);

    actor.update({[pathToValue] : newValue});
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

export function convertSkillPoints(actor, from, to, opertaion, rate) {
	const skillFrom = actor.system.skillPoints[from];
	const skillTo = actor.system.skillPoints[to];
	
	if (opertaion === "convert") {
		const updateData = {
			[`system.skillPoints.${from}.converted`]: skillFrom.converted + 1,
			[`system.skillPoints.${to}.extra`]: skillTo.extra + parseInt(rate)
		}
		actor.update(updateData);
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
		actor.update(updateData);
	}
}

export function manipulateAttribute(key, actor, subtract) {
  const value = actor.system.attributes[key].current;
  const newValue = value + (subtract ? -1 : +1);
  actor.update({[`system.attributes.${key}.current`]: newValue})
}