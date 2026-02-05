import { sendEffectRemovedMessage } from "../chat/chat-message.mjs";
import { getActorFromIds } from "./actors/tokens.mjs";
import { evaluateDicelessFormula } from "./rolls.mjs";
import { emitEventToGM } from "./sockets.mjs";

export function prepareActiveEffectsAndStatuses(owner, context) {
  const hideNonessentialEffects = !owner.system.sheetData.show.nonessentialEffects;
  // Prepare all statuses 
  const statuses = foundry.utils.deepClone(CONFIG.statusEffects);

  // Define effect header categories
  const effects = {
    temporary: {
      type: "temporary",
      effects: []
    },
    passive: {
      type: "passive",
      effects: []
    },
    inactive: {
      type: "inactive",
      effects: []
    },
    disabled: {
      type: "disabled",
      effects: []
    }
  };

  // Iterate over active effects, classifying them into categories
  for ( const effect of owner.allEffects ) {
    if (effect.statuses?.size > 0) _connectEffectAndStatus(effect, statuses, owner);
    if (!effect.fromStatus) {
      effect.originName = effect.parent.name;
      effect.timeLeft = effect.roundsLeft;
      effect.canChangeState = effect.stateChangeLocked;
      effect.manualTrigger = effect.hasManualEvent;
      if (effect.system.nonessential && hideNonessentialEffects) continue;
      if (effect.isTemporary && effect.disabled) effects.disabled.effects.push(effect);
      else if (effect.disabled) effects.inactive.effects.push(effect);
      else if (effect.isTemporary) effects.temporary.effects.push(effect);
      else effects.passive.effects.push(effect);
    }
  }

  context.effects = effects;
  context.statuses = statuses;
}

export function prepareActiveEffects(owner, context) {
  const effects = {
    temporary: {
      type: "temporary",
      effects: []
    },
    passive: {
      type: "passive",
      effects: []
    }
  };

  for ( const effect of owner.allEffects ) {
    if (effect.isTemporary) effects.temporary.effects.push(effect);
    else effects.passive.effects.push(effect);
  }
  context.effects = effects;
}

function _connectEffectAndStatus(effect, statuses) {
  statuses
      .filter(status => effect.statuses.has(status.id) && !effect.disabled)
      .map(status => {
        status.effectId = effect.id;
        
        // Collect stacks for conditions
        if (!status.stack) status.stack = 1;
        else if (status.stackable) status.stack += 1; 

        // If status comes from other active effects we want to give info about it with tooltip
        if ((effect.statuses.size > 1 && effect.name !== status.name) || !effect.fromStatus) {
          if (!status.tooltip) status.tooltip = `Additional stack from ${effect.name}`
          else status.tooltip += ` and ${effect.name}`
          status.fromOther = true
        }

        return status;
      });
}


//==================================================
//    Manipulating Effects On Other Objects        =  
//==================================================
export async function createNewEffectOn(type, owner, flags) {
  const duration = type === "temporary" ? 1 : undefined
  const inactive = type === "inactive";
  const created = await owner.createEmbeddedDocuments("ActiveEffect", [{
    label: "New Effect",
    name: "New Effect",
    img: "icons/svg/aura.svg",
    origin: owner.uuid,
    "duration.rounds": duration,
    disabled: inactive,
    flags: {dc20rpg: flags}
  }]);
  return created[0];
}

export async function createEffectOn(effectData, owner) {
  if (!owner.testUserPermission(game.user, "OWNER")) {
    emitEventToGM("CREATE_DOCUMENT", {
      docType: "effect",
      docData: effectData, 
      actorUuid: owner.uuid
    });
    return;
  }
  if (!effectData.origin) effectData.origin = owner.uuid;
  const created = await owner.createEmbeddedDocuments("ActiveEffect", [effectData]);
  return created[0];
}

export function editEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  if (effect) effect.sheet.render(true);
}

export async function updateEffectOn(effectId, owner, updateData) {
  const effect = owner.effects.get(effectId);
  if (!effect) return;
  return effect.gmUpdate(updateData);
}

export async function deleteEffectFrom(effectId, owner) {
  if (!owner.testUserPermission(game.user, "OWNER")) {
    emitEventToGM("DELETE_DOCUMENT", {
      docType: "effect",
      docId: effectId, 
      actorUuid: owner.uuid
    });
    return;
  }
  const effect = getEffectFrom(effectId, owner);
  if (effect) await effect.delete();
}

