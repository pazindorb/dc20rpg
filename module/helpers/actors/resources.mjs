export function createNewCustomResource(name, actor) {
  const customResources = actor.system.resources.custom;
  const newResource = {
    name: name,
    img: "icons/svg/item-bag.svg",
    current: 0,
    max: 0
  }

  // Generate key (make sure that key does not exist already)
  let resourceKey = "";
  do {
    resourceKey = generateResourceKey();
  } while (customResources[resourceKey]);

  actor.update({[`system.resources.custom.${resourceKey}`] : newResource});
}

export function removeResource(resourceKey, actor) {
  actor.update({[`system.resources.custom.-=${resourceKey}`]: null });
}

export function changeResourceIcon(event, actor) {
  const key = event.detail.key;
  const newSrc = event.detail.newSrc;
  console.info(key);
  console.info(newSrc);
  actor.update({[`system.resources.custom.${key}.img`] : newSrc});
}

export function showItemAsResource(item) {
  const itemCharges = item.system.costs.charges;
  return {
    img: item.img,
    name: item.name,
    current: itemCharges.current,
    max: itemCharges.max
  }
}

function generateResourceKey() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;

  let result = '';
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
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