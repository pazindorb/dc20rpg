import { getLabelFromKey } from "../utils.mjs";

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
export function prepareCheckDetailsFor(key, against, statuses, rollTitle, customLabel) {
	if (!key) return;
	const [formula, rollType] = prepareCheckFormulaAndRollType(key); 

	let label = customLabel || getLabelFromKey(key, {...CONFIG.DC20RPG.ROLL_KEYS.allChecks, "flat": "Flat d20", "initiative": "Initiative"});
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

		case "initiative":
			formula += ` + @special.initiative`;
			rollType = "initiative";
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