export async function toggleEffectOn(effectId, owner, turnOn) {
  if (!owner.testUserPermission(game.user, "OWNER")) {
    emitEventToGM("toggleEffectOn", {
      turnOn: turnOn,
      effectId: effectId, 
      ownerUuid: owner.uuid
    });
    return;
  }

  const options = turnOn ? {disabled: true} : {active: true};
  const effect = getEffectFrom(effectId, owner, options);
  if (effect) {
    if (turnOn) await effect.enable();
    else await effect.disable();
  }
}

export function getEffectFrom(effectId, owner, options={}) {
  if (options.active) return owner.allEffects.find(effect => effect._id === effectId && effect.disabled === false);
  if (options.disabled) return owner.allEffects.find(effect => effect._id === effectId && effect.disabled === true);
  return owner.allEffects.find(effect => effect._id === effectId);
}

export function getEffectByName(effectName, owner) {
  return owner.getEffectWithName(effectName);
}

export function getEffectById(effectId, owner) {
  return owner.allEffects.find(effect => effect._id === effectId);
}

export function getEffectByKey(effectKey, owner) {
  if (!effectKey) return;
  return owner.allEffects.find(effect => effect.system.effectKey === effectKey);
}

export async function createOrDeleteEffect(effectData, owner) {
  const alreadyExist = getEffectByName(effectData.name, owner);
  if (alreadyExist) return await deleteEffectFrom(alreadyExist.id, owner);
  else return await createEffectOn(effectData, owner);
}

export async function handleAfterRollEffectModification(toRemove) {
  const actor = getActorFromIds(toRemove.actorId, toRemove.tokenId);
  if (actor) {
    const effect = getEffectFrom(toRemove.effectId, actor);
    const afterRoll = toRemove.afterRoll;
    if (effect) {
      if (afterRoll === "delete") {
        sendEffectRemovedMessage(actor, effect);
        await deleteEffectFrom(toRemove.effectId, actor);
      }
      if (afterRoll === "disable") await toggleEffectOn(toRemove.effectId, actor, false);
    }
  }
}

export async function addFlatDamageReductionEffect(actor) {
  const damageReduction = {
    name: "Grit - Damage Reduction",
    img: "icons/svg/mage-shield.svg",
    description: "<p>You are spending Grit to reduce incoming damage</p>",
    duration: {rounds: 1},
    system: {
      duration: {
        useCounter: true,
        onTimeEnd: "delete"
      }
    },
    changes: [
      {
        key: "system.damageReduction.flat",
        mode: 2,
        value:"1"
      },
      {
        key: "system.events",
        mode: 2,
        value:'"eventType": "basic", "trigger": "targetConfirm", "label": "Grit - Damage Reduction", "postTrigger": "delete", "actorId": "#SPEAKER_ID#"'
      },
      {
        key: "system.events",
        mode: 2,
        value:'"eventType": "basic", "trigger": "damageTaken", "label": "Grit - Damage Reduction", "postTrigger": "delete", "actorId": "#SPEAKER_ID#"'
      }
    ]
  }
  await createEffectOn(damageReduction, actor);
}

//===========================================================
export function injectFormula(effect, effectOwner) {
  if (!effectOwner) return;
  const rollData = effectOwner.getRollData();

  for (const change of effect.changes) {
    const value = change.value;
    
    // formulas start with "<#" and end with "#>"
    if (typeof value === "string" && value.includes("<#") && value.includes("#>")) {
      // We want to calculate that formula and repleace it with value calculated
      const formulaRegex = /<#(.*?)#>/g;
      const formulasFound = value.match(formulaRegex);

      formulasFound.forEach(formula => {
        const formulaString = formula.slice(2,-2); // We need to remove <# and #>
        const calculated = evaluateDicelessFormula(formulaString, rollData);
        change.value = change.value.replace(formula, calculated.total); // Replace formula with calculated value
      })
    }
  }
}

