import { sendHealthChangeMessage } from "../../chat/chat-message.mjs";

//=============================================
//              CUSTOM RESOURCES              =
//=============================================
// TODO: Should we somehow mark monster as legendary and call this method there?
export function createLegenedaryResources(actor) {
  const lap = {
    name: "Legendary Action Points",
    img: "icons/commodities/currency/coin-embossed-sword-copper.webp",
    value: 3,
    maxFormula: "3",
    max: 0,
    reset: "roundEnd"
  }

  const bossPoints = {
    name: "Boss Points",
    img: "icons/commodities/bones/skull-hollow-orange.webp",
    value: 3,
    maxFormula: "3",
    max: 0,
    reset: ""
  }

  const updateData = {
    lap: lap,
    boss: bossPoints
  }
  actor.update({['system.resources.custom'] : updateData});
}

//=============================================
//              HP MANIPULATION               =
//=============================================
/**
 * Applies damage to given actor.
 * Dmg object should look like this:
 * {
 *  "source": String,
 *  "type": String(ex. "fire"),
 *  "value": Number
 * }
 */
export async function applyDamage(actor, dmg, options={}) {
  if (!actor) return;
  if (dmg.value === 0) return;

  const health = actor.system.resources.health;
  const newValue = health.value - dmg.value;
  const updateData = {
    ["system.resources.health.value"]: newValue,
    skipEventCall: options.skipEventCall,
    messageId: options.messageId
  }
  await actor.gmUpdate(updateData);
  sendHealthChangeMessage(actor, dmg.value, dmg.source, "damage");
}

/**
 * Applies damage to given actor.
 * Heal object should look like this:
 * {
 *  "source": String,
 *  "type": String(ex. "temporary"),
 *  "value": Number,
 *  "allowOverheal": Boolean
 * }
 */
export async function applyHealing(actor, heal, options={}) {
  if (!actor) return;
  if (heal.value === 0) return;

  const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
  if (preventHpRegen) {
    ui.notifications.error('You cannot regain any HP');
    return;
  }

  let sources = heal.source;
  const healType = heal.type;
  const healAmount = heal.value;
  const health = actor.system.resources.health;

  if (healType === "heal") {
    const oldCurrent = health.current;
    let newCurrent = oldCurrent + healAmount;
    let temp = health.temp || 0;

    // Overheal
    if (health.max < newCurrent) {
      const overheal = newCurrent - health.max;
      // Allow Overheal to transfer to temporary hp
      if (heal.allowOverheal) {
        if (overheal > temp) {
          sources += ` -> (Overheal <b>${overheal}</b> -> Transfered to TempHP)`;
          temp = overheal;
        }
        else sources += ` -> (Overheal <b>${overheal}</b> -> Would transfer to TempHP but current TempHP is bigger)`;
      }
      else sources += ` -> (Overheal <b>${overheal}</b>)`;
      newCurrent = health.max;
    }

    const updateData = {
      ["system.resources.health.temp"]: temp,
      ["system.resources.health.current"]: newCurrent,
      ["system.resources.health.value"]: newCurrent,
      skipEventCall: options.skipEventCall,
      messageId: options.messageId
    }
    await actor.gmUpdate(updateData);
    sendHealthChangeMessage(actor, newCurrent - oldCurrent, sources, "healing");
  }
  
  if (healType === "temporary") {
    // Temporary HP do not stack it overrides
    const oldTemp = health.temp || 0;
    if (oldTemp >= healAmount) {
      sources += ` -> (Current Temporary HP is higher)`;
      sendHealthChangeMessage(actor, 0, sources, "temporary");
      return;
    }
    else if (oldTemp > 0) {
      sources += ` -> (Adds ${healAmount - oldTemp} to curent Temporary HP)`;
    }
    await actor.gmUpdate({["system.resources.health.temp"]: healAmount});
    sendHealthChangeMessage(actor, healAmount - oldTemp, sources, "temporary");
  }
}