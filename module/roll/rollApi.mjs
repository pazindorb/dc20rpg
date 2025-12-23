import { getLabelFromKey } from "../helpers/utils.mjs";

export class DC20Roll {

  static prepareItemCoreRollDetails(item, options={}) {
    switch(item.system.actionType) {
      case "check": return this.prepareCheckDetails(item.checkKey, options);
      case "attack": return this.prepareAttackDetails(item.system.attackFormula.checkType, options);
    }
    return {};
  }

  static prepareAttackDetails(key, options={}) {
    if (key === "spell") return this.#prepareRollDetails(" + @attack.spell + @rollBonus", "att", "attackCheck", options);
    return this.#prepareRollDetails(" + @attack.martial + @rollBonus", "att", "attackCheck", options);
  }

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
        partial = " + @attack.martial";
        rollType = "attackCheck";
        break;

      case "mar":
        partial = " + @check.martial";
        rollType = "martialCheck";
        break;

      case "spe":
        partial = " + @check.spell";
        rollType = "spellCheck";
        break;

      case "language": 
        partial = " + @special.languageCheck";
        rollType = "attributeCheck"
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
      const value = Math.abs(options.rollLevel) + 1;
      const type = options.rollLevel > 0 ? "kh" : "kl";
      dice = `${value}d20${type}`;
    }
    const formula = `${dice}${partial}`;

    const ROLL_KEYS = rollType === "save" ? CONFIG.DC20RPG.ROLL_KEYS.saveTypes : CONFIG.DC20RPG.ROLL_KEYS.allChecks;
    ROLL_KEYS.language = "Language Check";
    ROLL_KEYS.att = "Attack Check";
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