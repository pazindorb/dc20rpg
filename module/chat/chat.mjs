import { rollFromSheet } from "../helpers/actors/rollsFromActor.mjs";
import { getSelectedTokens } from "../helpers/actors/tokens.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/events.mjs";
import { getLabelFromKey } from "../helpers/utils.mjs";

//===========================================
//         SENDING MESSAGES TO CHAT         =
//===========================================
/**
 * Creates chat message.
 * 
 * @param {DC20RpgActor} actor  - Speaker.
 * @param {Object} details      - Informations about labels, descriptions and other details.
 */
export function descriptionMessage(actor, details) {
  const templateSource = "systems/dc20rpg/templates/chat/description-chat-message.hbs";
  _createChatMessage(actor, details, templateSource, {});
}

/**
 * Creates chat message for given rolls.
 * 
 * @param {Object} rolls        - Separated in 3 categories: coreRolls (Array of Rolls), formulaRolls (Array of Rolls), winningRoll (Roll).
 * @param {DC20RpgActor} actor  - Speaker.
 * @param {Object} details      - Informations about labels, descriptions and other details.
 */
export function sendRollsToChat(rolls, actor, details) {
  const isCrit = rolls.winningRoll?.crit || false;
  const isCritFail = rolls.winningRoll?.fail || false;
  const targets = details.collectTargets ? _checkIfAttackHitsTargets(details.rollTotal, details.targetDefence, isCrit, isCritFail) : [];
  const templateData = {
    ...details,
    roll: rolls.winningRoll,
    rolls: rolls,
    winTotal: rolls.winningRoll?._total || 0,
    amountOfCoreRolls: rolls.core.length,
    targets: targets
  }
  const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
  _createChatMessage(actor, templateData, templateSource, rolls);
}

async function _createChatMessage(actor, data, templateSource, rolls) {
  const templateData = {
    ...data
  }
  const template = await renderTemplate(templateSource, templateData);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    content: template,
    rolls: _rollsObjectToArray(rolls),
    sound: CONFIG.sounds.dice,
  });
}

function _rollsObjectToArray(rolls) {
  const array = [];
  if (rolls.core) rolls.core.forEach(roll => array.push(roll));
  if (rolls.formula) {
    rolls.formula.forEach(roll => {
      array.push(roll.clear);
      array.push(roll.modified);
    });
  }
  return array;
}

function _checkIfAttackHitsTargets(rollTotal, defenceKey, isCrit, isCritFail) {
  const targets = [];
  game.user.targets.forEach(token => targets.push(_tokenToTarget(token, rollTotal, defenceKey, isCrit, isCritFail)));
  return targets;
}

function _tokenToTarget(token, rollTotal, defenceKey, critHit, critMiss) {
  const actor = token.actor;
  const target = {
    name: actor.name,
    img: actor.img
  };
  
  const defence = actor.system.defences[defenceKey].value;
  const hit = rollTotal - defence;
  if (hit < 0)                target.outcome = "Miss";
  if (hit >= 0 && hit < 5)    target.outcome = "Hit";
  if (hit >= 5 && hit < 10)   target.outcome = "Heavy Hit";
  if (hit >= 10 && hit < 15)  target.outcome = "Brutal Hit";
  if (hit >= 15)              target.outcome = "Brutal Hit(+)";

  // Determine Crit Miss 
  if (critMiss)               target.outcome = "Critical Miss";

  // Determine Crit Hit 
  if (critHit && hit < 5)     target.outcome = "Critical Hit";
  if (critHit && hit >= 5)    target.outcome = "Critical " + target.outcome;

  // Mark as Miss
  if (hit < 0 || critMiss)    target.miss = true;

  return target;
}

//================================================
//         CUSTOM CHAT MESSAGE LISTENERS         =
//================================================
export function initChatMessage(message, html, data) {
  // Registering listeners for chat log
  _addChatListeners(html);
  html.find('.formula-roll').first().before("<hr>");
}

function _addChatListeners(html) {
  // Show/Hide description
  html.find('.show-hide-description').click(event => {
    event.preventDefault();
    const description = event.target.closest(".chat-roll-card").querySelector(".chat-description");
    if(description) description.classList.toggle('hidden');
  });

  html.find('.toggle-formula-roll-type').click(event => {
    event.preventDefault();
    event.stopPropagation();
    const formulaId = event.currentTarget.dataset.formulaId;
    const wrapper = _parentWithClass(event.currentTarget, "same-formula-wrapper");
    wrapper.querySelectorAll(`[data-id="${formulaId}"]`).forEach(formula => formula.classList.toggle('hidden'));
  });
  html.find('.roll-save').click(event => _callOnTokens(event, "save"));
  html.find('.roll-check').click(event => _callOnTokens(event, "check"));
  html.find('.applicable').click(event => _callOnTokens(event, datasetOf(event).type));
}

function _parentWithClass(element, className) {
  let parent = element.parentNode;
  while (parent) {
    if (parent.classList.contains(className)) {
      return parent;
    }
    parent = parent.parentNode;
  }
  // If no parent with the specified class is found, return null
  return null;
}