export function getMesuredTemplateEffects(item, applicableEffects=[], actor) {
  if (!item) return {applyFor: "", effects: []};
  if (item.effects.size === 0 && applicableEffects.length === 0) return {applyFor: "", effects: []};
  if (item.system.effectsConfig.addToTemplates === "") return {applyFor: "", effects: []};

  let effects = applicableEffects.length > 0 ? applicableEffects : item.effects.toObject();
  effects = effects.filter(effect => effect.system.applyToTemplate);
  if (actor) {
    for (const effect of effects) {
      if (!effect.flags.dc20rpg) effect.flags.dc20rpg = {};
      effect.flags.dc20rpg.templateCallTime = Date.now();
      injectFormula(effect, actor);
    }
  }

  return {
    applyFor: item.system.effectsConfig.addToTemplates,
    effects: effects
  }
}

//===========================================================
/**
 * List of default actor keys that are expected to be modified by effects
 */
export function getEffectModifiableKeys() {
  return {
    // Defence bonus
    "system.defences.precision.bonuses.always": "Precision Defense: Bonus (always)",
    "system.defences.precision.bonuses.noArmor": "Precision Defense: Bonus (when no armor equipped)",
    "system.defences.precision.bonuses.noHeavy": "Precision Defense: Bonus (when no heavy armor equipped)",
    "system.defences.precision.formulaKey": "Precision Defence: Calculation Formula Key",
    "system.defences.precision.customFormula": "Precision Defence: Custom Calculation Formula",
    "system.defences.area.bonuses.always": "Area Defense: Bonus (always)",
    "system.defences.area.bonuses.noArmor": "Area Defense: Bonus (when no armor equipped)",
    "system.defences.area.bonuses.noHeavy": "Area Defense: Bonus (when no heavy armor equipped)",
    "system.defences.area.formulaKey": "Area Defence: Calculation Formula Key",
    "system.defences.area.customFormula": "Area Defence: Custom Calculation Formula",

    // Damage reduction
    "system.damageReduction.pdr.active": "PDR",
    "system.damageReduction.pdr.skipEqCheck": "PDR - Ignore Equipment Bonus",
    "system.damageReduction.edr.active": "EDR",
    "system.damageReduction.edr.skipEqCheck": "EDR - Ignore Equipment Bonus",
    "system.damageReduction.mdr.active": "MDR",
    "system.damageReduction.mdr.skipEqCheck": "MDR - Ignore Equipment Bonus",
    ..._damageReduction(),

    // Flat Damage/healing Modification
    "system.damageReduction.flat": "Flat Damage Modification On You (Value)",
    "system.damageReduction.flatHalf": "Flat Damage Modification On You (Half)",
    "system.healingReduction.flat": "Flat Healing Modification On You (Value)",
    "system.healingReduction.flatHalf": "Flat Healing Modification On You (Half)",

    // Status resistances
    ..._statusResistances(),
    "system.customCondition": "Custom Condition",

    // Resources
    "system.resources.health.bonus": "Health: Max Value Bonus",
    "system.resources.mana.bonus": "Mana: Max Value Bonus",
    "system.resources.mana.maxFormula" : "Mana: Calculation Formula",
    "system.details.manaSpendLimit.bonus": "Mana Spend Limit Bonus",
    "system.resources.stamina.bonus": "Stamina: Max Value Bonus",
    "system.resources.stamina.maxFormula" : "Stamina: Calculation Formula",
    "system.details.staminaSpendLimit.bonus": "Stamina Spend Limit Bonus",
    "system.resources.grit.bonus": "Grit: Max Value Bonus",
    "system.resources.grit.maxFormula" : "Grit: Calculation Formula",
    "system.resources.restPoints.bonus" : "Rest Points: Max Value Bonus",
    "system.resources.restPoints.regenerationFormula" : "Rest Points: Regeneration Formula",
    
    // Help Dice
    "system.help.maxDice": "Help Dice: Max Dice",

    // Death
    "system.death.bonus": "Death's Door Threshold Bonus",

    // Movement
    "system.moveCost": "Cost of moving 1 Space",
    "system.movement.ground.bonus": "Ground Speed Bonus",
    "system.movement.climbing.bonus": "Climbing Speed Bonus",
    "system.movement.climbing.fullSpeed": "Climbing equal Ground Speed",
    "system.movement.climbing.halfSpeed": "Climbing equal Half Ground Speed",
    "system.movement.swimming.bonus": "Swimming Speed Bonus",
    "system.movement.swimming.fullSpeed": "Swimming equal Ground Speed",
    "system.movement.swimming.halfSpeed": "Swimming equal Half Ground Speed",
    "system.movement.burrow.bonus": "Burrow Speed Bonus",
    "system.movement.burrow.fullSpeed": "Burrow equal Ground Speed",
    "system.movement.burrow.halfSpeed": "Burrow equal Half Ground Speed",
    "system.movement.glide.bonus": "Glide Speed Bonus",
    "system.movement.glide.fullSpeed": "Glide equal Ground Speed",
    "system.movement.glide.halfSpeed": "Glide equal Half Ground Speed",
    "system.movement.flying.bonus": "Flying Speed Bonus",
    "system.movement.flying.fullSpeed": "Flying equal Ground Speed",
    "system.movement.flying.halfSpeed": "Flying equal Half Ground Speed",
    "system.jump.bonus": "Jump Distance Bonus",
    "system.jump.multiplier": "Jump Distance Multiplier",
    "system.jump.key": "Jump Attribute",

    // Senses
    "system.senses.darkvision.range": "Darkvision: Base range (always)",
    "system.senses.darkvision.bonus": "Darkvision: Bonus (always)",
    "system.senses.darkvision.orOption.range": "Darkvision: Base range (if no other source)",
    "system.senses.darkvision.orOption.bonus": "Darkvision: Bonus (if other source exist)",
    "system.senses.tremorsense.range": "Tremorsense: Base range (always)",
    "system.senses.tremorsense.bonus": "Tremorsense: Bonus (always)",
    "system.senses.tremorsense.orOption.range": "Tremorsense: Base range (if no other source)",
    "system.senses.tremorsense.orOption.bonus": "Tremorsense: Bonus (if other source exist)",
    "system.senses.blindsight.range": "Blindsight: Base range (always)",
    "system.senses.blindsight.bonus": "Blindsight: Bonus (always)",
    "system.senses.blindsight.orOption.range": "Blindsight: Base range (if no other source)",
    "system.senses.blindsight.orOption.bonus": "Blindsight: Bonus (if other source exist)",
    "system.senses.truesight.range": "Truesight: Base range (always)",
    "system.senses.truesight.bonus": "Truesight: Bonus (always)",
    "system.senses.truesight.orOption.range": "Truesight: Base range (if no other source)",
    "system.senses.truesight.orOption.bonus": "Truesight: Bonus (if other source exist)",

    // Creature size
    "system.size.size": "Size (Category)",
    "system.size.spaceOccupation": "Size (Occupied Spaces)",

    // Attack and Save
    "system.attackMod.bonus.spell": "Spell Attack Bonus",
    "system.attackMod.bonus.martial": "Martial Attack Bonus",
    "system.checkMod.bonus.spell": "Spell Check Bonus",
    "system.checkMod.bonus.martial": "Martial Check Bonus",
    "system.saveDC.bonus.spell": "Spell Save DC Bonus",
    "system.saveDC.bonus.martial": "Martial Save DC Bonus",

    // Attribute bonus
    ..._attributeBonuses(),

    // Skills bonus
    ..._skillBonuses(),

    // Skill expertise
    "system.expertise.automated": "Expertise (Skill Mastery Limit Increase)",
    "system.expertise.levelIncrease": "Expertise (Skill Mastery Level Increase)",

    // Skill Points bonus
    "system.attributePoints.bonus": "Attribute Points",
    "system.skillPoints.skill.bonus": "Skill Points",
    "system.skillPoints.trade.bonus": "Trade Points",
    "system.skillPoints.language.bonus": "Language Points",

    "system.known.spells.max": "Spells Known",
    "system.known.infusions.max": "Infusions Known",
    "system.known.maneuvers.max": "Maneuvers Known",

    // Combat Training
    ..._combatTraining(),

    // Global Modifiers
    "system.globalModifier.ignore.difficultTerrain": "Ignore Difficult Terrain",
    "system.globalModifier.ignore.flanking": "Ignore being Flanked",
    "system.globalModifier.martial.ignore.closeQuarters": "Ignore Close Quarters (Martial Attack)",
    "system.globalModifier.spell.ignore.closeQuarters": "Ignore Close Quarters (Spell Attack)",
    "system.globalModifier.martial.ignore.longRange": "Ignore Long Range Disadvantage (Martial Attack)",
    "system.globalModifier.spell.ignore.longRange": "Ignore Long Range Disadvantage (Spell Attack)",
    "system.globalModifier.provide.halfCover": "Provide Half Cover",
    "system.globalModifier.provide.tqCover": "Provide 3/4 Cover",
    "system.globalModifier.allow.overheal": "Convert overheal you done to Temp HP",
    "system.globalModifier.prevent.goUnderAP": "Prevent from going under X AP",
    "system.globalModifier.prevent.hpRegeneration": "Prevent any HP regeneration", 
    "system.globalModifier.prevent.criticalHit": "Prevent Critical Hit benefits against you", 
    "system.globalModifier.prevent.flanking": "This creature cannot flank",
    
    "system.globalModifier.martial.range.melee": "Martial Melee Range (bonus)",
    "system.globalModifier.martial.range.normal": "Martial Normal Range (bonus)",
    "system.globalModifier.martial.range.max": "Martial Max Range (bonus)",
    "system.globalModifier.spell.range.melee": "Spell Melee Range (bonus)",
    "system.globalModifier.spell.range.normal": "Spell Normal Range (bonus)",
    "system.globalModifier.spell.range.max": "Spell Max Range (bonus)",

    "system.globalFormulaModifiers.damage.martial.melee": "GFM: Melee Martial Damage",
    "system.globalFormulaModifiers.damage.martial.ranged": "GFM: Ranged Martial Damage",
    "system.globalFormulaModifiers.damage.martial.area": "GFM: Area Martial Damage",
    "system.globalFormulaModifiers.damage.spell.melee": "GFM: Melee Spell Damage",
    "system.globalFormulaModifiers.damage.spell.ranged": "GFM: Ranged Spell Damage",
    "system.globalFormulaModifiers.damage.spell.area": "GFM: Area Spell Damage",
    "system.globalFormulaModifiers.damage.any": "GFM: Any Damage",
    "system.globalFormulaModifiers.healing": "GFM: Healing",

    // Dynamic Roll Modifier
    "system.dynamicRollModifier.onYou.martial.melee": "DRM: Melee Martial Attack",
    "system.dynamicRollModifier.onYou.martial.ranged": "DRM: Ranged Martial Attack",
    "system.dynamicRollModifier.onYou.martial.area": "DRM: Area Martial Attack",
    "system.dynamicRollModifier.onYou.spell.melee": "DRM: Melee Spell Attack",
    "system.dynamicRollModifier.onYou.spell.ranged": "DRM: Ranged Spell Attack",
    "system.dynamicRollModifier.onYou.spell.area": "DRM: Area Spell Attack",

    "system.dynamicRollModifier.onYou.checks.mig": "DRM: Might Check",
    "system.dynamicRollModifier.onYou.checks.agi": "DRM: Agility Check",
    "system.dynamicRollModifier.onYou.checks.cha": "DRM: Charisma Check",
    "system.dynamicRollModifier.onYou.checks.int": "DRM: Intelligence Check",
    "system.dynamicRollModifier.onYou.checks.att": "DRM: Attack Check",
    "system.dynamicRollModifier.onYou.checks.mar": "DRM: Martial Check",
    "system.dynamicRollModifier.onYou.checks.spe": "DRM: Spell Check",
    "system.dynamicRollModifier.onYou.initiative": "DRM: Initiative Check",
    "system.dynamicRollModifier.onYou.skills": "DRM: Skill Check",

    "system.dynamicRollModifier.onYou.saves.mig": "DRM: Might Save",
    "system.dynamicRollModifier.onYou.saves.agi": "DRM: Agility Save",
    "system.dynamicRollModifier.onYou.saves.cha": "DRM: Charisma Save",
    "system.dynamicRollModifier.onYou.saves.int": "DRM: Intelligence Save",
    "system.dynamicRollModifier.onYou.deathSave": "DRM: Death Save",

    "system.dynamicRollModifier.againstYou.martial.melee": "DRM (Against): Melee Martial Attack ",
    "system.dynamicRollModifier.againstYou.martial.ranged": "DRM (Against): Ranged Martial Attack",
    "system.dynamicRollModifier.againstYou.martial.area": "DRM (Against): Area Martial Attack",
    "system.dynamicRollModifier.againstYou.spell.melee": "DRM (Against): Melee Spell Attack",
    "system.dynamicRollModifier.againstYou.spell.ranged": "DRM (Against): Ranged Spell Attack",
    "system.dynamicRollModifier.againstYou.spell.area": "DRM (Against): Area Spell Attack",

    "system.dynamicRollModifier.againstYou.checks.mig": "DRM (Against): Might Check",
    "system.dynamicRollModifier.againstYou.checks.agi": "DRM (Against): Agility Check",
    "system.dynamicRollModifier.againstYou.checks.cha": "DRM (Against): Charisma Check",
    "system.dynamicRollModifier.againstYou.checks.int": "DRM (Against): Intelligence Check",
    "system.dynamicRollModifier.againstYou.checks.att": "DRM (Against): Attack Check",
    "system.dynamicRollModifier.againstYou.checks.mar": "DRM (Against): Martial Check",
    "system.dynamicRollModifier.againstYou.checks.spe": "DRM (Against): Spell Check",

    "system.dynamicRollModifier.againstYou.skills": "DRM (Against): Skill Check",
    "system.dynamicRollModifier.againstYou.trades": "DRM (Against): Trade Check",

    "system.dynamicRollModifier.againstYou.saves.mig": "DRM (Against): Might Save",
    "system.dynamicRollModifier.againstYou.saves.agi": "DRM (Against): Agility Save",
    "system.dynamicRollModifier.againstYou.saves.cha": "DRM (Against): Charisma Save",
    "system.dynamicRollModifier.againstYou.saves.int": "DRM (Against): Intelligence Save",

    // Events
    "system.events": "Events",
  }
}

