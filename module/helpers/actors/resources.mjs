import { sendHealthChangeMessage } from "../../chat/chat-message.mjs";
import { generateKey } from "../utils.mjs";

//=============================================
//              CUSTOM RESOURCES              =
//=============================================
export function createCustomResourceFromScalingValue(key, scalingValue, actor) {
  const maxFormula = `@scaling.${key}`;
  const newResource = {
    name: scalingValue.label,
    img: "icons/svg/item-bag.svg",
    value: 0,
    maxFormula: maxFormula,
    max: 0,
    reset: scalingValue.reset
  }
  actor.update({[`system.resources.custom.${key}`] : newResource});
}

export function createNewCustomResource(name, actor) {
  const customResources = actor.system.resources.custom;
  const newResource = {
    name: name,
    img: "icons/svg/item-bag.svg",
    value: 0,
    maxFormula: null,
    max: 0,
    reset: ""
  }

  // Generate key (make sure that key does not exist already)
  let resourceKey = "";
  do {
    resourceKey = generateKey();
  } while (customResources[resourceKey]);

  actor.update({[`system.resources.custom.${resourceKey}`] : newResource});
}

export function createNewCustomResourceFromItem(resource, img, actor) {
  const key = resource.resourceKey;
  const maxFormula = resource.useStandardTable ?  `@scaling.${key}` : resource.customMaxFormula 
  const newResource = {
    name: resource.name,
    img: img,
    value: 0,
    maxFormula: maxFormula,
    max: 0,
    reset: resource.reset
  }
  actor.update({[`system.resources.custom.${key}`] : newResource});
}

export function removeResource(resourceKey, actor) {
  actor.update({[`system.resources.custom.-=${resourceKey}`]: null });
}

export function changeResourceIcon(key, actor) {
  new FilePicker({
    type: "image",
    displayMode: "tiles",
    callback: (path) => {
      if (!path) return;
      // Update the actor's custom resource icon with the selected image path
      actor.update({[`system.resources.custom.${key}.img`] : path});
    }
  }).render();
}

export function createLegenedaryResources(actor) {
  const lap = {
    name: "Legendary Action Points",
    img: "icons/commodities/currency/coin-embossed-sword-copper.webp",
    value: 3,
    maxFormula: "3",
    max: 0,
    reset: "round"
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
    fromEvent: options.fromEvent,
    messageId: options.messageId
  }
  await actor.update(updateData);
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
      fromEvent: options.fromEvent,
      messageId: options.messageId
    }
    actor.update(updateData);
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
    await actor.update({["system.resources.health.temp"]: healAmount});
    sendHealthChangeMessage(actor, healAmount - oldTemp, sources, "temporary");
  }
}