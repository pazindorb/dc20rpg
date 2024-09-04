import { addStatusWithIdToActor, removeStatusWithIdFromActor } from "../statusEffects/statusUtils.mjs";
import { getSelectedTokens } from "./actors/tokens.mjs";
import { DC20RPG } from "./config.mjs";

export function prepareActiveEffectsAndStatuses(owner, context) {
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
  for ( let effect of owner.effects ) {
    effect.originName = effect.sourceName;
    if (effect.statuses?.size > 0) _connectEffectAndStatus(effect, statuses, owner);
    if (effect.sourceName === "None") {} // None means it is a condition, we can ignore that one.
    else if (effect.isTemporary && effect.disabled) effects.disabled.effects.push(effect);
    else if (effect.disabled) effects.inactive.effects.push(effect);
    else if (effect.isTemporary) effects.temporary.effects.push(effect);
    else effects.passive.effects.push(effect);
  }

  // When both Unconscious and Petrified conditions are active
  // where we need to remove single stack of exposed condition. 
  // Right now I have no idea how to deal with that case better. Hardcoded it is then...
  if (owner.hasStatus("unconscious") && owner.hasStatus("petrified")) {
    const status = statuses.find(e => e.id === "exposed")
    status.stack--;
  }
  context.effects = effects;
  context.statuses = statuses
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

  for ( let effect of owner.effects ) {
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
export function createEffectOn(type, owner) {
  const duration = type === "temporary" ? 1 : undefined
  const inactive = type === "inactive";
  owner.createEmbeddedDocuments("ActiveEffect", [{
    label: "New Effect",
    img: "icons/svg/aura.svg",
    origin: owner.uuid,
    "duration.rounds": duration,
    disabled: inactive
  }]);
}

export function editEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.sheet.render(true);
}

export function deleteEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.delete();
}

export function toggleEffectOn(effectId, owner) {
  const effect = getEffectFrom(effectId, owner);
  effect.update({disabled: !effect.disabled});
}

export function toggleConditionOn(statusId, owner, addOrRemove) {
  if (addOrRemove === 1) addStatusWithIdToActor(owner, statusId);
  if (addOrRemove === 3) removeStatusWithIdFromActor(owner, statusId);
}

export function getEffectFrom(effectId, owner) {
  return owner.effects.get(effectId);
}

//===========================================================
//     Method exposed for efect management with macros      =  
//===========================================================
export const effectMacroHelper = {
  toggleEffectOnSelectedTokens: async function (effect) {
    const tokens = await getSelectedTokens();
    if (tokens) tokens.forEach(token => this.toggleEffectOnActor(effect, token.actor));
  },

  toggleEffectOnActor: function(effect, owner) {
    if (this.effectWithNameExists(effect.name, owner)) this.deleteEffectWithName(effect.name, owner);
    else this.addEffectToActor(effect, owner); 
  },

  addEffectToActor: function(effect, owner) {
    effect.owner = owner.uuid;
    owner.createEmbeddedDocuments("ActiveEffect", [effect]);
  },

  effectWithNameExists: function(effectName, owner) {
    return owner.effects.getName(effectName) !== undefined;
  },

  deleteEffectWithName: function(effectName, owner) {
    const effect = owner.effects.getName(effectName);
    effect.delete();
  },
}
   
//===========================================================
/**
 * List of default actor keys that are expected to be modified by effects
 */
