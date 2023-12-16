import { generateKey } from "../utils.mjs";

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