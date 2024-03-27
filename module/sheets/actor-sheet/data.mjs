export function prepareActorSheetData(context, actor) {
  _skills(context, actor);
  _knowledgeSkills(context, actor);
  _tradeSkills(context, actor);
  _languages(context, actor);
}

function _skills(context, actor) {
  const skills = Object.entries(actor.system.skills).filter(([key, skill]) => !skill.knowledgeSkill);
  context.skills = {
    skills: Object.fromEntries(skills)
  }
}

function _knowledgeSkills(context, actor) {
  const knowledge = Object.entries(actor.system.skills).filter(([key, skill]) => skill.knowledgeSkill);
  context.skills.knowledge = Object.fromEntries(knowledge);
}

function _tradeSkills(context, actor) {
  context.skills.trade = actor.system.tradeSkills;
}

function _languages(context, actor) {
  context.skills.languages = actor.system.languages;
}