export function getEffectModifiableKeys() {
  return {
    // Defence bonus
    "system.defences.physical.bonuses.always": "Physical Defense bonus",
    "system.defences.physical.bonuses.noArmor": "Physical Defense bonus (when no armor equipped)",
    "system.defences.physical.bonuses.noHeavy": "Physical Defense bonus (when no heavy armor equipped)",
    "system.defences.mystical.bonuses.always": "Mystical Defense bonus",
    "system.defences.mystical.bonuses.noArmor": "Mystical Defense bonus (when no armor equipped)",
    "system.defences.mystical.bonuses.noHeavy": "Mystical Defense bonus (when no heavy armor equipped)",
    "system.defences.physical.formulaKey": "Physical Defence formula key",
    "system.defences.mystical.formulaKey": "Mystical Defence formula key",

    // Damage reduction
    "system.damageReduction.pdr.bonus": "Physical Damage Reduction",
    "system.damageReduction.mdr.bonus": "Mystical Damage Reduction",
    ..._damageReduction(),

    // Conditions
    ..._conditions(),

    // Resources
    "system.resources.health.bonus": "Max HP bonus",
    "system.resources.mana.bonus": "Max Mana bonus",
    "system.resources.stamina.bonus": "Max Stamina bonus",
    "system.resources.health.bonus": "Max HP bonus",

    // Death
    "system.death.bonus": "Death's Door bonus",

    // Movement
    "system.movement.ground.bonus": "Ground Speed bonus",
    "system.movement.climbing.bonus": "Climbing Speed bonus",
    "system.movement.climbing.fullSpeed": "Climbing equal Movement",
    "system.movement.climbing.halfSpeed": "Climbing equal Half Movement",
    "system.movement.swimming.bonus": "Swimming Speed bonus",
    "system.movement.swimming.fullSpeed": "Swimming equal Movement",
    "system.movement.swimming.halfSpeed": "Swimming equal Half Movement",
    "system.movement.burrow.bonus": "Burrow Speed bonus",
    "system.movement.burrow.fullSpeed": "Burrow equal Movement",
    "system.movement.burrow.halfSpeed": "Burrow equal Half Movement",
    "system.movement.glide.bonus": "Glide Speed bonus",
    "system.movement.glide.fullSpeed": "Glide equal Movement",
    "system.movement.glide.halfSpeed": "Glide equal Half Movement",
    "system.movement.flying.bonus": "Flying Speed bonus",
    "system.movement.flying.fullSpeed": "Flying equal Movement",
    "system.movement.flying.halfSpeed": "Flying equal Half Movement",
    "system.jump.bonus": "Jump Distance bonus",
    "system.jump.key": "Jumb Attribute",

    // Vision
    "system.senses.darkvision.bonus": "Darkvision bonus",
    "system.senses.tremorsense.bonus": "Tremorsense bonus",
    "system.senses.blindsight.bonus": "Blindsight bonus",
    "system.senses.truesight.bonus": "Truesight bonus",

    // Creature size
    "system.size.size": "Size",

    // Attack and Save
    "system.attackMod.bonus.spell": "Spell Check bonus",
    "system.attackMod.bonus.martial": "Attack Check bonus",
    "system.saveDC.bonus.spell": "Spell Check bonus",
    "system.saveDC.bonus.martial": "Attack Check bonus",

    // Attribute bonus
    ..._attributeBonuses(),

    // Skill expertise
    "system.expertise.skills": "Skill Expertise",
    "system.expertise.trade": "Trade Skill Expertise",

    // Skills bonus
    ..._skillBonuses(),

    // Skill Points bonus
    "system.attributePoints.bonus": "Attribute Points",
    "system.savePoints.bonus": "Save Masteries",
    "system.skillPoints.skill.bonus": "Skill Points",
    "system.skillPoints.knowledge.bonus": "Knowledge Skill Points",
    "system.skillPoints.trade.bonus": "Trade Skill Points",
    "system.skillPoints.language.bonus": "Language Points",

    "system.known.cantrips.max": "Cantrips Known",
    "system.known.spells.max": "Spells Known",
    "system.known.maneuvers.max": "Maneuvers Known",
    "system.known.techniques.max": "Techniques Known",

    // Masteries
    ..._masteries(),

    // Rest Points
    "system.rest.restPoints.bonus" : "Rest Points bonus",
    "system.rest.restPoints.maxFormula" : "Rest Points calculation formula",

    // Global Formula modifier
    "system.globalFormulaModifiers.attackCheck": "Formula Modifier: Attack Check",
    "system.globalFormulaModifiers.spellCheck": "Formula Modifier: Spell Check",
    "system.globalFormulaModifiers.attributeCheck": "Formula Modifier: Attribute Check",
    "system.globalFormulaModifiers.save": "Formula Modifier: Save",
    "system.globalFormulaModifiers.skillCheck": "Formula Modifier: Skill Check",
    "system.globalFormulaModifiers.tradeCheck": "Formula Modifier: Trade Skill Check",
    "system.globalFormulaModifiers.healing": "Healing Modifier",
    "system.globalFormulaModifiers.attackDamage.martial.melee": "Damage Modifier: Melee Martial",
    "system.globalFormulaModifiers.attackDamage.martial.ranged": "Damage Modifier: Ranged Martial",
    "system.globalFormulaModifiers.attackDamage.spell.melee": "Damage Modifier: Melee Spell",
    "system.globalFormulaModifiers.attackDamage.spell.ranged": "Damage Modifier: Ranged Spell",

    // Roll Level
    "system.rollLevel.againstYou.martial.melee": "Against You: Roll Level with Melee Martial Attack ",
    "system.rollLevel.againstYou.martial.ranged": "Against You: Roll Level with Ranged Martial Attack",
    "system.rollLevel.againstYou.spell.melee": "Against You: Roll Level with Melee Spell Attack",
    "system.rollLevel.againstYou.spell.ranged": "Against You: Roll Level with Ranged Spell Attack",

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

    "system.rollLevel.onYou.saves.mig": "Roll Level with Might Saves",
    "system.rollLevel.onYou.saves.agi": "Roll Level with Agility Saves",
    "system.rollLevel.onYou.saves.cha": "Roll Level with Charisma Saves",
    "system.rollLevel.onYou.saves.int": "Roll Level with Inteligence Saves",

    // Auto Roll Outcome
    "system.autoRollOutcome.onYou.martial.melee": "Automatic Roll Outcome with Melee Martial Attack",
    "system.autoRollOutcome.onYou.martial.ranged": "Automatic Roll Outcome with Ranged Martial Attack",
    "system.autoRollOutcome.onYou.spell.melee": "Automatic Roll Outcome with Melee Spell Attack",
    "system.autoRollOutcome.onYou.spell.ranged": "Automatic Roll Outcome with Ranged Spell Attack",

    "system.autoRollOutcome.onYou.checks.mig": "Automatic Roll Outcome with Might Checks",
    "system.autoRollOutcome.onYou.checks.agi": "Automatic Roll Outcome with Agility Checks",
    "system.autoRollOutcome.onYou.checks.cha": "Automatic Roll Outcome with Charisma Checks",
    "system.autoRollOutcome.onYou.checks.int": "Automatic Roll Outcome with Inteligence Checks",
    "system.autoRollOutcome.onYou.checks.att": "Automatic Roll Outcome with Attack Check",
    "system.autoRollOutcome.onYou.checks.spe": "Automatic Roll Outcome with Spell Check",

    "system.autoRollOutcome.onYou.saves.mig": "Automatic Roll Outcome with Might Saves",
    "system.autoRollOutcome.onYou.saves.agi": "Automatic Roll Outcome with Agility Saves",
    "system.autoRollOutcome.onYou.saves.cha": "Automatic Roll Outcome with Charisma Saves",
    "system.autoRollOutcome.onYou.saves.int": "Automatic Roll Outcome with Inteligence Saves",

    // Events
    "system.events": "Events",
  }
}

