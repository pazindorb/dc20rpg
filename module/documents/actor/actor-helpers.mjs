import { enrichRollMenuObject } from "../../dataModel/fields/rollMenu.mjs";
import { companionShare } from "../../helpers/actors/companion.mjs";
import { evaluateFormula } from "../../helpers/rolls.mjs";
import { generateKey, getValueFromPath } from "../../helpers/utils.mjs";
import { SkillConfiguration } from "../../settings/skillConfig.mjs";

export function enrichWithHelpers(actor) {
  enrichRollMenuObject(actor);
  _enrichMultipleCheckPenaltyObject(actor);
  _enrichResourcesObject(actor);
  _enrichAttributesObject(actor);
  _enrichSkillsObject(actor);
  if (actor.system.equipmentSlots) {
    _enrichEquipmentSlots(actor);
  }
  _enrichSpecialActions(actor);
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

    attribute.rollCheck = async (options, details) => await actor.roll(key, "check", options, details);
    attribute.rollSave = async (options, details) => await actor.roll(key, "save", options, details);
    
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

  skill.rollCheck = async (options, details) => await actor.roll(skill.key, "check", options, details);
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
  return await actor.roll("language", "check", {rollTitle: rollTitle, customLabel: customLabel, ...options}, details);
}

//==================================//==================================
//                            EQUIPMENT SLOTS                          =
//==================================//==================================
function _enrichEquipmentSlots(actor) {
  const equipmentSlots = {};

  for (const [category, slots] of Object.entries(actor.system.equipmentSlots)) {
    equipmentSlots[category] = {
      addSlot: async (key=generateKey(), data={}) => await _addNewSlot(category, data, key, actor),
      freeSlot: () => _getFreeSlot(category, actor),
      slots: {}
    };
    
    for (const [key, original] of Object.entries(slots)) {
      const slot = foundry.utils.deepClone(original);
      slot.category = category;
      slot.key = key;

      _enrichSlot(actor, slot);
      equipmentSlots[category].slots[key] = slot;
    }
  }

  actor.equipmentSlots = equipmentSlots;
}

//==================================
//     CATEGORY SPECIFIC METHODS   =
//==================================
async function _addNewSlot(category, data, key, actor) {
  await actor.update({[`system.equipmentSlots.${category}.${key}`]: {
    slotName: data.name || _defaultNamePerCategory(category),
    slotIcon: data.icon || _defaultIconPerCategory(category)
  }});
}

function _defaultNamePerCategory(category) {
  switch (category) {
    case "weapon":    return "dc20rpg.sheet.equipmentSlot.weapon";
    case "head":      return "dc20rpg.sheet.equipmentSlot.head";
    case "neck":      return "dc20rpg.sheet.equipmentSlot.neck";
    case "mantle":    return "dc20rpg.sheet.equipmentSlot.mantle";
    case "body":      return "dc20rpg.sheet.equipmentSlot.body";
    case "waist":     return "dc20rpg.sheet.equipmentSlot.waist";
    case "hand":      return "dc20rpg.sheet.equipmentSlot.hand";
    case "ring":      return "dc20rpg.sheet.equipmentSlot.ring";
    case "feet":      return "dc20rpg.sheet.equipmentSlot.feet";
    case "trinket":   return "dc20rpg.sheet.equipmentSlot.trinket";
    default:          return "dc20rpg.sheet.equipmentSlot.eq";
  }
}

function _defaultIconPerCategory(category) {
  switch (category) {
    case "weapon":    return "icons/weapons/swords/sword-simple-white.webp";
    case "head":      return "icons/equipment/head/helm-barbute-white.webp";
    case "neck":      return "icons/equipment/neck/choker-simple-bone-fangs.webp";
    case "mantle":    return "icons/equipment/back/mantle-collared-white.webp";
    case "body":      return "icons/equipment/chest/breastplate-leather-brown-belted.webp";
    case "waist":     return "icons/equipment/waist/belt-buckle-horned.webp";
    case "hand":      return "icons/magic/perception/hand-eye-black.webp";
    case "ring":      return "icons/equipment/finger/ring-faceted-white.webp";
    case "feet":      return "icons/equipment/feet/boots-galosh-white.webp";
    case "trinket":   return "icons/tools/instruments/horn-white-gray.webp";
    default:          return "icons/weapons/bows/shortbow-white.webp";
  }
}

function _getFreeSlot(category, actor) {
  const categorySlots = Object.values(actor.equipmentSlots[category].slots);
  for (const slot of categorySlots) {
    if (!slot.isEquipped) return slot;
  }
  return categorySlots[0];
}

//==================================
//      SLOT SPECIFIC METHODS      =
//==================================
function _enrichSlot(actor, slot) {
  slot.isEquipped = !!slot.itemId;
  slot.equip = async (item) => await _equipSlot(item, slot, actor);
  slot.unequip = async () => await _unequipSlot(slot, actor);
  slot.delete = async () => await _deleteSlot(slot, actor);
}

async function _equipSlot(item, slot, actor) {
  if (slot.isEquipped) await _unequipSlot(slot, actor);
  if (item.equipped) await item.equip({forceUneqip: true});

  // Cumbersome: It takes 1 AP to draw, stow, or pick up this Weapon.
  if (item.system.properties?.cumbersome?.active) {
    if (!actor.resources.ap.checkAndSpend(1)) return;
  }

  const path = `system.equipmentSlots.${slot.category}.${slot.key}`;
  await actor.update({
    [`${path}.itemId`]: item.id,
    [`${path}.itemName`]: item.name,
    [`${path}.itemImg`]: item.img,
  });
  await item.update({
    ["system.statuses.equipped"]: true,
    ["system.statuses.slotLink.category"]: slot.category,
    ["system.statuses.slotLink.key"]: slot.key
  });
}

