import { sendEffectRemovedMessage } from "../chat/chat-message.mjs";
import { getActorFromIds } from "./actors/tokens.mjs";
import { evaluateDicelessFormula } from "./rolls.mjs";
import { emitEventToGM } from "./sockets.mjs";

export function prepareActiveEffectsAndStatuses(owner, context) {
  const hideNonessentialEffects = owner.flags.dc20rpg?.hideNonessentialEffects;
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
    if (effect.sourceName === "None") {} // None means it is a condition, we can ignore that one.
    else {
      effect.originName = effect.parent.name;
      effect.timeLeft = effect.roundsLeft;
      effect.canChangeState = effect.stateChangeLocked;
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
        if ((effect.statuses.size > 1 && effect.name !== status.name) || effect.sourceName !== "None") {
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
  if (!owner.canUserModify(game.user, "create")) {
    emitEventToGM("addDocument", {
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

export async function deleteEffectFrom(effectId, owner) {
  if (!owner.canUserModify(game.user, "delete")) {
    emitEventToGM("removeDocument", {
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

export async function effectsToRemovePerActor(toRemove) {
  const actor = getActorFromIds(toRemove.actorId, toRemove.tokenId);
  if (actor) {
    const effect = getEffectFrom(toRemove.effectId, actor);
    const afterRoll = toRemove.afterRoll;
    if (effect) {
      if (afterRoll === "delete") {
        sendEffectRemovedMessage(actor, effect);
        effect.delete();
      }
      if (afterRoll === "disable") effect.disable();
    }
  }
}
   

//===========================================================
export function injectFormula(effect, effectOwner) {
  if (!effectOwner) return;
  const rollData = effectOwner.getRollData();

  for (const change of effect.changes) {
    const value = change.value;
    
    // formulas start with "<#" and end with "#>"
    if (value.includes("<#") && value.includes("#>")) {
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

export function getMesuredTemplateEffects(item, applicableEffects) {
  if (!item) return {applyFor: "", effects: []};
  if (item.effects.size === 0) return {applyFor: "", effects: []};
  if (item.system.effectsConfig.addToTemplates === "") return {applyFor: "", effects: []};

  return {
    applyFor: item.system.effectsConfig.addToTemplates,
    effects: applicableEffects || item.effects.toObject()
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
    "system.damageReduction.pdr.active": "Physical Damage Reduction",
    "system.damageReduction.edr.active": "Elemental Damage Reduction",
    "system.damageReduction.mdr.active": "Mystical Damage Reduction",
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
    "system.resources.health.bonus": "Health - Max Value Bonus",
    "system.resources.mana.bonus": "Mana - Max Value Bonus",
    "system.resources.mana.maxFormula" : "Mana - Calculation Formula",
    "system.resources.stamina.bonus": "Stamina - Max Value Bonus",
    "system.resources.stamina.maxFormula" : "Stamina - Calculation Formula",
    "system.resources.grit.bonus": "Grit - Max Value Bonus",
    "system.resources.grit.maxFormula" : "Grit - Calculation Formula",
    "system.resources.restPoints.bonus" : "Rest Points - Max Value Bonus",
    
    // Help Dice
    "system.help.maxDice": "Help Dice - Max Dice",

    // Death
    "system.death.bonus": "Death's Door Threshold Bonus",

    // Movement
    "system.moveCost": "Cost of moving 1 Space",
    "system.movement.ground.bonus": "Ground Speed Bonus",
    "system.movement.climbing.bonus": "Climbing Speed Bonus",
    "system.movement.climbing.fullSpeed": "Climbing equal Movement",
    "system.movement.climbing.halfSpeed": "Climbing equal Half Movement",
    "system.movement.swimming.bonus": "Swimming Speed Bonus",
    "system.movement.swimming.fullSpeed": "Swimming equal Movement",
    "system.movement.swimming.halfSpeed": "Swimming equal Half Movement",
    "system.movement.burrow.bonus": "Burrow Speed Bonus",
    "system.movement.burrow.fullSpeed": "Burrow equal Movement",
    "system.movement.burrow.halfSpeed": "Burrow equal Half Movement",
    "system.movement.glide.bonus": "Glide Speed Bonus",
    "system.movement.glide.fullSpeed": "Glide equal Movement",
    "system.movement.glide.halfSpeed": "Glide equal Half Movement",
    "system.movement.flying.bonus": "Flying Speed Bonus",
    "system.movement.flying.fullSpeed": "Flying equal Movement",
    "system.movement.flying.halfSpeed": "Flying equal Half Movement",
    "system.jump.bonus": "Jump Distance Bonus",
    "system.jump.key": "Jump Attribute",

    // Senses
    "system.senses.darkvision.range": "Darkvision - Base range (always)",
    "system.senses.darkvision.bonus": "Darkvision - Bonus (always)",
    "system.senses.darkvision.orOption.range": "Darkvision - Base range (if no other source)",
    "system.senses.darkvision.orOption.bonus": "Darkvision - Bonus (if other source exist)",
    "system.senses.tremorsense.range": "Tremorsense - Base range (always)",
    "system.senses.tremorsense.bonus": "Tremorsense - Bonus (always)",
    "system.senses.tremorsense.orOption.range": "Tremorsense - Base range (if no other source)",
    "system.senses.tremorsense.orOption.bonus": "Tremorsense - Bonus (if other source exist)",
    "system.senses.blindsight.range": "Blindsight - Base range (always)",
    "system.senses.blindsight.bonus": "Blindsight - Bonus (always)",
    "system.senses.blindsight.orOption.range": "Blindsight - Base range (if no other source)",
    "system.senses.blindsight.orOption.bonus": "Blindsight - Bonus (if other source exist)",
    "system.senses.truesight.range": "Truesight - Base range (always)",
    "system.senses.truesight.bonus": "Truesight - Bonus (always)",
    "system.senses.truesight.orOption.range": "Truesight - Base range (if no other source)",
    "system.senses.truesight.orOption.bonus": "Truesight - Bonus (if other source exist)",

    // Creature size
    "system.size.size": "Size",

    // Attack and Save
    "system.attackMod.bonus.spell": "Spell Check Bonus",
    "system.attackMod.bonus.martial": "Attack Check Bonus",
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
    "system.skillPoints.trade.bonus": "Trade Skill Points",
    "system.skillPoints.language.bonus": "Language Points",

    "system.known.cantrips.max": "Cantrips Known",
    "system.known.spells.max": "Spells Known",
    "system.known.maneuvers.max": "Maneuvers Known",
    "system.known.techniques.max": "Techniques Known",

    // Combat Training
    ..._combatTraining(),

    // Global Modifiers
    "system.globalModifier.range.melee": "Global Modifier: Melee Range",
    "system.globalModifier.range.normal": "Global Modifier: Normal Range",
    "system.globalModifier.range.max": "Global Modifier: Max Range",
    "system.globalModifier.ignore.difficultTerrain": "Global Modifier: Ignore Difficult Terrain",
    "system.globalModifier.ignore.closeQuarters": "Global Modifier: Ignore Close Quarters",
    "system.globalModifier.ignore.longRange": "Global Modifier: Ignore Long Range Disadvantage",
    "system.globalModifier.ignore.flanking": "Global Modifier: Ignore being Flanked",
    "system.globalModifier.provide.halfCover": "Global Modifier: Provide Half Cover",
    "system.globalModifier.provide.tqCover": "Global Modifier: Provide 3/4 Cover",
    "system.globalModifier.allow.overheal": "Global Modifier: Convert overheal you done to Temp HP",
    "system.globalModifier.prevent.goUnderAP": "Global Modifier: Prevent from going under X AP",
    "system.globalModifier.prevent.healingReduction": "Global Modifier: Reduce Healing Recieved", 
    "system.globalModifier.prevent.hpRegeneration": "Global Modifier: Prevent any Healing", 
    
    // Global Formula modifier
    "system.globalFormulaModifiers.attackCheck": "Formula Modifier: Attack Check",
    "system.globalFormulaModifiers.spellCheck": "Formula Modifier: Spell Check",
    "system.globalFormulaModifiers.attributeCheck": "Formula Modifier: Attribute Check",
    "system.globalFormulaModifiers.save": "Formula Modifier: Save",
    "system.globalFormulaModifiers.skillCheck": "Formula Modifier: Skill Check",
    "system.globalFormulaModifiers.healing": "Formula Modifier: Healing",
    "system.globalFormulaModifiers.attackDamage.martial.melee": "Formula Modifier: Melee Martial Damage",
    "system.globalFormulaModifiers.attackDamage.martial.ranged": "Formula Modifier: Ranged Martial Damage",
    "system.globalFormulaModifiers.attackDamage.spell.melee": "Formula Modifier: Melee Spell Damage",
    "system.globalFormulaModifiers.attackDamage.spell.ranged": "Formula Modifier: Ranged Spell Damage",

    // Roll Level
    "system.rollLevel.onYou.martial.melee": "Roll Level with Melee Martial Attack",
    "system.rollLevel.onYou.martial.ranged": "Roll Level with Ranged Martial Attack",
    "system.rollLevel.onYou.spell.melee": "Roll Level with Melee Spell Attack",
    "system.rollLevel.onYou.spell.ranged": "Roll Level with Ranged Spell Attack",

    "system.rollLevel.onYou.checks.mig": "Roll Level with Might Checks",
    "system.rollLevel.onYou.checks.agi": "Roll Level with Agility Checks",
    "system.rollLevel.onYou.checks.cha": "Roll Level with Charisma Checks",
    "system.rollLevel.onYou.checks.int": "Roll Level with Inteligence Checks",
    "system.rollLevel.onYou.checks.att": "Roll Level with Attack Check",
    "system.rollLevel.onYou.checks.spe": "Roll Level with Spell Check",
    "system.rollLevel.onYou.initiative": "Roll Level with Initiative Check",

    "system.rollLevel.onYou.skills": "Roll Level with Skill Check",
    "system.rollLevel.onYou.tradeSkills": "Roll Level with Trade Check",

    "system.rollLevel.onYou.saves.mig": "Roll Level with Might Saves",
    "system.rollLevel.onYou.saves.agi": "Roll Level with Agility Saves",
    "system.rollLevel.onYou.saves.cha": "Roll Level with Charisma Saves",
    "system.rollLevel.onYou.saves.int": "Roll Level with Inteligence Saves",
    "system.rollLevel.onYou.deathSave": "Roll Level with Death Save",

    "system.rollLevel.againstYou.martial.melee": "Against You: Roll Level with Melee Martial Attack ",
    "system.rollLevel.againstYou.martial.ranged": "Against You: Roll Level with Ranged Martial Attack",
    "system.rollLevel.againstYou.spell.melee": "Against You: Roll Level with Melee Spell Attack",
    "system.rollLevel.againstYou.spell.ranged": "Against You: Roll Level with Ranged Spell Attack",

    "system.rollLevel.againstYou.checks.mig": "Against You: Roll Level with Might Checks",
    "system.rollLevel.againstYou.checks.agi": "Against You: Roll Level with Agility Checks",
    "system.rollLevel.againstYou.checks.cha": "Against You: Roll Level with Charisma Checks",
    "system.rollLevel.againstYou.checks.int": "Against You: Roll Level with Inteligence Checks",
    "system.rollLevel.againstYou.checks.att": "Against You: Roll Level with Attack Check",
    "system.rollLevel.againstYou.checks.spe": "Against You: Roll Level with Spell Check",

    "system.rollLevel.againstYou.skills": "Against You: Roll Level with Skill Check",
    "system.rollLevel.againstYou.tradeSkills": "Against You: Roll Level with Trade Check",

    "system.rollLevel.againstYou.saves.mig": "Against You: Roll Level with Might Saves",
    "system.rollLevel.againstYou.saves.agi": "Against You: Roll Level with Agility Saves",
    "system.rollLevel.againstYou.saves.cha": "Against You: Roll Level with Charisma Saves",
    "system.rollLevel.againstYou.saves.int": "Against You: Roll Level with Inteligence Saves",

    // Events
    "system.events": "Events",
  }
}

function _damageReduction() {
  const reduction = {};
  Object.entries(CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes).forEach(([key, dmgLabel]) => {
    if (key !== "true") {
      reduction[`system.damageReduction.damageTypes.${key}.resist`] = `${dmgLabel} - Resistance (X)`
      reduction[`system.damageReduction.damageTypes.${key}.resistance`] = `${dmgLabel} - Resistance (Half)`
      reduction[`system.damageReduction.damageTypes.${key}.immune`] = `${dmgLabel} - Resistance (Immune)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerable`] = `${dmgLabel} - Vulnerable (X)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerability`] = `${dmgLabel} - Vulnerability (Double)`
    } 
  });
  return reduction;
}

function _statusResistances() {
  const statusResistances = {};
  Object.entries(CONFIG.DC20RPG.DROPDOWN_DATA.statusResistances).forEach(([key, condLabel]) => {
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
    .forEach(([key, skillLabel]) => skills[`system.skills.${key}.bonus`] = `${skillLabel} - Skill Check Bonus`);

  Object.entries(CONFIG.DC20RPG.tradeSkills)
    .forEach(([key, skillLabel]) => skills[`system.tradeSkills.${key}.bonus`] = `${skillLabel} - Trade Skill Check Bonus`);

  return skills;
}

function _combatTraining() {
  const combatTraining = {};
  Object.entries(CONFIG.DC20RPG.TRANSLATION_LABELS.combatTraining)
    .forEach(([key, trainingLabel]) => combatTraining[`system.combatTraining.${key}`] = `Combat Training: ${trainingLabel}`);
  return combatTraining;
}