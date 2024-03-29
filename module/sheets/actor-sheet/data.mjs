import { DC20RPG } from "../../helpers/config.mjs";

export function prepareActorSheetData(context, actor) {
  _skills(context, actor);
  _knowledgeSkills(context, actor);
  _tradeSkills(context, actor);
  _languages(context, actor);
}

function _skills(context, actor) {
  const skills = Object.entries(actor.system.skills)
                  .filter(([key, skill]) => !skill.knowledgeSkill)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills = {
    skills: Object.fromEntries(skills)
  }
}

function _knowledgeSkills(context, actor) {
  const knowledge = Object.entries(actor.system.skills)
                      .filter(([key, skill]) => skill.knowledgeSkill)
                      .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills.knowledge = Object.fromEntries(knowledge);
}

function _tradeSkills(context, actor) {
  const trade = Object.entries(actor.system.tradeSkills)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills.trade = Object.fromEntries(trade);
}

function _languages(context, actor) {
  const languages = Object.entries(actor.system.languages)
                  .map(([key, skill]) => [key, _prepLangMastery(skill)]);
  context.skills.languages = languages;
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