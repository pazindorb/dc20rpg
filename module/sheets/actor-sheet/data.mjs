import { getActiveHelpDice } from "../../helpers/actors/actions.mjs";
import { getLabelFromKey } from "../../helpers/utils.mjs";

export function duplicateData(context, actor) {
  context.config = CONFIG.DC20RPG;
  context.type = actor.type;
  context.system = foundry.utils.deepClone(actor.system);
  context.flags = foundry.utils.deepClone(actor.flags);
  context.editMode = context.flags.dc20rpg?.editMode;
  context.expandedSidebar = !game.user.getFlag("dc20rpg", "sheet.character.sidebarCollapsed");
  context.help = _help(actor);
  context.items = actor.items.contents;
}

function _help(actor) {
  return {
    dice: getActiveHelpDice(actor),
    rowSize: 5
  }
}

export function prepareCommonData(context) {
  _damageReduction(context);
  _statusResistances(context);
  _resourceBarsPercentages(context);
  _oneliners(context);
  _attributes(context);
  _size(context);
}

export function prepareCharacterData(context) {
  _skills(context);
  _trades(context);
  _languages(context);
}

export function prepareNpcData(context) {
  _allSkills(context);
  _languages(context);
}

export function prepareStorageData(context) {
  context.isGM = game.user.isGM;
  context.gridTemplate = _getGridTemplate(context.system.storageType);
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

function _getGridTemplate(type) {
  const isGM = game.user.isGM;
  if (type === "vendor" && isGM) return "1fr 100px 50px 50px";
  if (type === "vendor" && !isGM) return "1fr 100px 50px";
  if (type === "partyInventory" && !isGM) return "1fr 50px";
  if (type === "partyInventory" && isGM) return "1fr 50px 50px";
  if (type === "randomLootTable" && isGM) return "1fr 50px 50px 50px";
  if (type === "randomLootTable" && !isGM) return "1fr 50px";
  return "1fr 50px";
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

function _statusResistances(context) {
  const statusResistances = context.system.statusResistances;
  for (const [key, status] of Object.entries(statusResistances)) {
    status.notEmpty = false;
    if (status.immunity) status.notEmpty = true;
    if (status.resistance) status.notEmpty = true;
    if (status.vulnerability) status.notEmpty = true;
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

  if (!resources.stamina) return;
  const staminaCurrent = resources.stamina.value;
  const staminaMax = resources.stamina.max;
  const staminaPercent = Math.ceil(100 * staminaCurrent/staminaMax);
  if (isNaN(staminaPercent)) resources.stamina.percent = 0;
  else resources.stamina.percent = staminaPercent <= 100 ? staminaPercent : 100;

  if (!resources.grit) return;
  const gritCurrent = resources.grit.value;
  const gritMax = resources.grit.max;
  const gritPercent = Math.ceil(100 * gritCurrent/gritMax);
  if (isNaN(gritPercent)) resources.grit.percent = 0;
  else resources.grit.percent = gritPercent <= 100 ? gritPercent : 100;
}

function _oneliners(context) {
  const oneliners = {
    damageReduction: {},
    statusResistances: {}
  }

  const dmgRed = Object.entries(context.system.damageReduction.damageTypes)
                    .map(([key, reduction]) => [key, _prepReductionOneliner(reduction)])
                    .filter(([key, oneliner]) => oneliner)

  const statusResistances = Object.entries(context.system.statusResistances)
                      .map(([key, condition]) => [key, _prepConditionsOneliners(condition)])
                      .filter(([key, oneliner]) => oneliner)

  oneliners.damageReduction = Object.fromEntries(dmgRed);
  oneliners.statusResistances = Object.fromEntries(statusResistances);
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
                  ? getLabelFromKey("large", CONFIG.DC20RPG.DROPDOWN_DATA.sizes)
                  : getLabelFromKey(context.system.size.size, CONFIG.DC20RPG.DROPDOWN_DATA.sizes)
  context.system.size.label = label;
}

function _allSkills(context) {
  const skills = Object.entries(context.system.skills)
                  .map(([key, skill]) => {
                    const skl = _prepSkillMastery(skill);
                    if (key === "awa") skl.shouldShow = true
                    return [key, skl]
                  });
  context.skills = {
    allSkills: Object.fromEntries(skills)
  }
}

function _skills(context) {
  const skills = Object.entries(context.system.skills)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills = {
    skills: Object.fromEntries(skills)
  }
}

function _trades(context) {
  const trades = Object.entries(context.system.trades)
                  .map(([key, skill]) => [key, _prepSkillMastery(skill)]);
  context.skills.trades = Object.fromEntries(trades);
}

function _languages(context) {
  const languages = Object.entries(context.system.languages)
                  .map(([key, skill]) => [key, _prepLangMastery(skill)]);
  context.skills.languages = Object.fromEntries(languages);
}

function _prepSkillMastery(skill) {
  let mastery = foundry.utils.deepClone(skill.mastery);
  
  skill.short = CONFIG.DC20RPG.SYSTEM_CONSTANTS.skillMasteryShort[mastery];
  skill.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.skillMasteryLabel[mastery];
  skill.shouldShow = mastery > 0;
  return skill;
}

function _prepLangMastery(lang) {
  const mastery = lang.mastery;
  lang.short = CONFIG.DC20RPG.SYSTEM_CONSTANTS.languageMasteryShort[mastery];
  lang.masteryLabel = CONFIG.DC20RPG.SYSTEM_CONSTANTS.languageMasteryLabel[mastery];
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
  const resistance = condition.resistance || 0;
  const vulnerability = condition.vulnerability || 0;
  const finalLevel = resistance - vulnerability;

  if (finalLevel > 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.condImm.resistanceX");
    typeLabel = typeLabel.replace("X", Math.abs(finalLevel));
    return `${condition.label} ${typeLabel}`;
  }
  if (finalLevel < 0) {
    let typeLabel = game.i18n.localize("dc20rpg.sheet.condImm.vulnerabilityX");
    typeLabel = typeLabel.replace("X", Math.abs(finalLevel));
    return `${condition.label} ${typeLabel}`;
  }
  return ""
}