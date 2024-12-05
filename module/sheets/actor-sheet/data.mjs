import { DC20RPG } from "../../helpers/config.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";

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
  _attributes(context);
  _size(context);
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

export function prepareCompanionData(context) {
  context.shareWithCompanionOwner = _shareOptionsSimplyfied(context.system.shareWithCompanionOwner, "");
}

function _shareOptionsSimplyfied(options, prefix) {
  const simplified = [];
  Object.entries(options).forEach(([key, option]) => {
    if (typeof option === "object") {
      simplified.push(..._shareOptionsSimplyfied(option, key));
    }
    else {
      const finalKey = prefix ? `${prefix}.${key}` : key;
      simplified.push({
        key: finalKey,
        active: option,
        label: game.i18n.localize(`dc20rpg.sheet.companionConfig.${prefix}${key}`),
      })
    }
  })
  return simplified;
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
  const resources = context.system.resources;

  const hpCurrent = resources.health.current;
  const hpMax = resources.health.max;
  const hpPercent = Math.ceil(100 * hpCurrent/hpMax);
  if (isNaN(hpPercent)) resources.health.percent = 0;
  else resources.health.percent = hpPercent <= 100 ? hpPercent : 100;

  const hpValue = resources.health.value;
  const hpPercentTemp = Math.ceil(100 * hpValue/hpMax);
  if (isNaN(hpPercent)) resources.health.percentTemp = 0;
  else resources.health.percentTemp = hpPercentTemp <= 100 ? hpPercentTemp : 100;

  if (!resources.mana) return;
  const manaCurrent = resources.mana.value;
  const manaMax = resources.mana.max;
  const manaPercent = Math.ceil(100 * manaCurrent/manaMax);
  if (isNaN(manaPercent)) resources.mana.percent = 0;
  else resources.mana.percent = manaPercent <= 100 ? manaPercent : 100;

  const staminaCurrent = resources.stamina.value;
  const staminaMax = resources.stamina.max;
  const staminaPercent = Math.ceil(100 * staminaCurrent/staminaMax);
  if (isNaN(staminaPercent)) resources.stamina.percent = 0;
  else resources.stamina.percent = staminaPercent <= 100 ? staminaPercent : 100;

  const gritCurrent = resources.grit.value;
  const gritMax = resources.grit.max;
  const gritPercent = Math.ceil(100 * gritCurrent/gritMax);
  if (isNaN(gritPercent)) resources.grit.percent = 0;
  else resources.grit.percent = gritPercent <= 100 ? gritPercent : 100;
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

function _attributes(context) {
  const attributes = context.system.attributes

  context.attributes = {
    mig: attributes.mig,
    cha: attributes.cha,
    agi: attributes.agi,
    int: attributes.int
  }
}

function _size(context) {
  const size = context.system.size.size;
  const label = size === "mediumLarge" 
                  ? getLabelFromKey("large", DC20RPG.sizes)
                  : getLabelFromKey(context.system.size.size, DC20RPG.sizes)
  context.system.size.label = label;
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
    if (oneliner) oneliner += ` & ${game.i18n.localize("dc20rpg.sheet.dmgTypes.vulnerabilityHalf")}`;
    else oneliner += `${reduction.label} ${game.i18n.localize("dc20rpg.sheet.dmgTypes.vulnerabilityHalf")}`
  }
  if (reduction.resistance && !reduction.vulnerability) {
    if (oneliner) oneliner += ` & ${game.i18n.localize("dc20rpg.sheet.dmgTypes.resistanceHalf")}`;
    else oneliner += `${reduction.label} ${game.i18n.localize("dc20rpg.sheet.dmgTypes.resistanceHalf")}`
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