function _damageReduction() {
  const reduction = {};
  Object.entries(CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes).forEach(([key, dmgLabel]) => {
    if (key !== "true") {
      reduction[`system.damageReduction.damageTypes.${key}.resist`] = `${dmgLabel}: Resistance (X)`
      reduction[`system.damageReduction.damageTypes.${key}.resistance`] = `${dmgLabel}: Resistance (Half)`
      reduction[`system.damageReduction.damageTypes.${key}.immune`] = `${dmgLabel}: Resistance (Immune)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerable`] = `${dmgLabel}: Vulnerable (X)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerability`] = `${dmgLabel}: Vulnerability (Double)`
    } 
  });
  return reduction;
}

function _statusResistances() {
  const statusResistances = {};
  Object.entries(CONFIG.DC20RPG.DROPDOWN_DATA.allStatuses).forEach(([key, condLabel]) => {
    statusResistances[`system.statusResistances.${key}.immunity`] = `${condLabel} Immunity`
    statusResistances[`system.statusResistances.${key}.resistance`] = `${condLabel} Resistance`
    statusResistances[`system.statusResistances.${key}.vulnerability`] = `${condLabel} Vulnerability`
  });
  return statusResistances;
}

function _attributeBonuses() {
  const attributes = {};
  const checks = {};
  const saves = {}
  Object.entries(CONFIG.DC20RPG.TRANSLATION_LABELS.attributes).forEach(([key, atrLabel]) => {
    attributes[`system.attributes.${key}.bonuses.value`] = `Attribute Value Bonus: ${atrLabel}`
    checks[`system.attributes.${key}.bonuses.check`] = `Attribute Check Bonus: ${atrLabel}`
    saves[`system.attributes.${key}.bonuses.save`] = `Save Bonus: ${atrLabel}`
  });
  return {...attributes, ...checks, ...saves};
}

function _skillBonuses() {
  const skills = {};
  Object.entries(CONFIG.DC20RPG.skills)
    .forEach(([key, skillLabel]) => skills[`system.skills.${key}.bonus`] = `${skillLabel}: Skill Check Bonus`);

  Object.entries(CONFIG.DC20RPG.trades)
    .forEach(([key, skillLabel]) => skills[`system.trades.${key}.bonus`] = `${skillLabel}: Trade Skill Check Bonus`);

  return skills;
}

function _combatTraining() {
  const combatTraining = {};
  Object.entries(CONFIG.DC20RPG.TRANSLATION_LABELS.combatTraining)
    .forEach(([key, trainingLabel]) => combatTraining[`system.combatTraining.${key}`] = `Combat Training: ${trainingLabel}`);
  return combatTraining;
}