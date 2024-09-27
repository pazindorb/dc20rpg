import { DC20RPG } from "../../helpers/config.mjs";

export function duplicateData(context, actor) {
  context.config = DC20RPG;
  context.type = actor.type;
  context.system = actor.system;
  context.flags = actor.flags;
  context.editMode = context.flags.dc20rpg?.editMode;
  context.expandedSidebar = !game.user.getFlag("dc20rpg", "sheet.character.sidebarCollapsed");
  context.weaponsOnActor = actor.getWeapons();
}

export function prepareCommonData(context) {
  _damageReduction(context);
  _conditions(context);
  _resourceBarsPercentages(context);
  _oneliners(context);
}

export function prepareCharacterData(context) {
  _skills(context);
  _knowledgeSkills(context);
  _tradeSkills(context);
  _languages(context);
}

export function prepareNpcData(context) {
  _allSkills(context);
  _languages(context);
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

function _conditions(context) {
  const conditions = context.system.conditions;
  for (const [key, condition] of Object.entries(conditions)) {
    condition.notEmpty = false;
    if (condition.immunity) condition.notEmpty = true;
    if (condition.advantage) condition.notEmpty = true;
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

function _oneliners(context) {
  const oneliners = {
    damageReduction: {},
    conditions: {}
  }

  const dmgRed = Object.entries(context.system.damageReduction.damageTypes)
                    .map(([key, reduction]) => [key, _prepReductionOneliner(reduction)])
                    .filter(([key, oneliner]) => oneliner)

  const conditions = Object.entries(context.system.conditions)
                      .map(([key, condition]) => [key, _prepConditionsOneliners(condition)])
                      .filter(([key, oneliner]) => oneliner)

  oneliners.damageReduction = Object.fromEntries(dmgRed);
  oneliners.conditions = Object.fromEntries(conditions);
  context.oneliners = oneliners;
}

function _allSkills(context) {
  const skills = Object.entries(context.system.skills)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills = {
    allSkills: Object.fromEntries(skills)
  }
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

function _prepReductionOneliner(reduction) {
  if (reduction.immune) return `${reduction.label} ${game.i18n.localize("dc20rpg.sheet.dmgTypes.immune")}`;

  let oneliner = "";

  // Resist / Vulnerable
  const reductionX = reduction.resist - reduction.vulnerable;
  if (reductionX > 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.dmgTypes.resistanceX");
    typeLabel = typeLabel.replace("X", reductionX);
    oneliner += `${reduction.label} ${typeLabel}`;
  }
  if (reductionX < 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.dmgTypes.vulnerabilityX");
    typeLabel = typeLabel.replace("X", Math.abs(reductionX));
    oneliner += `${reduction.label} ${typeLabel}`;
  }

  // Reduction / Vulnerability 
  if (reduction.vulnerability && !reduction.resistance) {
    if (oneliner) oneliner += ` & ${game.i18n.localize("dc20rpg.sheet.dmgTypes.resistanceHalf")}`;
    else oneliner += `${reduction.label} ${game.i18n.localize("dc20rpg.sheet.dmgTypes.resistanceHalf")}`
  }
  if (reduction.resistance && !reduction.vulnerability) {
    if (oneliner) oneliner += ` & ${game.i18n.localize("dc20rpg.sheet.dmgTypes.vulnerabilityHalf")}`;
    else oneliner += `${reduction.label} ${game.i18n.localize("dc20rpg.sheet.dmgTypes.vulnerabilityHalf")}`
  }
  return oneliner;
}

function _prepConditionsOneliners(condition) {
  if (condition.immunity) return `${condition.label} ${game.i18n.localize("dc20rpg.sheet.condImm.immunity")}`;
  if (condition.advantage > 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.condImm.adv");
    typeLabel = typeLabel.replace("X", Math.abs(condition.advantage));
    return `${condition.label} ${typeLabel}`;
  }
  if (condition.advantage < 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.condImm.disadv");
    typeLabel = typeLabel.replace("X", Math.abs(condition.advantage));
    return `${condition.label} ${typeLabel}`;
  }
  return ""
}