//================================================
//              TOKEN MANIPULATIONS              =
//================================================
async function _callOnTokens(event, type) {
  event.preventDefault();
  event.stopPropagation();
  const dataset = event.currentTarget.dataset;
  const selectedTokens = await getSelectedTokens();
  if (selectedTokens.length === 0) return;

  selectedTokens.forEach(async (token) => {
    const actor = await token.actor;
    switch (type) {
      case "save": _rollSave(actor, dataset); break;
      case "check": _rollCheck(actor, dataset); break;
      case "dmg": _applyDamage(actor, dataset); break;
      case "heal": _applyHealing(actor, dataset); break;
    }
  })
}

function _rollSave(actor, dataset) {
  const key = dataset.key;
  let save = "";

  switch (key) {
    case "phy": 
      const migSave = actor.system.attributes.mig.save;
      const agiSave = actor.system.attributes.agi.save;
      save = migSave >= agiSave ? migSave : agiSave;
      break;
    
    case "men": 
      const intSave = actor.system.attributes.int.save;
      const chaSave = actor.system.attributes.cha.save;
      save = intSave >= chaSave ? intSave : chaSave;
      break;

    default:
      save = actor.system.attributes[key].save;
      break;
  }

  const details = {
    roll: `d20 + ${save}`,
    label: getLabelFromKey(key, DC20RPG.saveTypes) + " Save",
    type: "save",
    against: parseInt(dataset.dc)
  }
  rollFromSheet(actor, details);
}

function _rollCheck(actor, dataset) {
  const key = dataset.key;
  if (["phy", "men", "mig", "agi", "int", "cha"].includes(key)) {
    dataset.dc = dataset.against;      // For saves we want to roll against dynamic DC provided by contest 
    _rollSave(actor, dataset);
    return;
  }
  let modifier = "";
  let rollType = "";

  switch (key) {
    case "att":
      modifier = actor.system.attackMod.value.martial;
      rollType = "attackCheck";
      break;

    case "spe":
      modifier = actor.system.attackMod.value.spell;
      rollType = "spellCheck";
      break;

    case "mar": 
      const acrModifier = actor.system.skills.acr.modifier;
      const athModifier = actor.system.skills.ath.modifier;
      modifier = acrModifier >= athModifier ? acrModifier : athModifier;
      rollType = "skillCheck";
      break;

    default:
      modifier = actor.system.skills[key].modifier;
      rollType = "skillCheck";
      break;
  } 

  const details = {
    roll: `d20 + ${modifier}`,
    label: getLabelFromKey(key, DC20RPG.checks),
    type: rollType,
    against: parseInt(dataset.against)
  }
  rollFromSheet(actor, details);
}

function _applyHealing(actor, dataset) {
  const healAmount = parseInt(dataset.heal);
  const healType = dataset.healType;
  const health = actor.system.resources.health;
  let source = dataset.source;

  switch (healType) {
    case "heal": 
      const oldCurrent = health.current;
      let newCurrent = health.current + healAmount;

      if (health.max <= newCurrent) {
        source += ` -> (Overheal <b>${newCurrent - health.max}</b>)`;
        newCurrent = health.max;
      }
      actor.update({["system.resources.health.current"]: newCurrent});
      _createHealChatMessage(actor, newCurrent - oldCurrent, source);
      break;
    case "temporary":
      const oldTemp = health.temp || 0;
      const newTemp = oldTemp + healAmount;
      actor.update({["system.resources.health.temp"]: newTemp});
      _createTempHPChatMessage(actor, newTemp - oldTemp, source);
      break;
    case "max":
      const newMax = (health.tempMax ? health.tempMax : 0) + healAmount;
      actor.update({["system.resources.health.tempMax"]: newMax});
      break;
  }
}

