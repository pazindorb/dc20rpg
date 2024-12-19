import { sendDescriptionToChat, sendHealthChangeMessage } from "../../chat/chat-message.mjs";
import { promptRollToOtherPlayer } from "../../dialogs/roll-prompt.mjs";
import { addStatusWithIdToActor, exhaustionToggle, hasStatusWithId, removeStatusWithIdFromActor } from "../../statusEffects/statusUtils.mjs";
import { generateKey } from "../utils.mjs";
import { rollFromSheet } from "./rollsFromActor.mjs";

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
//             HP THRESHOLD CHECK             =
//=============================================
export function runHealthThresholdsCheck(oldHp, newHp, maxHp, actor) {
  const bloodiedThreshold = Math.floor(maxHp/2);
  const wellBloodiedThreshold = Math.floor(maxHp/4);
  const deathThreshold = actor.type === "character" ? actor.system.death.treshold : 0;
  
  _checkStatus("bloodied1", oldHp, newHp, bloodiedThreshold, actor);
  _checkStatus("bloodied2", oldHp, newHp, wellBloodiedThreshold, actor);
  _checkStatus("dead", oldHp, newHp, deathThreshold, actor);
  _checkDeathsDoor(oldHp, newHp, actor);
}

function _checkStatus(statusId, oldHp, newHp, treshold, actor) {
  // Add status
  if (oldHp > treshold && newHp <= treshold) addStatusWithIdToActor(actor, statusId);
  // Remove status
  if (oldHp <= treshold && newHp > treshold) removeStatusWithIdFromActor(actor, statusId);
}

function _checkDeathsDoor(oldHp, newHp, actor) {
  if (actor.type !== "character") return {}; // Only PC have death's door

  // Was on Death's Doors and it ended
  if (oldHp <= 0 && newHp > 0) {
    actor.update({["system.death"]: {stable: true, active: false}});
    actor.toggleStatusEffect("deathsDoor", { active: false });
  }

  // Wasn't on Death's Doors and got there
  if (oldHp > 0 && newHp <= 0) {
    exhaustionToggle(actor, true);
    actor.update({["system.death"]: {stable: false, active: true}});
    actor.toggleStatusEffect("deathsDoor", { active: true });
    
    if (actor.hasAnyStatus(["concentration"])) {
      sendDescriptionToChat(actor, {
        rollTitle: "Concentration Lost - Death's Door",
        image: actor.img,
        description: "You cannot concentrate when on Death's Door",
      });
      actor.toggleStatusEffect("concentration", { active: false });
    }
  }
}

export async function runConcentrationCheck(oldHp, newHp, actor) {
  if (newHp === undefined) return;
  const damage = oldHp - newHp;
  if (damage <= 0) return;
  
  if (!hasStatusWithId(actor, "concentration")) return;
  const dc = Math.max(10, (2*damage));
  const details = {
    roll: `d20 + @special.menSave`,
    label: `Concentration Save vs ${dc}`,
    rollTitle: "Concentration",
    type: "save",
    against: dc,
    checkKey: "men",
    concentration: true
  }
  let roll;
  if (actor.type === "character") roll = await promptRollToOtherPlayer(actor, details); 
  else roll = rollFromSheet(actor, details);
  if (roll && roll._total < dc) {
    sendDescriptionToChat(actor, {
      rollTitle: "Concentration Lost",
      image: actor.img,
      description: "",
    });
    actor.toggleStatusEffect("concentration", { active: false });
  }
}

//=============================================
//              HP MANIPULATION               =
//=============================================
export async function applyDamage(actor, dmg, fromEvent) {
  if (!actor) return;
  const health = actor.system.resources.health;
  const newValue = health.value - dmg.value;
  const updateData = {
    ["system.resources.health.value"]: newValue,
    fromEvent: fromEvent,
  }
  await actor.update(updateData);
  sendHealthChangeMessage(actor, dmg.value, dmg.source, "damage");
}

export async function applyHealing(actor, heal, fromEvent) {
  let sources = heal.source;
  const healType = heal.healType;
  const healAmount = heal.value;
  const health = actor.system.resources.health;

  if (healType === "heal") {
    const oldCurrent = health.current;
    let newCurrent = oldCurrent + healAmount;

    if (health.max <= newCurrent) {
      sources += ` -> (Overheal <b>${newCurrent - health.max}</b>)`;
      newCurrent = health.max;
    }
    const updateData = {
      ["system.resources.health.value"]: newCurrent,
      fromEvent: fromEvent,
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