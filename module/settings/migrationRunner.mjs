const versions = ["0.8.1-hf2", "0.8.2", "0.8.2-hf1", "0.8.3"]

export async function runMigrationCheck() {
  const lastMigratedVersion = game.settings.get("dc20rpg", "lastMigration");
  const currentVersion = game.system.version;

  const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
  if (!lastMigratedVersion && totalDocuments === 0) {
    // It is a new world that does not need migration
    game.settings.set("dc20rpg", "lastMigration", currentVersion);
  }
  else if (!lastMigratedVersion) {
    // This world was created before migration scripts were introduced. We want to run all the scripts
    ui.notifications.notify(`System migration started, please wait`);
    await _runMigration("0.8.1-hf2", currentVersion);
    ui.notifications.notify(`System migration finished`);
  }
  else if (_requiresMigration(lastMigratedVersion, currentVersion)) {
    ui.notifications.notify(`System migration started, please wait`);
    await _runMigration(lastMigratedVersion, currentVersion);
    ui.notifications.notify(`System migration finished`);
  }
}

export async function testMigration(last, current) {
  await _runMigration(last, current, true);
}

function _requiresMigration(lastMigration, currentVersion) {
  const last = versions.indexOf(lastMigration);
  const current = versions.indexOf(currentVersion);
  return current > last;
}

async function _runMigration(lastMigration, currentVersion, test) {
  const after = versions.indexOf(lastMigration);
  const until = versions.indexOf(currentVersion);

  for (let i = after + 1; i <= until; i++) {
    const migratingTo = versions[i];
    ui.notifications.notify(`Running system migration for version: ${migratingTo}`);
    try {
      const migrationPath = test ? `../../migrations/${migratingTo}.mjs` : `../migrations/${migratingTo}.mjs`
      const migrationModule = await import(migrationPath);
      await migrationModule.runMigration();
      if (!test) await game.settings.set("dc20rpg", "lastMigration", migratingTo);
      ui.notifications.notify(`Finished system migration for version: ${migratingTo}`);
    }
    catch (e) {
      ui.notifications.error(`System migration for version '${migratingTo}' failed with: ${e}`);
    } 
  }
}