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

export function removeResource(resourceKey, actor) {
  actor.update({[`system.resources.custom.-=${resourceKey}`]: null });
}

export function changeResourceIcon(event, actor) {
  const key = event.detail.key;
  const newSrc = event.detail.newSrc;
  actor.update({[`system.resources.custom.${key}.img`] : newSrc});
}

export function addObserverToCustomResources(html) {
  const resourceIcons = html.find('.resource-icon').toArray();
  resourceIcons.forEach(icon => _applyObserver(icon));
}

function _applyObserver(icon) {
  // Create a new MutationObserver instance
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const newSrcValue = icon.src;
        const key = $(icon).data('key');
        const srcWithoutOrigin = newSrcValue.replace(origin + "/",'');;

        const eventData = {
          newSrc: srcWithoutOrigin, 
          key: key
        }

        const event = new CustomEvent('imageSrcChange', {detail: { ...eventData }});
        icon.dispatchEvent(event); // Emit the custom event
    }
  }});

  // Start observing the 'attributes' mutations on the target node
  observer.observe(icon, { attributes: true });
}

//=============================================
//             HP THRESHOLD CHECK              =
//=============================================
export function runHealthThresholdsCheck(oldHp, newHp, maxHp, actor) {
  _checkBloodied(oldHp, newHp, maxHp, actor);
  _checkWellBloodied(oldHp, newHp, maxHp, actor);
  return {
    system: _checkDeathsDoor(oldHp, newHp, actor)
  };
}

function _checkBloodied(oldHp, newHp, maxHp, actor) {
  const bloodiedHP = Math.floor(maxHp/2);
  // Add status
  if (oldHp > bloodiedHP && newHp <= bloodiedHP) {
    addStatusWithIdToActor(actor, "bloodied1");
  }

  // Remove status
  if (oldHp <= bloodiedHP && newHp > bloodiedHP) {
    removeStatusWithIdFromActor(actor, "bloodied1");
  }
}

function _checkWellBloodied(oldHp, newHp, maxHp, actor) {
  const wellBloodiedHP = Math.floor(maxHp/4);
  // Add status
  if (oldHp > wellBloodiedHP && newHp <= wellBloodiedHP) {
    addStatusWithIdToActor(actor, "bloodied2");
  }

  // Remove status
  if (oldHp <= wellBloodiedHP && newHp > wellBloodiedHP) {
    removeStatusWithIdFromActor(actor, "bloodied2");
  }
}

function _checkDeathsDoor(oldHp, newHp, actor) {
  // Do it only for PCs
  if (actor.type !== "character") return {};

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