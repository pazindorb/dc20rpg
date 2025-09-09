import { getLabelFromKey } from "../helpers/utils.mjs";

export class DC20Roll extends Roll {

  static prepareCheckDetails(key, options={}) {
    let partial = "";
    let rollType = "";

    switch (key) {
      case "flat": 
        break;

      case "initiative":
        partial = ` + @special.initiative`;
        rollType = "initiative";
        break;

      case "mig": case "agi": case "int": case "cha": case "prime":
        partial = ` + @${key}`;
        rollType = "attributeCheck";
        break;

      case "att":
        partial = " + @attackMod.value.martial";
        rollType = "attackCheck";
        break;

      case "spe":
        partial = " + @attackMod.value.spell";
        rollType = "spellCheck";
        break;

      case "language": 
        partial = " + @special.languageCheck";
        rollType = "attributeCheck"
        break;

      case "mar": 
        partial = " + @special.marCheck";
        rollType = "skillCheck";
        break;

      default:
        partial = ` + @allSkills.${key}`;
        rollType = "skillCheck";
        break;
    }

    return this.#prepareRollDetails(partial, key, rollType, options);
  }

  static prepareSaveDetails(key, options={}) {
    const partial = ` + @${key}Save`;
    return this.#prepareRollDetails(partial, key, "save", options);
  }

  static #prepareRollDetails(partial, key, rollType, options) {
    let dice = "d20";
    if (options.rollLevel) {
      const value = Math.abs(rollLevel) + 1;
      const type = rollLevel > 0 ? "kh" : "kl";
      dice = `${value}d20${type}`;
      return "d20";
    }
    const formula = `${dice}${partial}`;

    const ROLL_KEYS = rollType === "save" ? CONFIG.DC20RPG.ROLL_KEYS.saveTypes : CONFIG.DC20RPG.ROLL_KEYS.allChecks;
    let label = options.customLabel || getLabelFromKey(key, ROLL_KEYS);
    const rollTitle = options.rollTitle || getLabelFromKey(key, ROLL_KEYS);
    
    let against = options.against;
    if (against) {
      label += ` vs ${against}`;
      against = parseInt(against);
    }

    let statuses = options.statuses  || [];
    statuses = statuses.map(status => {
      if (status.hasOwnProperty("id")) return status.id;
      else return status;
    });
    
    return {
      roll: formula,
      label: label,
      rollTitle: rollTitle,
      type: rollType,
      against: against,
      checkKey: key,
      statuses: statuses
    }
  }
}