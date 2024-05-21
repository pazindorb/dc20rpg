import { DC20RPG } from "../../helpers/config.mjs";

export function duplicateData(context, actor) {
  context.config = DC20RPG;
  context.type = actor.type;
  context.system = actor.system;
  context.flags = actor.flags;
  context.editMode = context.flags.dc20rpg?.editMode;
  context.expandedSidebar = game.user.getFlag("dc20rpg", "sheet.character.expandSidebar");
  context.weaponsOnActor = actor.getWeapons();
}

export function prepareCommonData(context) {
  _translatedLabels(context);
  _damageReduction(context);
  _resourceBarsPercentages(context);
}

export function prepareCharacterData(context) {
  _skills(context);
  _knowledgeSkills(context);
  _tradeSkills(context);
  _languages(context);
}

function _translatedLabels(context) {
  // Attributes
  for (const [key, attribute] of Object.entries(context.system.attributes)) {
    attribute.label = game.i18n.localize(`dc20rpg.attributes.${key}`) ?? key;
  }

  // Skills
  for (const [key, skill] of Object.entries(context.system.skills)) {
    if (!skill.custom) skill.label = game.i18n.localize(`dc20rpg.skills.${key}`) ?? key;
  }

  // Trade Skills
  if (context.system.tradeSkills) {
    for (const [key, skill] of Object.entries(context.system.tradeSkills)) {
      skill.label = game.i18n.localize(`dc20rpg.trades.${key}`);
    }
  }

  // Languages
  for (const [key, language] of Object.entries(context.system.languages)) {
    if (!language.custom) language.label = game.i18n.localize(`dc20rpg.languages.${key}`);
  }

  // Damage Reductions
  for (const [key, resistance] of Object.entries(context.system.damageReduction.damageTypes)) {
    resistance.label = game.i18n.localize(`dc20rpg.reductions.${key}`);
  }

  // Conditions
  for (const [key, condition] of Object.entries(context.system.immunities.conditions)) {
    condition.label = game.i18n.localize(`dc20rpg.conditions.${key}`);
  }
}

function _damageReduction(context) {
  const dmgTypes = context.system.damageReduction.damageTypes;
  for (const [key, dmgType] of Object.entries(dmgTypes)) {
    dmgType.notEmpty = false;
    if (dmgType.immune) dmgType.notEmpty = true;
    if (dmgType.resistance) dmgType.notEmpty = true;
    if (dmgType.vulnerability) dmgType.notEmpty = true;
    if (dmgType.vulnerable) dmgType.notEmpty = true;
    if (dmgType.resist) dmgType.notEmpty = true;
  }
}

function _resourceBarsPercentages(context) {
  const hpCurrent = context.system.resources.health.current;
  const hpMax = context.system.resources.health.max;
  const hpPercent = Math.ceil(100 * hpCurrent/hpMax);
  if (isNaN(hpPercent)) context.system.resources.health.percent = 0;
  else context.system.resources.health.percent = hpPercent <= 100 ? hpPercent : 100;

  const hpValue = context.system.resources.health.value;
  const hpPercentTemp = Math.ceil(100 * hpValue/hpMax);
  if (isNaN(hpPercent)) context.system.resources.health.percentTemp = 0;
  else context.system.resources.health.percentTemp = hpPercentTemp <= 100 ? hpPercentTemp : 100;

  const manaCurrent = context.system.resources.mana.value;
  const manaMax = context.system.resources.mana.max;
  const manaPercent = Math.ceil(100 * manaCurrent/manaMax);
  if (isNaN(manaPercent)) context.system.resources.mana.percent = 0;
  else context.system.resources.mana.percent = manaPercent <= 100 ? manaPercent : 100;

  const staminaCurrent = context.system.resources.stamina.value;
  const staminaMax = context.system.resources.stamina.max;
  const staminaPercent = Math.ceil(100 * staminaCurrent/staminaMax);
  if (isNaN(staminaPercent)) context.system.resources.stamina.percent = 0;
  else context.system.resources.stamina.percent = staminaPercent <= 100 ? staminaPercent : 100;
}

function _skills(context) {
  const skills = Object.entries(context.system.skills)
                  .filter(([key, skill]) => !skill.knowledgeSkill)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills = {
    skills: Object.fromEntries(skills)
  }
}

function _knowledgeSkills(context) {
  const knowledge = Object.entries(context.system.skills)
                      .filter(([key, skill]) => skill.knowledgeSkill)
                      .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills.knowledge = Object.fromEntries(knowledge);
}

function _tradeSkills(context) {
  const trade = Object.entries(context.system.tradeSkills)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills.trade = Object.fromEntries(trade);
}

function _languages(context) {
  const languages = Object.entries(context.system.languages)
                  .map(([key, skill]) => [key, _prepLangMastery(skill)]);
  context.skills.languages = Object.fromEntries(languages);
}

function _prepSkillMastery(skill) {
  const mastery = skill.mastery;
  skill.short = DC20RPG.skillMasteryShort[mastery];
  skill.masteryLabel = DC20RPG.skillMasteryLabel[mastery];
  return skill;
}

function _prepLangMastery(lang) {
  const mastery = lang.mastery;
  lang.short = DC20RPG.languageMasteryShort[mastery];
  lang.masteryLabel = DC20RPG.languageMasteryLabel[mastery];
  return lang;
}