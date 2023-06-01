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

/**
 * Returns mastery key changed by one level, by default up. See @goDown param.
 * 
 * @param {string} 	skillMasteryKey	Mastery key that should be changed
 * @param {boolean} goDown 					If true, function will return mastery key one level lower instead of upper
 * @returns {string}	New mastery key
 */
export function switchMasteryByOneLevel(skillMasteryKey, goDown) {
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

/**
 * Returns mastery key changed by one level, by default up. See @goDown param.
 * 
 * @param {string} 	languageMasteryKey	Mastery key that should be changed
 * @param {boolean} goDown 							If true, function will return mastery key one level lower instead of upper
 * @returns {string}	New mastery key
 */
export function switchLanguageMasteryByOneLevel(languageMasteryKey, goDown) {
	if (languageMasteryKey === 3) return goDown ? 2 : 0;
	if (languageMasteryKey === 0) return goDown ? 3 : 1;
	if (goDown) return languageMasteryKey - 1;
	return languageMasteryKey + 1;
}

/**
 * Returns true if given skill key belongs to core skills.
 */
export function isCoreSkillKey(skillKey) {
	let coreSkills = ["ath", "inm", "acr", "tri", "ste", "inv", "med", "sur", "kno", "ani", "ins", "inf"];
	return coreSkills.includes(skillKey);
}