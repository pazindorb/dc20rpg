export function initFlags(item) {
  if (!item.flags.dc20rpg) item.flags.dc20rpg = {};

  const flags = item.flags.dc20rpg;
  if (flags.favorites === undefined) flags.favorites = false;
  _rollMenu(flags);
}

function _rollMenu(flags) {
  if (flags.rollMenu === undefined) flags.rollMenu = {};
	if (flags.rollMenu.dis === undefined) flags.rollMenu.dis = 0;
	if (flags.rollMenu.adv === undefined) flags.rollMenu.adv = 0;
  if (flags.rollMenu.apCost === undefined) flags.rollMenu.apCost = 0;
	if (flags.rollMenu.d8 === undefined) flags.rollMenu.d8 = 0;
	if (flags.rollMenu.d6 === undefined) flags.rollMenu.d6 = 0;
	if (flags.rollMenu.d4 === undefined) flags.rollMenu.d4 = 0;
	if (flags.rollMenu.free === undefined) flags.rollMenu.free = false;
  if (flags.rollMenu.versatile === undefined) flags.rollMenu.versatile = false;
  if (flags.rollMenu.ignoreConcentration === undefined) flags.rollMenu.ignoreConcentration = false;
  if (flags.rollMenu.ignoreMCP === undefined) flags.rollMenu.ignoreMCP = false;
  if (flags.rollMenu.showMenu === undefined) flags.rollMenu.showMenu = false;
  if (flags.rollMenu.flanks === undefined) flags.rollMenu.flanks = false;
  if (flags.rollMenu.halfCover === undefined) flags.rollMenu.halfCover = false;
  if (flags.rollMenu.tqCover === undefined) flags.rollMenu.tqCover = false;
  if (flags.rollMenu.autoCrit === undefined) flags.rollMenu.autoCrit = false;
  if (flags.rollMenu.autoFail === undefined) flags.rollMenu.autoFail = false;
}