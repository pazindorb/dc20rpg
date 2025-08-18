export function initFlags(item) {
  if (!item.flags.dc20rpg) item.flags.dc20rpg = {};

  const flags = item.flags.dc20rpg;
  if (flags.favorites === undefined) flags.favorites = false;
}