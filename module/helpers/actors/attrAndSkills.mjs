import { generateKey, getLabelFromKey, getValueFromPath } from "../utils.mjs";

/**
 * Changes value of actor's skill skillMastery.
 */
export async function toggleSkillMastery(skillType, skillKey, which, actor) {
	const skillMasteryLimit = getSkillMasteryLimit(actor, skillKey);
	const pathToValue = `system.${skillType}.${skillKey}.mastery`;
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

export function getSkillMasteryLimit(actor, skillKey) {
	if (actor.type === "character") {
		const level = actor.system.details.level;
		let skillMasteryLimit = 1 + Math.floor(level/5);

		// Skill Expertise = +1 to the limit
		const expertise = new Set([...actor.system.expertise.automated, ...actor.system.expertise.manual]);
		if (expertise.has(skillKey)) skillMasteryLimit++; 

		return Math.min(skillMasteryLimit, 5) // Grandmaster is a limit for now
	}
	return 5; // For non PC is always 5;
}

function _switchMastery(mastery, goDown, min, max) {
	if (mastery >= max && !goDown) return 0;
	if (mastery <= min && goDown) return max;
	if (goDown) return mastery - 1;
	return mastery + 1;
}

export function addCustomSkill(actor, trade) {
	const skillKey = generateKey();
	const skill = {
		label: "New Skill",
		modifier: 0,
		baseAttribute: "int",
		bonus: 0,
		mastery: 0,
		custom: true
	}
	if (trade) actor.update({[`system.tradeSkills.${skillKey}`] : skill});
	else actor.update({[`system.skills.${skillKey}`] : skill});
}

export function removeCustomSkill(skillKey, actor, trade) {
	if (trade) actor.update({[`system.tradeSkills.-=${skillKey}`]: null });
	else actor.update({[`system.skills.-=${skillKey}`]: null });
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

export async function manualSkillExpertiseToggle(skillKey, actor) {
	const manual = new Set(actor.system.expertise.manual);
	const automated = new Set(actor.system.expertise.automated);

	if (manual.has(skillKey)) {
		manual.delete(skillKey);
		await actor.update({["system.expertise.manual"]: manual})
	}
	else if (automated.has(skillKey)) {
		ui.notifications.warn("You already have expertise in that skill!");
	}
	else {
		manual.add(skillKey);
		await actor.update({["system.expertise.manual"]: manual})
	}
}

//===========================================
//=				PREPARE CHECKS AND SAVES					=
//===========================================
export function prepareCheckDetailsFor(key, against, statuses, rollTitle, customLabel) {
	if (!key) return;
	const [formula, rollType] = prepareCheckFormulaAndRollType(key); 

	let label = customLabel || getLabelFromKey(key, {...CONFIG.DC20RPG.ROLL_KEYS.allChecks, "flat": "Flat d20"});
	if (against) label += ` vs ${against}`;
	if (statuses) statuses = statuses.map(status => {
		if (status.hasOwnProperty("id")) return status.id;
		else return status;
	});
	return {
		roll: formula,
		label: label,
		rollTitle: rollTitle,
		type: rollType,
		against: parseInt(against),
		checkKey: key,
		statuses: statuses
	}
}

export function prepareSaveDetailsFor(key, dc, statuses, rollTitle, customLabel) {
	if (!key) return;

	let save = "";
	switch (key) {
		case "phy": 
			save = "+ @special.phySave";
			break;
		
		case "men": 
			save = "+ @special.menSave";
			break;

		default:
			save = `+ @attributes.${key}.save`;
			break;
	}

	let label = customLabel || getLabelFromKey(key, CONFIG.DC20RPG.ROLL_KEYS.saveTypes);
	if (dc) label += ` vs ${dc}`;
	if (statuses) statuses = statuses.map(status => {
		if (status.hasOwnProperty("id")) return status.id;
		else return status;
	});
	return {
		roll: `d20 ${save}`,
		label: label,
		rollTitle: rollTitle,
		type: "save",
		against: parseInt(dc),
		checkKey: key,
		statuses: statuses
	}
}

export function prepareCheckFormulaAndRollType(key, rollLevel) {
	rollLevel = rollLevel || 0;
	let rollType = "";
	let formula = "d20";
	if (rollLevel !== 0) formula = `${Math.abs(rollLevel)+1}d20${rollLevel > 0 ? "kh" : "kl"}`;
	if (!key) return [formula, rollType];

	switch (key) {
		case "flat": 
			break;

		case "mig": case "agi": case "int": case "cha": case "prime":
			formula += ` + @attributes.${key}.check`;
			rollType = "attributeCheck";
			break;

		case "att":
			formula += " + @attackMod.value.martial";
			rollType = "attackCheck";
			break;

		case "spe":
			formula += " + @attackMod.value.spell";
			rollType = "spellCheck";
			break;

		case "mar": 
			formula += " + @special.marCheck";
			rollType = "skillCheck";
			break;

		default:
			formula += ` + @allSkills.${key}`;
			rollType = "skillCheck";
			break;
  }
	return [formula, rollType];
}