import { DC20RPG } from "../helpers/config.mjs";
import { activateDefaultListeners } from "../helpers/listenerEvents.mjs";
import { parseFromString } from "../helpers/utils.mjs";

export class SystemsBuilder extends Dialog {

  constructor(type, currentValue, specificSkill, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.type = type;
    this.specificSkill = specificSkill;
    this._prepareData(type, currentValue);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/systems-builder.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  _prepareData(type, stringFormatValue) {
    // Arrays also have ',' we need to cut those nad put those back later
    const arrayRegex = /\[[^\]]*\]/g; 
    const arrayHolder = {};
    let counter = 0;

    stringFormatValue = stringFormatValue.replace(arrayRegex, (match) => {
      const placeholder = `ARRAY_${counter++}`;
      arrayHolder[placeholder] = match;
      return placeholder;
    });

    let keyValuePairs = stringFormatValue.split(",")
    const fields = this._getFieldsForType(type);
    keyValuePairs.forEach(pairString => {
      if (pairString && pairString.includes(":")) {
        const pair = pairString.split(":");
        const key = parseFromString(pair[0].trim());
        const value = parseFromString(pair[1].trim());
        if (fields[key] !== undefined) {
          // If it is an array placeholder we want to swap it with the array itself
          if (arrayHolder[value] !== undefined) fields[key].value = arrayHolder[value]; 
          else fields[key].value = value;
        }
      }
    })
    this.fields = fields
  }

  _getFieldsForType(type) {
    // Global Formula Modifier
    if (type === "globalFormulaModifiers") {
      return {
        value: {
          value: "",
          format: "string"
        },
        source: {
          value: "",
          format: "string"
        }
      }
    }
    // Roll Level
    if (type === "rollLevel") {
      return {
        value: {
          value: "",
          format: "number"
        },
        type: {
          value: "adv",
          format: "string",
          selectOptions: {
            "": "",
            adv: "Advantage",
            dis: "Disadvantage"
          }
        },
        label: {
          value: "",
          format: "string"
        },
        applyOnlyForId: {
          value: "",
          format: "string",
          selectOptions: {
            "": "Works for any Actor",
            ["#SPEAKER_ID#"]: "Works only for Caster"
          }
        },
        confirmation: {
          value: false,
          format: "boolean"
        },
        autoCrit: {
          value: false,
          format: "boolean"
        },
        autoFail: {
          value: false,
          format: "boolean"
        },
        skill: {
          value: "",
          format: "string"
        },
        afterRoll: {
          value: false,
          format: "string",
          selectOptions: {
            "": "",
            "disable": "Disable Effect",
            "delete": "Delete Effect"
          }
        }
      }
    }
    // Events
    if (type === "events") {
      return {
        eventType: {
          value: "basic",
          format: "string",
          selectOptions: DC20RPG.eventTypes
        },
        trigger: {
          value: "turnStart",
          format: "string",
          selectOptions: DC20RPG.allEventTriggers
        },
        label: {
          value: "",
          format: "string",
        },
        preTrigger: {
          value: "",
          format: "string",
          selectOptions: {
            "": "",
            "disable": "Disable Effect",
            "skip": "Skip Effect for that Roll"
          }
        },
        postTrigger: {
          value: "",
          format: "string",
          selectOptions: {
            "": "",
            "disable": "Disable Effect",
            "delete": "Delete Effect"
          }
        },
        reenable: {
          value: "",
          format: "string",
          selectOptions: DC20RPG.reenableTriggers
        },
        // damage/healing eventType
        value: {
          value: "",
          format: "number",
          skip: {
            key: "eventType",
            skipValues: [ "basic", "checkRequest", "saveRequest"]
          }
        },
        type: {
          value: "",
          format: "string",
          damageTypes: DC20RPG.damageTypes,
          healinTypes: DC20RPG.healingTypes,
          skip: {
            key: "eventType",
            skipValues: [ "basic", "checkRequest", "saveRequest"]
          }
        },
        continuous: {
          value: false,
          format: "boolean",
          skip: {
            key: "eventType",
            skipValues: [ "basic", "healing", "checkRequest", "saveRequest"]
          }
        },
        // checkRequest/saveRequest eventType
        checkKey: {
          value: "mig",
          format: "string",
          checkTypes: DC20RPG.allChecks,
          saveTypes: DC20RPG.saveTypes,
          skip: {
            key: "eventType",
            skipValues: [ "basic", "damage", "healing"]
          }
        },
        against: {
          value: "",
          format: "string",
          skip: {
            key: "eventType",
            skipValues: [ "basic", "damage", "healing"]
          }
        },
        statuses: {
          value: "",
          format: "array",
          skip: {
            key: "eventType",
            skipValues: [ "basic", "damage", "healing"]
          }
        },
        onSuccess: {
          value: "",
          format: "string",
          selectOptions: {
            "": "",
            "disable": "Disable Effect",
            "delete": "Delete Effect"
          },
          skip: {
            key: "eventType",
            skipValues: [ "basic", "damage", "healing"]
          }
        },
        onFail: {
          value: "",
          format: "string",
          selectOptions: {
            "": "",
            "disable": "Disable Effect",
            "delete": "Delete Effect"
          },
          skip: {
            key: "eventType",
            skipValues: [ "basic", "damage", "healing"]
          }
        },
        // trigger specific - configurable
        triggerOnlyForId: {
          value: "",
          format: "string",
          selectOptions: {
            "": "Works for any Actor",
            ["#SPEAKER_ID#"]: "Works only for Caster"
          },
          skip: {
            key: "trigger",
            skipValues: [ "turnStart", "turnEnd", "damageTaken", "healingTaken", "actorWithIdEndsTurn",
              "rollSave", "rollCheck", "rollItem", "attack", "move", "crit", "critFail", "actorWithIdStartsTurn"]
          }
        },
        minimum: {
          value: "",
          format: "number",
          skip: {
            key: "trigger",
            skipValues: [ "turnStart", "turnEnd", "targetConfirm", "actorWithIdEndsTurn",
              "rollSave", "rollCheck", "rollItem", "attack", "move", "crit", "critFail", "actorWithIdStartsTurn"]
          }
        },
        // trigger specific - auto filled
        actorId: {
          value: "#SPEAKER_ID#",
          format: "string",
        }
      }
    }
  }

  getData() {
    return {
      specificSkill: this.specificSkill,
      type: this.type,
      fields: this.fields
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    activateDefaultListeners(this, html);
    html.find(".save-change").click(ev => this._onSave(ev))
  }

  async _onSave(event) {
    event.preventDefault();
    let finalString = "";

    Object.entries(this.fields).forEach(([key, field]) => {
      if (this._shouldSkip(field)) return;
      let value = field.value;
      if (value) {
        if (field.format === "string") value = `"${field.value}"`;
        finalString += `"${key}": ${value}, `;
      }
    })
    finalString = finalString.substring(0, finalString.length - 2);

    this.promiseResolve(finalString);
    this.close();
  }

  _shouldSkip(field) {
    const fieldToCheck = this.fields[field.skip?.key]?.value;
    if (!fieldToCheck) return false;
    return field.skip.skipValues.includes(fieldToCheck);
  }

  static async create(type, currentValue, specificSkill, dialogData = {}, options = {}) {
    const prompt = new SystemsBuilder(type, currentValue, specificSkill, dialogData, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}

export async function createSystemsBuilder(type, currentValue, specificSkill) {
  return await SystemsBuilder.create(type, currentValue, specificSkill, {title: "Builder"});
}