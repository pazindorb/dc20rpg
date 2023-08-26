export async function addItemAsCustomResource(item) {
  if (!item.isOwned) return; 
  const actor = await item.actor;
  const itemCharges = item.system.costs.charges;
  const newResource = {
    name: item.name,
    current: itemCharges.current,
    max: itemCharges.max
  }
  actor.update({ [`system.customResources.${item.id}`] : newResource});
}

export async function removeItemAsCustomResource(item) {
  if (!item.isOwned) return;
  const actor = await item.actor;
  actor.update({ [`system.customResources.-=${item.id}`]: null });
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