export async function checkIfShouldOverrideSystemCompendiumWithModule() {
  const module = game.modules.get("dc20-players-handbook-beta");
  const shouldOverride = module && module.active;
  const overridenAlready = game.settings.get("dc20rpg", "systemCompendiumOverridenAlready");
  
  if (shouldOverride && overridenAlready) return;
  if (!shouldOverride && !overridenAlready) return;
  
  if (shouldOverride && !overridenAlready) {
    const systemPacks = Object.fromEntries(game.packs.filter(pack => pack.metadata.id.startsWith("dc20rpg.")).map(pack => [pack.metadata.name, pack]));
    const modulePackNames = game.packs.filter(pack => pack.metadata.id.startsWith("dc20-players-handbook-beta.")).map(pack => pack.metadata.name);
    for (const packName of modulePackNames) {
      const systemPack = systemPacks[packName];
      if (systemPack) {
        await systemPack.configure({ownership: {default: 0}});
      }
    }
    await game.settings.set("dc20rpg", "systemCompendiumOverridenAlready", true);
  }

  if (!shouldOverride && overridenAlready) {
    const systemPacks = game.packs.filter(pack => pack.metadata.id.startsWith("dc20rpg."));
    for (const pack of systemPacks) {
      await pack.configure({ ownership: null });
    }
    await game.settings.set("dc20rpg", "systemCompendiumOverridenAlready", false);
  }
}

export function validateUserOwnership(pack) {
  if (pack.ownership.default === 0) return false;

  const userRole = CONST.USER_ROLE_NAMES[game.user.role];
  const packOwnership = pack.ownership[userRole];
  if (packOwnership === "NONE") return false;
  
  return true;
}