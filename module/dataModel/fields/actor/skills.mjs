import { generateKey } from "../../../helpers/utils.mjs";
import { SkillConfiguration } from "../../../settings/skillConfig.mjs";

export default class SkillFields {
  constructor(type) {
    const f = foundry.data.fields;
    const skillStore = game.settings.get("dc20rpg", "skillStore");

    switch(type) {
      case "skill": return new f.ObjectField({required: true, initial: skillStore.skills})
      case "trade": return new f.ObjectField({required: true, initial: skillStore.trades})
      case "language": return new f.ObjectField({required: true, initial: skillStore.languages})
    }
  }
}

export function enhanceSkillsObject(actor) {
  actor.skillAndLanguage = {};

  actor.skillAndLanguage.refreshAll = async () => await _refreshAll(actor);
  actor.skillAndLanguage.addCustom = async (type) => await _addCustom(type, actor);
  actor.skillAndLanguage.removeCustom = async (key, type) => await _removeCustom(key, type, actor);
  actor.skillAndLanguage.convertPoints = async (from, to, opperation, rate) => await _convertPoints(from, to, opperation, rate, actor);

  _enhanceSkills(actor);
  _enhanceLanguages(actor);
}

//==================================
//      SKILL UTILS COLLECTION     =
//==================================
async function _refreshAll(actor) {
  const skillStore = game.settings.get("dc20rpg", "skillStore");
  const skills = actor.system.skills;
  const trades = actor.system.trades;
  const languages = actor.system.languages;

  const updateData = {
    skills: {},
    languages: {},
    trades: {}
  }

  // Remove
  Object.keys(skills).filter(key => !skillStore.skills[key] && !skills[key].custom).forEach(key => updateData.skills[`-=${key}`] = null);
  Object.keys(languages).filter(key => !skillStore.languages[key] && !languages[key].custom).forEach(key => updateData.languages[`-=${key}`] = null);
  if (trades) Object.keys(trades).filter(key => !skillStore.trades[key] && !trades[key].custom).forEach(key => updateData.trades[`-=${key}`] = null);

  // Add or Modify
  Object.keys(skillStore.skills).forEach(key => {
    if (!skills[key]) updateData.skills[key] = skillStore.skills[key];
    else {
      const store = skillStore.skills[key];
      updateData.skills[key] = {
        label: store.label,
        baseAttribute: store.baseAttribute,
        attributes: store.attributes
      }
    }
  });
  Object.keys(skillStore.skills).forEach(key => {
    if (!languages[key]) updateData.languages[key] = skillStore.languages[key];
    else {
      const store = skillStore.trades[key];
      updateData.trades[key] = {  
        label: store.label,
        category: store.category
      }
    }
  });
  if (trades) {
    Object.keys(skillStore.trades).forEach(key => {
      if (!trades[key]) updateData.trades[key] = skillStore.trades[key];
      else {
        const store = skillStore.trades[key];
        updateData.trades[key] = {
          label: store.label,
          baseAttribute: store.baseAttribute,
          attributes: store.attributes
        }
      }
    });
  }

  // Update actor
  await actor.update({["system"]: updateData});
}

async function _addCustom(type, actor) {
  const key = generateKey();
  const object = type === "languages" ? SkillConfiguration.lang("mortal", "New Language") : SkillConfiguration.skill("int", "New Skill");
  object.custom = true;
  actor.update({[`system.${type}.${key}`]: object});
}

async function _removeCustom(key, type, actor) {
  actor.update({[`system.${type}.-=${key}`]: null});
}