function _applyDamage(actor, dataset) {
  const dmgType = dataset.dmgType;
  const defenceKey = dataset.defence;
  const isCritHit = dataset.crit === "true";
  const isCritMiss = dataset.miss === "true";
  const halfDmgOnMiss = dataset.halfOnMiss === "true";
  const health = actor.system.resources.health;
  const damageReduction = actor.system.damageReduction;

  let dmg = {
    value: parseInt(dataset.dmg),
    source: dataset.source
  }
  let halfDmg = false;

  // Flat Damage is always applied as flat value
  if (dmgType === "flat" || dmgType === "") {
    const newValue = health.value - dmg.value;
    actor.update({["system.resources.health.value"]: newValue});
    _createDamageChatMessage(actor, dmg.value, "Damage")
    return;
  }
 
  
  // Attack Check specific calculations
  if (defenceKey) {
    const rollTotal = dataset.total ? parseInt(dataset.total) : null;
    const modified = dataset.modified === "true";
    const defence = actor.system.defences[defenceKey].value;

    // Physical or Mystical damagee reduction or 
    const drKey = ["radiant", "umbral", "sonic", "psychic"].includes(dmgType) ? "mdr" : "pdr";
    // True dmg cannot be reduced
    const dr = dmgType === "true" ? 0 : damageReduction[drKey].value;
    
    // Check if Attack Missed and if it should be zero or only halved
    const hit = rollTotal - defence;
    if (!isCritHit && (hit < 0 || isCritMiss)) {
      if (halfDmgOnMiss) {
        halfDmg = true;
      } 
      else {
        const message = isCritMiss ? "Critical Miss" : "Miss";
        _createDamageChatMessage(actor, 0, message);
        return;
      }
    }

    // Damage Reduction and Heavy/Brutal Hits
    dmg = _applyAttackCheckDamageModifications(dmg, modified, defence, rollTotal, dr);
  }

  // Vulnerability, Resistance and other (True dmg cannot be modified)
  if (dmgType != "true") {
    const damageType = damageReduction.damageTypes[dmgType];
    dmg = _applyOtherDamageModifications(dmg, damageType);
  }

  // Half the final dmg taken on miss 
  if (halfDmg) {
    dmg.source += ` - Miss(Half Damage)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }

  const newValue = health.value - dmg.value;
  actor.update({["system.resources.health.value"]: newValue});
  _createDamageChatMessage(actor, dmg.value, dmg.source);
}

function _applyAttackCheckDamageModifications(dmg, modified, defence, rollTotal, dr) {
  if (rollTotal === null) return dmg;     // We want to check armor class only for attacks

  const hit = rollTotal - defence;
  const extraDmg = Math.max(Math.floor(hit/5), 0);
  // Apply damage reduction
  if (extraDmg === 0 && dr > 0) {
    dmg.source += " - Damage Reduction";
    dmg.value -= dr
    return dmg; 
  }

  // Only modified rolls can apply Heavy Hit, Brutal Hit dmg
  if (!modified) return dmg;

  // Add dmg from Heavy Hit, Brutal Hit etc.
  if (extraDmg === 1) dmg.source += " + Heavy Hit";
  if (extraDmg === 2) dmg.source += " + Brutal Hit";
  if (extraDmg >= 3) dmg.source += ` + Brutal Hit(over ${extraDmg * 5})`;
  dmg.value += extraDmg
  return dmg;  
}

function _applyOtherDamageModifications(dmg, damageType) {
  // STEP 1 - Adding & Subtracting
  // Resist X
  if (damageType.resist > 0) {
    dmg.source += ` - Resistance(${damageType.resist})`;
    dmg.value -= damageType.resist;
  }
  // Vulnerable X
  if (damageType.vulnerable > 0) {
    dmg.source += ` + Vulnerability(${damageType.vulnerable})`;
    dmg.value += damageType.vulnerable; 
  }
  dmg.value = dmg.value > 0 ? dmg.value : 0;

  // STEP 2 - Doubling & Halving
  // Immunity
  if (damageType.immune) {
    dmg.source = "Resistance(Immune)";
    dmg.value = 0;
    return dmg;
  }
  // Resistance and Vulnerability - cancel each other
  if (damageType.resistance && damageType.vulnerability) return dmg;
  // Resistance
  if (damageType.resistance) {
    dmg.source += ` - Resistance(Half)`;
    dmg.value = Math.ceil(dmg.value/2);  
  }
  // Vulnerability
  if (damageType.vulnerability) {
    dmg.source += ` + Vulnerability(Half)`;
    dmg.value = dmg.value * 2; 
  }

  return dmg;
}

//================================================
//           HP CHANGE CHAT MESSAGES             =
//================================================
function _createDamageChatMessage(actor, amount, source) {
  const color = "#780000";
  const icon = "fa-droplet";
  const text = `<i>${actor.name}</i> took <b>${amount}</b> damage.`;
  _createHpChangeMessage(color, icon, text, source);
}

function _createHealChatMessage(actor, amount, source) {
  const color = "#007802";
  const icon = "fa-heart";
  const text = `<i>${actor.name}</i> was healed by <b>${amount}</b> HP.`;
  _createHpChangeMessage(color, icon, text, source);
}

function _createTempHPChatMessage(actor, amount, source) {
  const color = "#707070";
  const icon = "fa-shield-halved";
  const text = `<i>${actor.name}</i> received <b>${amount}</b> temporary HP.`;
  _createHpChangeMessage(color, icon, text, source);
}

function _createHpChangeMessage(color, icon, text, source) {
  let sources = ""
  const shouldAddSources = game.settings.get("dc20rpg", "showSourceOfDamageOnChatMessage");
  if (shouldAddSources) sources = `<br><br><i class="fa-solid fa-calculator"></i> = ${source}.`;;

  const content = `<div style="font-size: 16px; color: ${color};">
                    <i class="fa fa-solid ${icon}"></i> ${text} ${sources}
                  </div>`;

  const message = {
    content: content
  };
  const gmOnly = !game.settings.get("dc20rpg", "showDamageChatMessage");
  if (gmOnly) message.whisper = ChatMessage.getWhisperRecipients("GM");
  ChatMessage.create(message);
}