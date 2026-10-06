import { getLabelFromKey } from "../../helpers/utils.mjs";

export function duplicateData(context, actor) {
  context.config = CONFIG.DC20RPG;
  context.type = actor.type;
  context.system = foundry.utils.deepClone(actor.system);
  context.flags = foundry.utils.deepClone(actor.flags);
  context.expandedSidebar = !game.user.getFlag("dc20rpg", "sheet.character.sidebarCollapsed");
  context.help = _help(actor);
  context.items = actor.items.contents;
  context.name = actor.name;
  context.img = actor.img;
}

function _help(actor) {
  return {
    dice: actor.help.active,
    rowSize: 5
  }
}

export function prepareCommonData(context) {
  _damageReduction(context);
  _statusResistances(context);
  _resourceBarsPercentages(context);
  _attributes(context);
  _size(context);
}

export function prepareCharacterData(context) {
  _skills(context);
  _trades(context);
  _languages(context);
}

export function prepareNpcData(context) {
  _oneliners(context);
}

export function prepareStorageData(context) {
  context.canUserModify = context.document.canUserModify(game.user, "update");
  context.isGM = game.user.isGM;
  context.gridTemplate = _getGridTemplate(context.system.storageType);

  if (context.system.storageType === "randomLootTable") {
    const items = context.items.values().toArray().sort((a, b) => {
      return a.system.lootRoll - b.system.lootRoll
    })

    let lowerLimit = 1; 
    for (const item of items) {
      const upperLimit = item.system.lootRoll;
      if (lowerLimit > upperLimit) {
        item.lowerLimit = upperLimit;
      }
      else {
        item.lowerLimit = lowerLimit;
        lowerLimit = upperLimit + 1;
      }
    }
  }
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
  if (type === "randomLootTable" && isGM) return "1fr 75px 50px 50px";
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
    skills: {header: "dc20rpg.sheet.oneliner.skills", content: []},
    movement: {header: "dc20rpg.sheet.oneliner.movement", content: []},
    senses: {header: "dc20rpg.sheet.oneliner.senses", content: []},
    reduction: {header: "dc20rpg.sheet.oneliner.reduction", content: []},
    resistance: {header: "dc20rpg.sheet.oneliner.resistance", content: []},
    immune: {header: "dc20rpg.sheet.oneliner.immune", content: []},
    vulnerability: {header: "dc20rpg.sheet.oneliner.vulnerability", content: []},
    languages: {header: "dc20rpg.sheet.oneliner.languages", content: []},
  }

  _prepareSkillOnelinters(context.system.skills, oneliners);
  _prepareMovementOneliners(context.system.movement, context.system.jump, oneliners);
  _prepareSensesOneliners(context.system.senses, oneliners);
  _prepareDROneliners(context.system.damageReduction, oneliners);
  _prepareStatusOneliners(context.system.statusResistances, oneliners);
  _prepareLangOneliners(context.system.languages, oneliners);

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
  context.system.size.label = getLabelFromKey(context.system.size.size, CONFIG.DC20RPG.DROPDOWN_DATA.sizes)
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

function _prepareSkillOnelinters(skills, oneliners) {
  for (const [key, skill] of Object.entries(skills)) {
    let shouldShow = key === "awa" || skill.mastery > 0;
    if (!shouldShow) continue;

    oneliners.skills.content.push({
      oneliner: `${skill.label} (${skill.modifier})`, 
      icon: "fa-solid fa-square fa-2xs",
      data: `data-action="roll" data-type="check" data-key="${key}"`  
    })
  }
}

function _prepareLangOneliners(languages, oneliners) {
  for (const [key, lang] of Object.entries(languages)) {
    if (lang.mastery == 0) continue;

    let oneliner = lang.label;
    if (lang.mastery == 1) oneliner += " (Limited)"
    oneliners.languages.content.push({
      oneliner: oneliner, 
      icon: "fa-solid fa-square fa-2xs",
    })
  }
}

function _prepareMovementOneliners(movements, jump, oneliners) {
  oneliners.movement.content.push({oneliner: `${game.i18n.localize("dc20rpg.speed.jump")} (${jump.current})`, icon: "fa-solid fa-square fa-2xs"})

  for (const [key, movement] of Object.entries(movements)) {
    if (movement.current > 0 || key === "ground") {
      const label = `${movement.label} (${movement.current})`;
      oneliners.movement.content.push({oneliner: label, icon: "fa-solid fa-square fa-2xs"})
    }
  }
}

function _prepareSensesOneliners(senses, oneliners) {
  for (const [key, sense] of Object.entries(senses)) {
    if (sense.range > 0) {
      const label = `${sense.label} (${sense.range})`;
      oneliners.senses.content.push({oneliner: label, icon: "fa-solid fa-square fa-2xs"})
    }
  }
}

function _prepareDROneliners(damageReduction, oneliners) {
  // Resistances
  for (const [key, reduction] of Object.entries(damageReduction.damageTypes)) {
    const img = `systems/dc20rpg/images/sheet/resistances/${key}.svg`;
    if (reduction.immune) {
      oneliners.immune.content.push({oneliner: reduction.label, img: img});
      continue;
    }

    const reductionX = reduction.resist - reduction.vulnerable;
    if (reductionX > 0) {
      oneliners.resistance.content.push({oneliner: `${reduction.label} (${reductionX})`, img: img});
    }
    if (reductionX < 0) {
      oneliners.vulnerability.content.push({oneliner: `${reduction.label} (${Math.abs(reductionX)})`, img: img});
    }

    if (reduction.resistance && !reduction.vulnerability) {
      oneliners.resistance.content.push({oneliner: `${reduction.label} (${game.i18n.localize("dc20rpg.sheet.oneliner.half")})`, img: img});
    }    
    if (reduction.vulnerability && !reduction.resistance) {
      oneliners.resistance.content.push({oneliner: `${reduction.label} (${game.i18n.localize("dc20rpg.sheet.oneliner.double")})`, img: img});
    }
  }

  // Damage Reduction
  if (damageReduction.pdr.active) {
    oneliners.reduction.content.push({oneliner: game.i18n.localize("dc20rpg.properties.pdr"), icon: "fa-solid fa-square fa-2xs"});
  }
  if (damageReduction.edr.active) {
    oneliners.reduction.content.push({oneliner: game.i18n.localize("dc20rpg.properties.edr"), icon: "fa-solid fa-square fa-2xs"});
  }
  if (damageReduction.mdr.active) {
    oneliners.reduction.content.push({oneliner: game.i18n.localize("dc20rpg.properties.mdr"), icon: "fa-solid fa-square fa-2xs"});
  }
}

function _prepareStatusOneliners(statusResistances, oneliners) {
  for (const [key, status] of Object.entries(statusResistances)) {
    const img = `systems/dc20rpg/images/statuses/${key}.svg`;
    if (status.immunity) {
      oneliners.immune.content.push({oneliner: status.label, img: img, style: "background: #636363;"});
      continue;
    }

    const resistanceX = status.resistance - status.vulnerability;
    if (resistanceX > 0) {
      oneliners.resistance.content.push({oneliner: `${status.label} (${resistanceX})`, img: img, style: "background: #636363;"});
    }
    if (resistanceX < 0) {
      oneliners.vulnerability.content.push({oneliner: `${status.label} (${Math.abs(resistanceX)})`, img: img, style: "background: #636363;"});
    }
  }
}