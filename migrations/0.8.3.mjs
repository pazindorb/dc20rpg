export async function runMigration() {
  await _runDefaultColorsUpdate();
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateActiveEffectsOn(actor);
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    await _updateActiveEffectsOn(actor);
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Actor"
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateActiveEffectsOn(actor);
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over items on world
  for (const item of game.items) {
    await _updateActiveEffectsOn(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentName === "Item"
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateActiveEffectsOn(item);
      }
    }
  }
}

async function _updateActiveEffectsOn(owner) {
  if (!owner.effects) return;
  for (const effect of owner.effects) {
    let shouldBeUpdated = false;
    const changes = effect.changes;
    for(let i = 0; i < changes.length; i++) {
      if (changes[i].key.startsWith("system.vision.")) {
        changes[i].key = changes[i].key.replace("system.vision.", "system.senses.");
        shouldBeUpdated = true;
      }
    }
    if (shouldBeUpdated) await effect.update({changes: changes});
  }
}

async function _runDefaultColorsUpdate() {
  const colorPalette = {...game.settings.get("dc20rpg", "colorPaletteStore")};
  const defaultPalette = _defaultColorPalette();

  let anyChanges = false;
  Object.entries(colorPalette).forEach(([palKey, palette]) => {
    const form = defaultPalette[palKey] || defaultPalette.default;

    Object.entries(form).forEach(([colorKey, color]) => {
      if (!palette[colorKey]) {
        palette[colorKey] = color;
        anyChanges = true;
      }
    })
  })

  if (anyChanges) {
    await game.settings.set("dc20rpg", "colorPaletteStore", colorPalette);
  }
}

function _defaultColorPalette() {
  return {
    default: _defaultColors(),
    dark: _darkColors()
  }
}
function _defaultColors() {
  return {
    ['--primary-color']: "#741a89",
    ['--primary-light']: "#917996",
    ['--primary-dark']: "#5a265f",
    ['--primary-darker']: "#3f0344",

    ['--background-color']: "transparent",
    ['--background-banner']: "#6c0097b0",
    
    ['--secondary-color']: "#c0c0c0",
    ['--secondary-dark']: "#646464",
    ['--secondary-darker']: "#262626",
    ['--secondary-lighter']: "#dfdfdf",
    ['--secondary-light-alpha']: "#dfdfdfcc",

    ['--table-1']: "#5a265f",
    ['--table-2']: "#48034e",

    ['--dark-red']: "#b20000",
    ['--unequipped']: "#c5c5c5a3",
    ['--equipped']: "#88a16f",
    ['--attuned']: "#c7c172",
    ['--activated-effect']: "#77adad",
    ['--item-selected']: "#ac45d5a6",

    ['--action-point']: "#610064",
    ['--stamina']: "#b86b0d",
    ['--mana']: "#124b8b",
    ['--health-point']: "#921a1a",
    ['--health']: "#138241",
    ['--grit']: "#7a0404",

    ['--health-bar']: "#6fde75",
    ['--temp-health-bar']: "#ccac7d",
    ['--stamina-bar']: "#e1d676",
    ['--mana-bar']: "#81a3e7",
    ['--grit-bar']: "#b36363",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",

    // NPC Sheet
    ['--npc-main']: "#1f268d",
    ['--npc-main-light']: "#534d69",
    ['--npc-main-lighter']: "#6876a7",
    ['--npc-main-dark']: "#0e1250",
    ['--npc-secondary']: "#c0c0c0",
    ['--npc-secondary-light']: "#dfdfdf",
    ['--npc-secondary-light-alpha']: "#dfdfdfcc",
    ['--npc-secondary-dark']: "#646464",
    ['--npc-secondary-darker']: "#262626",
    ['--npc-text-color-1']: "#ffffff",
    ['--npc-text-color-2']: "#000000",
    ['--npc-background']: "transparent",
    ['--npc-table-1']: "#262a69",
    ['--npc-table-2']: "#050947",
    ['--npc-header-image-color']: "#2442c9a3",
    ['--npc-sidetab-image-color']: "#2442c9a3",

    // PC Sheet
    ['--pc-main']: "#5d178b",
    ['--pc-main-light']: "#534d69",
    ['--pc-main-lighter']: "#786188",
    ['--pc-main-dark']: "#2b0e50",
    ['--pc-secondary']: "#c0c0c0",
    ['--pc-secondary-light']: "#dfdfdf",
    ['--pc-secondary-light-alpha']: "#dfdfdfcc",
    ['--pc-secondary-dark']: "#646464",
    ['--pc-secondary-darker']: "#262626",
    ['--pc-text-color-1']: "#ffffff",
    ['--pc-text-color-2']: "#000000",
    ['--pc-background']: "transparent",
    ['--pc-table-1']: "#573085",
    ['--pc-table-2']: "#290547",
    ['--pc-header-image-color']: "#44116ba3",
    ['--pc-sidetab-image-color']: "#431169a3",
    ['--pc-unique-item-color']: "#ac45d5a6",
  }
}

