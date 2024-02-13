export function prepareRollData(actor, data) {
  _attributes(data);
  _details(data);
  _mods(data, actor);
	return data;
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
		data.lvl = data.details.level ?? 0;
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