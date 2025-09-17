import { enrichRollMenuObject } from "../../dataModel/fields/rollMenu.mjs";
import { evaluateFormula } from "../../helpers/rolls.mjs";
import { generateKey, getValueFromPath } from "../../helpers/utils.mjs";
import { SkillConfiguration } from "../../settings/skillConfig.mjs";

export function enrichWithHelpers(actor) {
  enrichRollMenuObject(actor);
  _enrichResourcesObject(actor);
  _enrichAttributesObject(actor);
  _enrichSkillsObject(actor);
}

//==================================//==================================
//                              RESOURCES                              =
//==================================//==================================
function _enrichResourcesObject(actor) {
  actor.resources = {};
  const keys = Object.keys(actor.system.resources);
  for (const key of keys) {
    switch (key) {
      case "custom": _enhanceCustomResources(actor); break;
      default: _enhanceResource(key, actor); break;
    }
  }

  actor.resources.createCustomResource = async (data, key) => await _createCustomResource(data, key, actor);
  actor.resources.removeCustomResource = async (key) => await _removeCustomResource(key, actor);
  actor.resources.hasResource = (key) => !!actor.resources[key];
  actor.resources.iterate = () => _iterateOverResources(actor);
}

//==================================
//    RESOURCE SPECIFIC METHODS    =
//==================================
function _enhanceResource(resourceKey, actor) {
  const original = getValueFromPath(actor, `system.resources.${resourceKey}`);
  const enhanced = foundry.utils.deepClone(original);

  enhanced.isCustom = resourceKey.includes("custom.");
  enhanced.key = enhanced.isCustom ? resourceKey.substr(7) : resourceKey;
  enhanced.fullKey = resourceKey;

  enhanced.regain = async (amount) => await _regainResource(amount, enhanced, actor);
  enhanced.canSpend = (amount) => _canSpendResource(amount, enhanced, actor);
  enhanced.spend = async (amount, allowNegatives) => await _spendResource(amount, enhanced, actor, allowNegatives);
  enhanced.checkAndSpend = (amount) => {
    if (enhanced.canSpend(amount)) {
      enhanced.spend(amount);
      return true;
    }
    return false;
  };

  actor.resources[enhanced.key] = enhanced;
}

function _enhanceCustomResources(actor) {
  const keys = Object.keys(actor.system.resources.custom);
  for (const key of keys) {
    const fullKey = `custom.${key}`;
    _enhanceResource(fullKey, actor, "value");

    actor.resources[key].changeIcon = () => {
      new FilePicker({
        type: "image",
        displayMode: "tiles",
        callback: (path) => {
          if (!path) return;
          actor.update({[`system.resources.${fullKey}.img`]: path});
        }
      }).render();
    }
  }
}

async function _regainResource(amount, resource, actor) {
  if (amount === "formula") amount = await _fromRegenerationFormula(resource, actor);
  if (amount === "max") amount = resource.max;
  if (amount === "half") amount = Math.ceil(resource.max/2);
  amount = parseInt(amount);
  if (amount <= 0) return;

  if (!resource.isCustom) actor = actor.companionShareFor(resource.key); // Key or full key? not important for now as we can only share health
  
  const current = resource.value;
  const max = resource.max;
  const newAmount = Math.min(current + amount, max);
  await actor.update({[`system.resources.${resource.fullKey}.value`] : newAmount});
}

async function _fromRegenerationFormula(resource, actor) {
  const formula = resource.regenerationFormula;
  if (!formula) return resource.max;
  const rollData = await actor.getRollData();
  const roll = await evaluateFormula(formula, rollData, true);
  return roll.total;
}

async function _spendResource(amount, resource, actor, allowNegatives=false) {
  if (!amount) return;
  amount = parseInt(amount);
  if (amount === 0) return;

  if (!resource.isCustom) actor = actor.companionShareFor(resource.key);
  
  const current = resource.value;
  let newAmount = current - amount;
  if (!allowNegatives) newAmount = Math.max(newAmount, 0);
  await actor.update({[`system.resources.${resource.fullKey}.value`] : newAmount});
}

function _canSpendResource(amount, resource, actor) {
  if (!amount) return true;
  amount = parseInt(amount);
  if (amount <= 0) return true;

  if (!resource.isCustom) actor = actor.companionShareFor(resource.key);

  const current = resource.value;
  const newAmount = current - amount;
  if (newAmount < 0) {
    ui.notifications.error(`Cannot subract ${amount} ${resource.label} from ${actor.name}. Not enough ${resource.label} (Current amount: ${current}).`);
    return false;
  }

  // Resource spend limit - TODO in the future
  if (resource.key === "ap") {
    const spendLimit = actor.system.globalModifier.prevent.goUnderAP;
    if (newAmount < spendLimit) {
      if (spendLimit >= resource.max) ui.notifications.error(`You cannot spend AP`);
      else ui.notifications.error(`You cannot go under ${spendLimit} AP`);
      return false;
    }
  }
  return true;
}

//==================================
//    RESOURCES UTILS COLLECTION   =
//==================================
async function _createCustomResource(data={}, key, actor) {
  const resourceKey = key || generateKey();
  // TODO: should we scan all keys active on actor and forbid all
  const forbidenKeys = ["ap", "mana", "stamina", "grit", "restPoints", "health"]; 
  if (forbidenKeys.includes(key)) {
    ui.notifications.warn(`Forbidden resource key: '${key}', use different one!`);
    return;
  }

  const newResource = {
    label: "New Resource",
    img: "icons/svg/item-bag.svg",
    value: 0,
    maxFormula: null,
    max: 0,
    reset: "",
    ...data
  }
  await actor.update({[`system.resources.custom.${resourceKey}`] : newResource});
}

async function _removeCustomResource(key, actor) {
  await actor.update({[`system.resources.custom.-=${key}`]: null });
}

function _iterateOverResources(actor) {
  return Object.values(actor.resources).filter(res => res.key);
}

//==================================//==================================
//                              ATTRIBUTES                             =
//==================================//==================================
function _enrichAttributesObject(actor) {
  actor.attributes = {};

  for (const [key, original] of Object.entries(actor.system.attributes)) {
    const attribute = foundry.utils.deepClone(original);
    attribute.key = key;

    attribute.rollCheck = async (options, details) => await actor.rollPopup(key, "check", options, details);
    attribute.rollSave = async (options, details) => await actor.rollPopup(key, "save", options, details);
    
    attribute.increase = async () => await _increaseAttribute(key, actor);
    attribute.decrease = async () => await _decreaseAttribute(key, actor);
    
    actor.attributes[key] = attribute;
  }
}

async function _increaseAttribute(key, actor) {
  const level = actor.system.details.level;
  const upperLimit = 3 + Math.floor(level/5);
  const value = actor.system.attributes[key].current;
  const newValue = Math.min(upperLimit, value + 1);
	await actor.update({[`system.attributes.${key}.current`]: newValue});
}

async function _decreaseAttribute(key, actor) {
  const value = actor.system.attributes[key].current;
  const newValue = Math.max(-2, value - 1);
	await actor.update({[`system.attributes.${key}.current`]: newValue});
}

//==================================//==================================
//                          SKILLS AND LANGUAGES                       =
//==================================//==================================
function _enrichSkillsObject(actor) {
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

  skill.rollCheck = async (options, details) => await actor.rollPopup(skill.key, "check", options, details);
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
 
    language.rollCheck = async (options, details) => await _onLanguageCheck(key, options, details, actor);
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
  return await actor.rollPopup("language", "check", {rollTitle: rollTitle, customLabel: customLabel, ...options}, details);
}