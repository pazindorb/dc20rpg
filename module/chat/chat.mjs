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
  const templateData = {
    ...details,
    roll: rolls.winningRoll,
    rolls: rolls,
    winTotal: rolls.winningRoll._total,
    amountOfCoreRolls: rolls.core.length
  }
  const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
  _createChatMessage(actor, templateData, templateSource, rolls);
}

/**
 * Creates chat message describing change of actor HP.
 */
export function createHPChangeChatMessage(actor, amount, type) {
  amount = Math.abs(amount);
  if (amount === 0) return;
  let content = "";

  switch (type) {
    case "damage":
      content = `<div style="font-size: 16px; color: #780000;">
                  <i class="fa fa-solid fa-droplet"></i>
                  <i>${actor.name}</i> took <b>${amount}</b> damage.
                </div>`;
      break;
    case "healing":
      content = `<div style="font-size: 16px; color: #007802;">
                  <i class="fa fa-solid fa-heart"></i>
                  <i>${actor.name}</i> got <b>${amount}</b> health.
                </div>`;
      break;
    case "temporary":
      content = `<div style="font-size: 16px; color: #707070;">
                  <i class="fa fa-solid fa-shield-halved"></i>
                  <i>${actor.name}</i> got <b>${amount}</b> temporary health.
                </div>`;
      break;
    default:
      content = `<div style="font-size: 16px;">
                  Unsuported HP change type.
                </div>`;
  }

  ChatMessage.create({
    content: content,
    whisper: ChatMessage.getWhisperRecipients("GM"),
  });
}

async function _createChatMessage(actor, data, templateSource, rolls) {
  const templateData = {
    ...data,
    // config: DC20RPG
  }
  const template = await renderTemplate(templateSource, templateData);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    content: template,
    rolls: rolls,
    sound: CONFIG.sounds.dice,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL
  });
}

//================================================
//         CUSTOM CHAT MESSAGE LISTENERS         =
//================================================
export function initChatMessage(html) {
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

  html.find('.roll-save').click(event => _callOnTokens(event, "save"));
  html.find('.roll-check').click(event => _callOnTokens(event, "check"));
  html.find('.applicable').click(event => _callOnTokens(event, datasetOf(event).type));
}
async function _callOnTokens(event, type) {
  event.preventDefault();
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

  switch (healType) {
    case "heal": 
      let newCurrent = health.current + healAmount;
      newCurrent = health.max <= newCurrent ? health.max : newCurrent;
      const newValue = newCurrent + health.temp;
      actor.update({["system.resources.health.value"]: newValue});
      break;
    case "temporary":
      const newTemp = (health.temp ? health.temp : 0) + healAmount;
      actor.update({["system.resources.health.temp"]: newTemp});
      break;
    case "max":
      const newMax = (health.tempMax ? health.tempMax : 0) + healAmount;
      actor.update({["system.resources.health.tempMax"]: newMax});
      break;
  }
}
function _applyDamage(actor, dataset) {
  const rollTotal = dataset.total ? parseInt(dataset.total) : null;
  let value = parseInt(dataset.dmg);
  const dmgType = dataset.dmgType;
  const health = actor.system.resources.health;
  

  if (dmgType === "true" || dmgType === "") {
    const newValue = health.value - value;
    actor.update({["system.resources.health.value"]: newValue});
    return;
  }

  const damageReduction = actor.system.damageReduction;
  let defenceKey = "physical";
  let drKey = "pdr";
  if (["holy", "unholy", "sonic", "psychic"].includes(dmgType)) {
    defenceKey = "mental";
    drKey = "mdr";
  }
  const defence = actor.system.defences[defenceKey].value;
  const dr = damageReduction[drKey].value;
  value = _calculateHitDamage(value, defence, rollTotal, dr);

  const damageType = damageReduction.damageTypes[dmgType];
  value = _calcualteFinalDamage(value, damageType);

  const newValue = health.value - value;
  actor.update({["system.resources.health.value"]: newValue});
}
function _calculateHitDamage(dmg, defence, rollTotal, dr) {
  if (rollTotal === null) return dmg;     // We want to check armor class only for attacks

  let extraDmg = 0;
  const hit = rollTotal - defence;
  if (hit < 0) return 0;

  extraDmg = Math.floor(hit/5);
  if (extraDmg === 0) return dmg - dr;    // Apply damage reduction
  return dmg + extraDmg;                  // Add dmg from Heavy Hit, Brutal Hit etc.
}
function _calcualteFinalDamage(dmg, damageType) {
  dmg += damageType.vulnerable;                          // Vulnerable X
  dmg -= damageType.resist                               // Resist X
  dmg = dmg > 0 ? dmg : 0;

  if (damageType.immune) dmg = 0;                        // Immunity
  if (damageType.resistance) dmg = Math.ceil(dmg/2);     // Resistance
  if (damageType.vulnerability) dmg = dmg * 2;           // Vulnerability

  return dmg;
}