async function _convertPoints(from, to, opertaion, rate, actor) {
  const skillFrom = actor.system.skillPoints[from];
  const skillTo = actor.system.skillPoints[to];
  
  if (opertaion === "convert") {
    const updateData = {
      [`system.skillPoints.${from}.converted`]: skillFrom.converted + 1,
      [`system.skillPoints.${to}.extra`]: skillTo.extra + parseInt(rate)
    }
    await actor.update(updateData);
  }
  if (opertaion === "revert") {
    const newExtra = skillFrom.extra - parseInt(rate);
    if (newExtra < 0) {
      ui.notifications.error("Cannot revert more points!");
      return;
    }
    const updateData = {
      [`system.skillPoints.${from}.extra`]: newExtra,
      [`system.skillPoints.${to}.converted`]: skillTo.converted - 1 
    }
    await actor.update(updateData);
  }
}

//==================================
//      SKILL SPECIFIC METHODS     =
//==================================
function _enhanceSkills(actor) {
  actor.skillAndLanguage.skills = {};
  for (const [key, skill] of Object.entries(actor.system.skills)) {
    _enhanceSkill(skill, key, "skills", actor);
  }

  if (!actor.system.trades) return;
  actor.skillAndLanguage.trades = {};
  for (const [key, skill] of Object.entries(actor.system.trades)) {
    _enhanceSkill(skill, key, "trades", actor);
  }
}

function _enhanceSkill(original, key, type, actor) {
  const skill = foundry.utils.deepClone(original);
  skill.key = key;
  skill.type = type;

  skill.promptCheck = async (options, details) => await actor.promptRoll(skill.key, "check", options, details);
  skill.masteryUp = async () => await _toggleSkillMastery(skill, true, actor);
  skill.masteryDown = async () => await _toggleSkillMastery(skill, false, actor);
  skill.expertiseToggle = async () => await _toggleExpertise(skill, actor);

  if (skill.custom) skill.delete = async () => await _removeCustom(key, type, actor);

  actor.skillAndLanguage[type][key] = skill;
}

async function _toggleSkillMastery(skill, up, actor) {
  let limit = skill.masteryLimit;
  let value = skill.mastery;
  // Real value and mastery limit is 1 less because we increase that value with expertise during calculation process
  if (skill.expertiseIncrease) {
    value--;
    limit--;
  }
  await actor.update({[`system.${skill.type}.${skill.key}.mastery`] : _masterySwitch(value, up, limit)});
}

async function _toggleExpertise(skill, actor) {
  const manual = new Set(actor.system.expertise.manual);
  const automated = new Set(actor.system.expertise.automated);

  if (manual.has(skill.key)) {
    if (skill.masteryLimit === skill.mastery) await skill.masteryDown();
    manual.delete(skill.key);
  }
  else if (automated.has(skill.key)) {
    ui.notifications.warn("You already have expertise in that skill!");
    return;
  }
  else {
    manual.add(skill.key);
  }
  await actor.update({["system.expertise.manual"]: manual});
}

//==================================
//    LANGUAGE SPECIFIC METHODS    =
//==================================
function _enhanceLanguages(actor) {
  actor.skillAndLanguage.languages = {};
  for (const [key, original] of Object.entries(actor.system.languages)) {
    const language = foundry.utils.deepClone(original);
    language.key = key;
 
    language.promptCheck = async (options, details) => await _onLanguageCheck(key, options, details, actor);
    language.masteryUp = async () => await _toggleLanguageMastery(language, true, actor);
    language.masteryDown = async () => await _toggleLanguageMastery(language, false, actor);

    actor.skillAndLanguage.languages[key] = language;
  }
}

async function _toggleLanguageMastery(language, up, actor) {
  await actor.update({[`system.languages.${language.key}.mastery`] : _masterySwitch(language.mastery, up, 2)});
}

function _masterySwitch(current, up, limit) {
  if (up) {
    const newValue = current + 1;
    return newValue > limit ? 0 : newValue;
  }
  else {
    const newValue = current - 1;
    return newValue < 0 ? limit : newValue;
  }
}

async function _onLanguageCheck(key, options, details, actor) {
  const rollTitle = `${CONFIG.DC20RPG.languages[key]} Check`;
  const customLabel = "Language Check";
  return await actor.promptRoll("language", "check", {rollTitle: rollTitle, customLabel: customLabel, ...options}, details);
}