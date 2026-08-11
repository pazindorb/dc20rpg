import { parseFromString } from "../helpers/utils.mjs";
import { DC20Dialog } from "./dc20Dialog.mjs";

const SYSTEM_BUILDER_FIELDS = [
  {
    key: "label",
    format: "string",
    type: ["dynamicRollModifier", "events"],
  },
  {
    key: "source",
    format: "string",
    type: ["globalFormulaModifiers"],
  },
  // =============== EVENT TRIGGER FIELDS ===============
  {
    key: "trigger",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return CONFIG.DC20RPG.allEventTriggers}
  },
  // Instant trigger 
  {
    key: "activeCombatantOnly",
    format: "boolean",
    type: ["events"],
    filter: (fields, type) => fields.trigger?.value === "instant"
  },
  {
    key: "skipIfCaster",
    format: "boolean",
    type: ["events"],
    filter: (fields, type) => fields.trigger?.value === "instant"
  },
  // Target Confirm Trigger
  {
    key: "triggerOnlyForId",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return {"": "Works for any Actor", ["#SPEAKER_ID#"]: "Works only for Caster"}},
    filter: (fields, type) => fields.trigger?.value === "targetConfirm"
  },
  // Apply Damage/Healing Trigger
  {
    key: "minimum",
    format: "numeric",
    type: ["events"],
    filter: (fields, type) => ["damageTaken", "healingTaken"].includes(fields.trigger?.value),
  },
  {
    key: "skipTempHpChangeOnly",
    format: "boolean",
    type: ["events"],
    filter: (fields, type) => fields.trigger?.value === "healingTaken"
  },
  // Resource Changed Trigger
  {
    key: "changedResource",
    format: "string",
    type: ["events"],
    filter: (fields, type) => fields.trigger?.value === "resourceChange"
  },
  {
    key: "operation",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return {"": "All", subtraction: "Subtraction", addition: "Addition"}},
    filter: (fields, type) => fields.trigger?.value === "resourceChange"
  },
  // Effect Changes Trigger
  {
    key: "withEffectName",
    format: "string",
    type: ["events"],
    filter: (fields, type) => isEffectChangeRelated(fields)
  },
  {
    key: "withEffectKey",
    format: "string",
    type: ["events"],
    filter: (fields, type) => isEffectChangeRelated(fields)
  },
  {
    key: "withStatus",
    format: "string",
    type: ["events"],
    filter: (fields, type) => isEffectChangeRelated(fields)
  },
  // Rest Trigger
  {
    key: "restType",
    defaultValue: "long",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => CONFIG.DC20RPG.DROPDOWN_DATA.restTypes,
    filter: (fields, type) => fields.trigger?.value === "rest"
  },
  // ================ EVENT TYPE FIELDS =================
  {
    key: "eventType",
    defaultValue: "basic",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return CONFIG.DC20RPG.eventTypes}
  },
  // Manipulate Resource Event Type
  {
    key: "resourceKey",
    format: "string",
    type: ["events"],
    filter: (fields, type, options) => fields.eventType?.value === "resource"
  },
  // Save/Check Request Event Type
  {
    key: "checkKey",
    defaultValue: "mig",
    format: "string",
    type: ["events"],
    customLabel: (fields, type) => {
      if (fields.eventType?.value === "checkRequest") return "dc20rpg.dialog.systemsBuilder.checkRequestKey";
      if (fields.eventType?.value === "saveRequest") return "dc20rpg.dialog.systemsBuilder.saveRequestKey";
    },
    selectOptions: (fields, type) => {
      if (fields.eventType?.value === "checkRequest") return CONFIG.DC20RPG.ROLL_KEYS.allChecks;
      if (fields.eventType?.value === "saveRequest") return CONFIG.DC20RPG.ROLL_KEYS.saveTypes;
    },
    filter: (fields, type) => ["checkRequest", "saveRequest"].includes(fields.eventType?.value)
  },
  {
    key: "against",
    format: "string",
    type: ["events"],
    filter: (fields, type) => ["checkRequest", "saveRequest"].includes(fields.eventType?.value)
  },
  {
    key: "statuses",
    format: "array",
    type: ["events"],
    filter: (fields, type) => ["checkRequest", "saveRequest"].includes(fields.eventType?.value)
  },
  {
    key: "onSuccess",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {
      return {
        "": "",
        disable: "Disable Effect",
        delete: "Delete Effect",
        runMacro: "Run Macro",
        applyDamage: "Apply Damage",
        applyHealing: "Apply Healing"
      }
    },
    filter: (fields, type) => ["checkRequest", "saveRequest"].includes(fields.eventType?.value)
  },
  {
    key: "onFail",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {
      return {
        "": "",
        disable: "Disable Effect",
        delete: "Delete Effect",
        runMacro: "Run Macro",
        applyDamage: "Apply Damage",
        applyHealing: "Apply Healing"
      }
    },
    filter: (fields, type) => ["checkRequest", "saveRequest"].includes(fields.eventType?.value)
  },
  // =================== SHARED FIELDS ===================
  // Damage/Healing Event Type, Manipulate Resource Event Type, GFM Value, DRM Value 
  {
    key: "value",
    format: "numeric",
    type: ["globalFormulaModifiers", "dynamicRollModifier", "events"],
    customLabel: (fields, type) => {
      if (type === "dynamicRollModifier") return "dc20rpg.dialog.systemsBuilder.drmValue";
      if (type === "globalFormulaModifiers") return "dc20rpg.dialog.systemsBuilder.gfmValue";
      if (type === "events") {
        const isDamage = fields.onSuccess?.value === "applyDamage" || fields.onFail?.value === "applyDamage";
        const isHealing = fields.onSuccess?.value === "applyHealing" || fields.onFail?.value === "applyHealing";
        const rollRequest =  ["checkRequest", "saveRequest"].includes(fields.eventType?.value);
        if (fields.eventType?.value === "resource") return "dc20rpg.dialog.systemsBuilder.resValue";
        if (fields.eventType?.value === "damage") return "dc20rpg.dialog.systemsBuilder.dmgValue";
        if (fields.eventType?.value === "healing") return "dc20rpg.dialog.systemsBuilder.healValue";
        if (isDamage && rollRequest) return "dc20rpg.dialog.systemsBuilder.dmgValue";
        if (isHealing && rollRequest) return "dc20rpg.dialog.systemsBuilder.healValue";
      }
    },
    filter: (fields, type) => {
      if (type === "events") {
        const rollRequest =  ["checkRequest", "saveRequest"].includes(fields.eventType?.value);
        if (["damage", "healing", "resource"].includes(fields.eventType?.value)) return true;
        if (["applyDamage", "applyHealing"].includes(fields.onSuccess?.value) && rollRequest) return true;
        if (["applyDamage", "applyHealing"].includes(fields.onFail?.value) && rollRequest) return true;         
      }
      else return true;
    }
  },
  {
    key: "type",
    format: "string",
    type: ["dynamicRollModifier", "events"],
    customLabel: (fields, type) => {
      if (type === "dynamicRollModifier") return "dc20rpg.dialog.systemsBuilder.drmType";
      if (type === "events") {
        const isDamage = fields.onSuccess?.value === "applyDamage" || fields.onFail?.value === "applyDamage";
        const isHealing = fields.onSuccess?.value === "applyHealing" || fields.onFail?.value === "applyHealing";
        const rollRequest =  ["checkRequest", "saveRequest"].includes(fields.eventType?.value);

        if (fields.eventType?.value === "damage") return "dc20rpg.dialog.systemsBuilder.dmgType";
        if (fields.eventType?.value === "healing") return "dc20rpg.dialog.systemsBuilder.healType";
        if (isDamage && rollRequest) return "dc20rpg.dialog.systemsBuilder.dmgType";
        if (isHealing && rollRequest) return "dc20rpg.dialog.systemsBuilder.healType";
      }
    },
    selectOptions: (fields, type) => {
      if (type === "dynamicRollModifier") return {"": "", adv: "Advantage", dis: "Disadvantage"};
      if (type === "events") {
        const isDamage = fields.onSuccess?.value === "applyDamage" || fields.onFail?.value === "applyDamage";
        const isHealing = fields.onSuccess?.value === "applyHealing" || fields.onFail?.value === "applyHealing";
        const rollRequest =  ["checkRequest", "saveRequest"].includes(fields.eventType?.value);

        if (fields.eventType?.value === "damage") return CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes;
        if (fields.eventType?.value === "healing") return CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes;
        if (isDamage && rollRequest) return CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes;
        if (isHealing && rollRequest) return CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes;
      }
    },
    filter: (fields, type) => {
      if (type === "events") {
        const rollRequest =  ["checkRequest", "saveRequest"].includes(fields.eventType?.value);
        if (["damage", "healing"].includes(fields.eventType?.value)) return true;
        if (["applyDamage", "applyHealing"].includes(fields.onSuccess?.value) && rollRequest) return true;
        if (["applyDamage", "applyHealing"].includes(fields.onFail?.value) && rollRequest) return true;         
      }
      else return true;
    }
  },
  // ================ DRM SPECIFIC FIELDS ================
  {
    key: "modifier",
    format: "string",
    type: ["dynamicRollModifier"],
  },
  {
    key: "autoCrit",
    format: "boolean",
    type: ["dynamicRollModifier"],
  },
  {
    key: "autoFail",
    format: "boolean",
    type: ["dynamicRollModifier"],
  },
  {
    key: "rangeType",
    format: "string",
    type: ["dynamicRollModifier"],
    selectOptions: (fields, type) => {return {"": "Any", melee: "Melee", ranged: "Ranged", area: "Area"}},
    filter: (fields, type, options) => options.isAttack
  },
  {
    key: "attackType",
    format: "string",
    type: ["dynamicRollModifier"],
    selectOptions: (fields, type) => {return {"": "Any", martial: "Martial", spell: "Spell"}},
    filter: (fields, type, options) => options.isAttack
  },
  {
    key: "skill",
    format: "string",
    type: ["dynamicRollModifier"],
    filter: (fields, type, options) => options.isSkill
  },
  {
    key: "runMacro",
    format: "boolean",
    type: ["dynamicRollModifier"],
  },
  {
    key: "applyOnlyForId",
    format: "string",
    type: ["dynamicRollModifier"],
    selectOptions: (fields, type) => {return {"": "Works for any Actor", ["#SPEAKER_ID#"]: "Works only for Caster"}}
  },
  // ================ CONFIRMATION FIELD =================
  {
    key: "preTrigger",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return {"": "", skip: "Skip Event for that Roll", spendAP: "Spend 1 AP to Activate"}}
  },
  {
    key: "confirmation",
    format: "boolean",
    type: ["globalFormulaModifiers", "dynamicRollModifier"],
  },
  {
    key: "customMessage",
    format: "string",
    type: ["globalFormulaModifiers", "dynamicRollModifier", "events"],
    filter: (fields, type) => fields.confirmation?.value || fields.preTrigger?.value
  },
  // ============== STANDARD EVENT FIELDS ================
  {
    key: "postTrigger",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return {"": "", disable: "Disable Effect", delete: "Delete Effect"}}
  },
  {
    key: "reenable",
    format: "string",
    type: ["events"],
    selectOptions: (fields, type) => {return CONFIG.DC20RPG.reenableTriggers}
  },
  {
    key: "alwaysActive",
    format: "boolean",
    type: ["events"],
  },
  {
    key: "actorId",
    defaultValue: "#SPEAKER_ID#",
    format: "string",
    type: ["events"],
    hide: true
  },
  // ============== SHARED DRM GFM FIELDS ================
  {
    key: "afterRoll",
    format: "string",
    type: ["globalFormulaModifiers", "dynamicRollModifier"],
    hint: "dc20rpg.dialog.systemsBuilder.afterRollHint",
    selectOptions: (fields, type) => {return {"": "", disable: "Disable Effect", delete: "Delete Effect"}}
  },
]