function _damageReduction() {
  const reduction = {};
  Object.entries(DC20RPG.damageTypes).forEach(([key, dmgLabel]) => {
    if (key !== "true") {
      reduction[`system.damageReduction.damageTypes.${key}.resist`] = `${dmgLabel} Resistance (X)`
      reduction[`system.damageReduction.damageTypes.${key}.resistance`] = `${dmgLabel} Resistance (Half)`
      reduction[`system.damageReduction.damageTypes.${key}.immune`] = `${dmgLabel} Resistance (Immune)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerable`] = `${dmgLabel} Vulnerable (X)`
      reduction[`system.damageReduction.damageTypes.${key}.vulnerability`] = `${dmgLabel} Vulnerability (Double)`
    } 
  });
  return reduction;
}

function _conditions() {
  const conditions = {};
  Object.entries(DC20RPG.conditions).forEach(([key, condLabel]) => {
    conditions[`system.conditions.${key}.immunity`] = `${condLabel} Immunity`
    conditions[`system.conditions.${key}.advantage`] = `${condLabel} Roll Level against`
  });
  return conditions;
}

function _attributeBonuses() {
  const attributes = {};
  Object.entries(DC20RPG.attributes).forEach(([key, atrLabel]) => {
    attributes[`system.attributes.${key}.bonuses.check`] = `${atrLabel} Check bonus`
    attributes[`system.attributes.${key}.bonuses.save`] = `${atrLabel} Save bonus`
    attributes[`system.attributes.${key}.bonuses.value`] = `${atrLabel} bonus`
  });
  return attributes;
}

function _skillBonuses() {
  const skills = {};
  Object.entries(DC20RPG.skills)
    .forEach(([key, skillLabel]) => skills[`system.skills.${key}.bonus`] = `${skillLabel} Check bonus`);

  Object.entries(DC20RPG.tradeSkills)
    .forEach(([key, skillLabel]) => skills[`system.tradeSkills.${key}.bonus`] = `${skillLabel} Check bonus`);

  return skills;
}

function _masteries() {
  const masteries = {};
  Object.entries(DC20RPG.masteries)
    .forEach(([key, masteryLabel]) => masteries[`system.masteries.${key}`] = `${masteryLabel} Mastery`);
  return masteries;
}