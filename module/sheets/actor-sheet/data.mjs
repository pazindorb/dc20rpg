import { DC20RPG } from "../../helpers/config.mjs";

export function prepareActorSheetData(context) {
  _skills(context);
  _knowledgeSkills(context);
  _tradeSkills(context);
  _languages(context);

  _damageReduction(context);
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