function isEffectChangeRelated(fields) {
  let display = fields.trigger?.value === "effectApplied";
  if (!display) display = fields.trigger?.value === "effectRemoved";
  if (!display) display = fields.reenable?.value === "effectApplied";
  if (!display) display = fields.reenable?.value === "effectRemoved";
  if (!display) display = fields.trigger?.value === "effectEnabled";
  if (!display) display = fields.trigger?.value === "effectDisabled";
  if (!display) display = fields.reenable?.value === "effectEnabled";
  if (!display) display = fields.reenable?.value === "effectDisabled";
  return display;
}

export class SystemsBuilder extends DC20Dialog {

  static async open(type, value, options={}) {
    const prompt = new SystemsBuilder(type, value, options);
    return new Promise((resolve) => {
      prompt.promiseResolve = resolve;
      prompt.render(true);
    });
  }

  constructor(type, stringFormatValue, options = {}) {
    super(options);
    this.type = type;
    this.options = this.options;
    this.#prepareFields(stringFormatValue);
  }

  static PARTS = {
    root: {
      classes: ["dc20rpg"],
      template: "systems/dc20rpg/templates/dialogs/systems-builder.hbs",
      scrollable: [".scrollable"]
    }
  };

  #prepareFields(stringFormatValue) {
    const arrayRegex = /\[[^\]]*\]/g; 
    const arrayHolder = {};
    let counter = 0;

    stringFormatValue = stringFormatValue.trim().replaceAll("\n", "");
    stringFormatValue = stringFormatValue.replace(arrayRegex, (match) => {
      const placeholder = `ARRAY_${counter++}`;
      arrayHolder[placeholder] = match;
      return placeholder;
    });

    const keyValuePairs = new Map();
    stringFormatValue.split(",").forEach(property => {
      const pair = property.split(":");
      if (!pair[1]) return;
      const key = parseFromString(pair[0].trim());
      let value = parseFromString(pair[1].trim());
      if (arrayHolder[value] !== undefined) value = arrayHolder[value]; 
      keyValuePairs.set(key, value);
    }) 

    this.fields = {};
    SYSTEM_BUILDER_FIELDS.forEach(original => {
      if (!original.type.includes(this.type)) return;

      const field = foundry.utils.deepClone(original);
      if (keyValuePairs.has(field.key)) field.value = keyValuePairs.get(field.key);
      else if (field.defaultValue) field.value = field.defaultValue;

      field.fieldType = this.#getFieldType(field);
      field.path = `fields.${field.key}.value`;
      field.label = `dc20rpg.dialog.systemsBuilder.${field.key}`;
      this.fields[field.key] = field;
    })
  }

  #getFieldType(field) {
    if (field.selectOptions) return "select";
    if (field.format === "boolean") return "checkbox";
    return "input";
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "System Builder";
    initialized.window.icon = "fa-solid fa-wrench";
    initialized.position.width = 500;
    initialized.window.resizable = true;

    initialized.actions.save = this._onSave;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.fields = this.#filteredFields();
    context.type = this.type;
    return context;
  }

  #filteredFields() {
    return Object.values(foundry.utils.deepClone(this.fields))
    .filter(field => {
      if (field.hide) return false;
      if (!field.filter) return true;
      return field.filter(this.fields, this.type, this.options);
    })
    .map(field => {
      if (field.selectOptions) {
        const selectOptions = field.selectOptions(this.fields, this.type, this.options);
        if (selectOptions) field.options = selectOptions; 
      }
      if (field.customLabel) {
        const label = field.customLabel(this.fields, this.type, this.options);
        if (label) field.label = label;
      }
      if (field.format === "array") field.format = "string";
      return field;
    })
  }

  async _onSave(event) {
    event.preventDefault();
    let finalString = [];

    for (const field of Object.values(this.fields)) {
      if (this.#shouldSkip(field)) continue;

      let value = field.value;
      if (field.format === "string") value = `"${field.value}"`;
      finalString.push(`"${field.key}": ${value}`);
    }

    this.promiseResolve(finalString.join(", "));
    this.close();
  }

  #shouldSkip(field) {
    if (!field.value) return true;
    if (!field.filter) return false;
    return !field.filter(this.fields, this.type, this.options);
  }

  /** @override */
  close(options) {
    if (this.promiseResolve) this.promiseResolve(null);
    super.close(options);
  }
}