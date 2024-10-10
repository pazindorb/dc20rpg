export function prepareRollData(actor, data) {
  _attributes(data);
  _details(data);
  _mods(data, actor);
	return data;
}

/**
 * Formulas from Active Effects have limited access to calculated data
 * because those calculations happend after active effect are added to character sheet.
 * We want to prepare some common data to be used by active effects here. 
 * Be aware it might be different then fully prepared item roll data.
 */
export function prepareRollDataForEffectCall(actor, data) {
	_calculateAttributes(data, actor);
	_details(data);
	return data;
}

function _calculateAttributes(data, actor) {
	const attributes = data.attributes;
	let primeAttrKey = "mig";
	if (data.attributes) {
		for (let [key, attribute] of Object.entries(data.attributes)) {
			data[key] = foundry.utils.deepClone(attribute.current);
			if (attribute.current >= attributes[primeAttrKey].current) primeAttrKey = key;
		}
	}
	const useMaxPrime = game.settings.get("dc20rpg", "useMaxPrime");
	if (useMaxPrime && actor.type === "character") {
		const level = actor.system.details.level;
		const limit = 3 + Math.floor(level/5);
		data.prime = {
			saveMastery: false,
			current: limit,
			value: limit,
			save: limit,
			check: limit,
			bonuses: {
				check: 0,
				value: 0,
				save: 0
			}
		}
	}
	else {
		data.prime = foundry.utils.deepClone(attributes[primeAttrKey].current);
	}
}

function _attributes(data) {
	// Copy the attributes to the top level, so that rolls can use
	// formulas like `@mig + 4` or `@prime + 4`
	if (data.attributes) {
		for (let [key, attribute] of Object.entries(data.attributes)) {
			data[key] = foundry.utils.deepClone(attribute.value);
		}
	}
}

function _details(data) {
	// Add level for easier access, or fall back to 0.
	if (data.details.level) {
		data.level = data.details.level ?? 0;
	}
	if (data.details.combatMastery) {
		data.combatMastery = data.details.combatMastery ?? 0;
	}
}

function _mods(data, actor) {
	const attackMod = actor.system.attackMod.value;
	if (attackMod.martial) {
		data.attack = attackMod.martial;
		
		if (data.combatMastery) data.attackNoCM = data.attack - data.combatMastery; // Used for rolls when character has no mastery in given weapon
		else data.attackNoCM = data.attack;
	}
	if (attackMod.spell) {
		data.spell = attackMod.spell;
	}
}