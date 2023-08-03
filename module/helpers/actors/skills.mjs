import { getValueFromPath } from "../utils.mjs";

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
	if (languageMasteryKey === 3) return goDown ? 2 : 0;
	if (languageMasteryKey === 0) return goDown ? 3 : 1;
	if (goDown) return languageMasteryKey - 1;
	return languageMasteryKey + 1;
}