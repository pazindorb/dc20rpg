import { generateKey, getValueFromPath } from "../utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export function toggleSkillMastery(pathToValue, which, actor) {
  let currentValue = getValueFromPath(actor, pathToValue);

  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchMastery(currentValue, true) 
    : _switchMastery(currentValue);

  actor.update({[pathToValue] : newValue});
}

/**
 * Changes value of actor's language mastery.
 */
export function toggleLanguageMastery(key, which, actor) {
  let currentValue = actor.system.languages[key].languageMastery;
  let pathToValue = `system.languages.${key}.languageMastery`;
  
  // checks which mouse button were clicked 1(left), 2(middle), 3(right)
  let newValue = which === 3 
    ? _switchLanguageMastery(currentValue, true) 
    : _switchLanguageMastery(currentValue);

    actor.update({[pathToValue] : newValue});
}

/**
 * Returns mastery value to be used in calculation formulas.
 * 
 * @param {string} skillMasteryKey	Key of skill mastery
 * @returns {number}	Mastery value for given key             
 */
export function skillMasteryValue(skillMasteryKey) {
	switch (skillMasteryKey) {
		case "novice":
			return 2;
		case "trained":
			return 4;
		case "expert":
			return 6;
		case "master":
			return 8;
		case "grandmaster":
			return 10;
	}
	return 0;
}

export function skillPointsSpendForMastery(skillMasteryKey) {
	switch (skillMasteryKey) {
		case "novice":
			return 1;
		case "trained":
			return 2;
		case "expert":
			return 3;
		case "master":
			return 4;
		case "grandmaster":
			return 5;
	}
	return 0;
}

function _switchMastery(skillMasteryKey, goDown) {
	switch (skillMasteryKey) {
		case "":
			return goDown ? "grandmaster" : "novice";
		case "novice":
			return goDown ? "" : "trained";
		case "trained":
			return goDown ? "novice" : "expert";
		case "expert":
			return goDown ? "trained" : "master";
		case "master":
			return goDown ? "expert" : "grandmaster";
		case "grandmaster":
			return goDown ? "master" : "";
	}
}

function _switchLanguageMastery(languageMasteryKey, goDown) {
	if (languageMasteryKey === 2) return goDown ? 1 : 0;
	if (languageMasteryKey === 0) return goDown ? 2 : 1;
	if (goDown) return languageMasteryKey - 1;
	return languageMasteryKey + 1;
}

export function addCustomSkill(actor) {
	const skillKey = generateKey();
	const skill = {
		label: "New Skill (Int)",
		modifier: 0,
		baseAttribute: "int",
		bonus: 0,
		skillMastery: "",
		knowledgeSkill: true,
		custom: true,
		expertise: false
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
		languageMastery: 0,
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