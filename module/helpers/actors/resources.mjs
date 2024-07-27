import { addStatusWithIdToActor, removeStatusWithIdFromActor } from "../../statusEffects/statusUtils.mjs";
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
  const maxFormula = `@scaling.${key}`;
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

//=============================================
//             HP THRESHOLD CHECK              =
//=============================================
export function runHealthThresholdsCheck(oldHp, newHp, maxHp, actor) {
  const bloodiedThreshold = Math.floor(maxHp/2);
  const wellBloodiedThreshold = Math.floor(maxHp/4);
  const deathThreshold = actor.type === "character" ? actor.system.death.treshold : 0;
  
  _checkStatus("bloodied1", oldHp, newHp, bloodiedThreshold, actor);
  _checkStatus("bloodied2", oldHp, newHp, wellBloodiedThreshold, actor);
  _checkStatus("dead", oldHp, newHp, deathThreshold, actor);
  return {
    system: _checkDeathsDoor(oldHp, newHp, actor)
  };
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
    return {
      death: {
        stable: true,
        active: false,
      }
    }
  }

  // Wasn't on Death's Doors and got there
  if (oldHp > 0 && newHp <= 0) {
    const currentExhaustion = actor.system.exhaustion;
    const newExhaustion = currentExhaustion !== 6 ? currentExhaustion + 1 : 6;
    return {
      exhaustion: newExhaustion,
      death: {
        stable: false,
        active: true,
      }
    }
  }

  return {};
}