function _darkColors() {
  return {
    ['--primary-color']: "#741a89",
    ['--primary-light']: "#917996",
    ['--primary-dark']: "#5a265f",
    ['--primary-darker']: "#3f0344",

    ['--background-color']: "transparent",
    ['--background-banner']: "#6c0097b0",
    
    ['--secondary-color']: "#c0c0c0",
    ['--secondary-dark']: "#646464",
    ['--secondary-darker']: "#262626",
    ['--secondary-lighter']: "#dfdfdf",
    ['--secondary-light-alpha']: "#dfdfdfcc",

    ['--table-1']: "#5a265f",
    ['--table-2']: "#48034e",

    ['--dark-red']: "#b20000",
    ['--unequipped']: "#c5c5c5a3",
    ['--equipped']: "#88a16f",
    ['--attuned']: "#c7c172",
    ['--activated-effect']: "#77adad",
    ['--item-selected']: "#ac45d5a6",

    ['--action-point']: "#610064",
    ['--stamina']: "#b86b0d",
    ['--mana']: "#124b8b",
    ['--health-point']: "#921a1a",
    ['--health']: "#138241",
    ['--grit']: "#7a0404",

    ['--health-bar']: "#6fde75",
    ['--temp-health-bar']: "#ccac7d",
    ['--stamina-bar']: "#e1d676",
    ['--mana-bar']: "#81a3e7",
    ['--grit-bar']: "#b36363",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",

    // NPC Sheet
    ['--npc-main']: "#1f268d",
    ['--npc-main-light']: "#534d69",
    ['--npc-main-lighter']: "#6876a7",
    ['--npc-main-dark']: "#0e1250",
    ['--npc-secondary']: "#c0c0c0",
    ['--npc-secondary-light']: "#dfdfdf",
    ['--npc-secondary-light-alpha']: "#dfdfdfcc",
    ['--npc-secondary-dark']: "#646464",
    ['--npc-secondary-darker']: "#262626",
    ['--npc-text-color-1']: "#ffffff",
    ['--npc-text-color-2']: "#9fa3d1",
    ['--npc-background']: "#303030",
    ['--npc-table-1']: "#262a69",
    ['--npc-table-2']: "#050947",
    ['--npc-header-image-color']: "#2442c9a3",
    ['--npc-sidetab-image-color']: "#2442c9a3",

    // PC Sheet
    ['--pc-main']: "#3d0f5c",
    ['--pc-main-light']: "#534d69",
    ['--pc-main-lighter']: "#786188",
    ['--pc-main-dark']: "#2b0e50",
    ['--pc-secondary']: "#c0c0c0",
    ['--pc-secondary-light']: "#dfdfdf",
    ['--pc-secondary-light-alpha']: "#dfdfdfcc",
    ['--pc-secondary-dark']: "#646464",
    ['--pc-secondary-darker']: "#262626",
    ['--pc-text-color-1']: "#ffffff",
    ['--pc-text-color-2']: "#d0c1e2",
    ['--pc-background']: "#303030",
    ['--pc-table-1']: "#573085",
    ['--pc-table-2']: "#290547",
    ['--pc-header-image-color']: "#371452a3",
    ['--pc-sidetab-image-color']: "#371452a3",
    ['--pc-unique-item-color']: "#ac45d5a6",
  }
}