async function _unequipSlot(slot, actor) {
  const item = actor.items.get(slot.itemId);
  if (!item) return;

  // Cumbersome: It takes 1 AP to draw, stow, or pick up this Weapon.
  if (item.system.properties?.cumbersome?.active) {
    if (!actor.resources.ap.checkAndSpend(1)) return;
  }
  // Reload: Weapon gets unloaded when you take it of
  if (item.system.properties?.reload?.active) {
    await item.reloadable.unload();
  }

  const path = `system.equipmentSlots.${slot.category}.${slot.key}`;
  await actor.update({
    [`${path}.-=itemId`]: null,
    [`${path}.-=itemName`]: null,
    [`${path}.-=itemImg`]: null,
  });
  await item.update({
    ["system.statuses.equipped"]: false,
    ["system.statuses.slotLink.category"]: "",
    ["system.statuses.slotLink.key"]: ""
  });
}

async function _deleteSlot(slot, actor) {
  if (slot.isEquipped) await _unequipSlot(slot, actor);
  await actor.update({[`system.equipmentSlots.${slot.category}.-=${slot.key}`]: null});
}

//==================================//==================================
//                    MULTIPLE CHECK/HELP PENALTY                      =
//==================================//==================================
function _enrichMultipleCheckPenaltyObject(actor) {
  actor.mcp = {
    apply: async (checkKey) => await _applyMCP(checkKey, actor),
    clear: async () => await _clearMCP(actor),
    getValueFor: (checkKey) => _mcpValue(checkKey, actor)
  };
}

async function _applyMCP(checkKey, actor) {
  if (!checkKey) return;
  if (companionShare(actor, "mcp")) {
    return actor.companionOwner.mcp.apply(checkKey);
  }

  if (actor.myTurnActive || checkKey === "help") {
    const mcp = actor.system.mcp;
    mcp.push(checkKey);
    await actor.update({["system.mcp"]: mcp});
  }
}

async function _clearMCP(actor) {
  if (actor.flags.dc20rpg.actionHeld?.isHeld) {
    let mcp = actor.system.mcp;
    if (companionShare(actor, "mcp")) mcp = actor.companionOwner.system.mcp;
    await actor.update({["flags.dc20rpg.actionHeld.mcp"]: mcp});
  }
  await actor.update({["system.mcp"]: []});
}

function _mcpValue(checkKey, actor) {
  if (!checkKey) return 0;

  if (companionShare(actor, "mcp")) {
    return actor.companionOwner.mcp.getValueFor(checkKey);
  }

  const mcp = actor.system.mcp;
  return mcp.filter(penalty => penalty === checkKey).length;
}

//==================================//==================================
//                           SPECIAL ACTIONS                           =
//==================================//==================================
export function _enrichSpecialActions(actor) {
  actor.help = {
    active: _activeHelp(actor),
    prepare: async (options) => await _prepareHelp(actor, options),
    clear: async (key, duration) => await _clearHelp(actor, key, duration)
  }
}

//==================================
//           HELP ACTION           =
//==================================
async function _prepareHelp(actor, options={}) {
  const activeDice = actor.system.help.active; 
  let maxDice = actor.system.help.maxDice;

  if (options.diceValue) {
    maxDice = options.diceValue;
  }
  else if (actor.inCombat && !options.ignoreMHP) {
    const reduction = actor.mcp.getValueFor("help") * 2;
    maxDice = Math.max(maxDice - reduction, 4);
    actor.mcp.apply("help");
  }
  const subtract = options.subtract ? "-" : "";
  activeDice[generateKey()] = {
    value: `${subtract}d${maxDice}`,
    duration: options.duration || "round"
  }
  await actor.update({["system.help.active"]: activeDice});
}

async function _clearHelp(actor, key, duration="round") {
  if (key) {
    await actor.update({[`system.help.active.-=${key}`]: null});
  }
  else {
    for (const [key, help] of Object.entries(actor.system.help.active)) {
      if (help.duration === duration) await actor.update({[`system.help.active.-=${key}`]: null})
    }
  }
}

function _activeHelp(actor) {
  const dice = {};
  for (const [key, help] of Object.entries(actor.system.help.active)) {
    let icon = "fa-dice";
    switch (help.value) {
      case "d20": case "-d20": icon = "fa-dice-d20"; break;
      case "d12": case "-d12": icon = "fa-dice-d12"; break; 
      case "d10": case "-d10": icon = "fa-dice-d10"; break; 
      case "d8": case "-d8": icon = "fa-dice-d8"; break; 
      case "d6": case "-d6": icon = "fa-dice-d6"; break; 
      case "d4": case "-d4": icon = "fa-dice-d4"; break; 
    }
    dice[key] = {
      formula: help.value,
      icon: icon,
      subtraction: help.value.includes("-"),
      duration: help.duration,
      tooltip: _helpDiceTooltip(help)
    }
  }
  return dice;
}

function _helpDiceTooltip(help) {
  const header = `${game.i18n.localize("dc20rpg.sheet.help.helpDice")} (${help.value})`
  const duration = `${game.i18n.localize("dc20rpg.sheet.help.duration")}: ${game.i18n.localize(`dc20rpg.help.${help.duration}`)}`;
  const icon = "<i class='fa-solid fa-stopwatch margin-right'></i>";
  return `<h4 class='margin-top-5'>${header}</h4> <div class='middle-section'><p>${icon} ${duration}</p></div><hr/>${game.i18n.localize("dc20rpg.sheet.help.dropOnChat")}`;
} 

//===================================
//            MOVE ACTION           =
//===================================


//===================================
//            HELD ACTION           =
//===================================