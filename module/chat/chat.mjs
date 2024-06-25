import { DC20ChatMessage } from "./chat-message.mjs";

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
export async function sendRollsToChat(rolls, actor, details) {
  const rollsInChatFormat = _prepareRollsInChatFormat(rolls);
  const collectTargets = game.settings.get("dc20rpg", "showTargetsOnChatMessage");
  const targets = collectTargets ? _collectTargets() : [];
  const system = {
    ...details,
    targetedTokens: targets,
    roll: rolls.winningRoll,
    chatFormattedRolls: rollsInChatFormat,
    rolls: _rollsObjectToArray(rolls),
    winTotal: rolls.winningRoll?._total || 0
  }

  await DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    rolls: _rollsObjectToArray(rolls),
    sound: CONFIG.sounds.dice,
    system: system
  })
}

export function sendRollsToChatOld(rolls, actor, details) {
  const isCrit = rolls.winningRoll?.crit || false;
  const isCritFail = rolls.winningRoll?.fail || false;
  const rollsInChatFormat = _prepareRollsInChatFormat(rolls);
  const targets = details.collectTargets ? _checkIfAttackHitsTargets(details.rollTotal, details.targetDefence, isCrit, isCritFail) : [];
  const templateData = {
    ...details,
    roll: rolls.winningRoll,
    rolls: rollsInChatFormat,
    winTotal: rolls.winningRoll?._total || 0,
    amountOfCoreRolls: rolls.core.length,
    targets: targets
  }
  // Chcemy sie pozbyć Template data innych gównien. Większość jak nie cały ten plik ma zniknąć
  const templateSource = "systems/dc20rpg/templates/chat/roll-chat-message.hbs";
  _createChatMessage(actor, templateData, templateSource, rolls);
}

async function _createChatMessage(actor, data, templateSource, rolls) {
  // const messageHeader = TODO: Add chat message custom header 
  const templateData = {
    ...data
  }
  // DUPA!!!!: Przesyłam rzeczy bezpośrednio do wiadomości np w systemie
  const template = await renderTemplate(templateSource, templateData);
  await DC20ChatMessage.create({
    speaker: DC20ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    content: template,
    rolls: _rollsObjectToArray(rolls),
    sound: CONFIG.sounds.dice,
    system: {some: "variable"}
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

function _prepareRollsInChatFormat(rolls) {
  const boxRolls = []; // Core and Other rolls
  const dmgRolls = [];
  const healingRolls = [];
  if (rolls.core) rolls.core.forEach(roll => boxRolls.push(_packedRoll(roll)));
  if (rolls.formula) {
    rolls.formula.forEach(roll => {
      if (roll.clear.category === "other") boxRolls.push(_packedRoll(roll.clear)); // We do not modify Other rolls
      if (roll.clear.category === "damage") {
        dmgRolls.push({
          modified: _packedRoll(roll.modified),
          clear: _packedRoll(roll.clear)
        });
      }
      if (roll.clear.category === "healing") {
        healingRolls.push({
          modified: _packedRoll(roll.modified),
          clear: _packedRoll(roll.clear)
        });
      }
    });
  }
  return {
    box: boxRolls,
    dmg: dmgRolls,
    heal: healingRolls,
    winningRoll: _packedRoll(rolls.winningRoll)
  }
}

// We need to pack rolls in order to contain them after rendering message.
function _packedRoll(roll) {
  return {...roll};
}

function _collectTargets() {
  const targets = [];
  game.user.targets.forEach(token => targets.push(_tokenToTarget(token)));
  return targets;
}

function _tokenToTarget(token) {
  const actor = token.actor;
  const conditions = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
  const target = {
    name: actor.name,
    img: actor.img,
    id: token.id,
    system: actor.system,
    conditions: conditions
  };
  return target;
}

function _checkIfAttackHitsTargets(rollTotal, defenceKey, isCrit, isCritFail) {
  const targets = [];
  game.user.targets.forEach(token => targets.push(_tokenToTarget(token, rollTotal, defenceKey, isCrit, isCritFail)));
  return targets;
}

function _tokenToTargetOld(token, rollTotal, defenceKey, critHit, critMiss) {
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