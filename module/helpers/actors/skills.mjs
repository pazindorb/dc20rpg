import { generateKey, getValueFromPath } from "../utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleSkillMastery(pathToValue, which, actor) {
  let currentValue = getValueFromPath(actor, pathToValue);

  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, 5)
    : _switchMastery(currentValue, false, 0, 5);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export function toggleLanguageMastery(key, which, actor) {
  let currentValue = actor.system.languages[key].mastery;
  let pathToValue = `system.languages.${key}.mastery`;
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, 3)
    : _switchMastery(currentValue, false, 0, 3);

    actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleExpertise(pathToValue, which, actor) {
  let currentValue = getValueFromPath(actor, pathToValue);

  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true, 0, 3) 
    : _switchMastery(currentValue, false, 0, 3);

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
		custom: true,
		expertise: 0
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