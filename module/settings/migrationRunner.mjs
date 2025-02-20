const versions = [
                  "0.8.1-hf2", "0.8.2", "0.8.2-hf1", "0.8.3", "0.8.4", "0.8.4-hf1", "0.8.5", 
                  "0.9.0", "0.9.1"
                ];

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
    await _runMigration("0.8.1-hf2", currentVersion);
  }
  else if (_requiresMigration(lastMigratedVersion, currentVersion)) {
    await _runMigration(lastMigratedVersion, currentVersion);
  }
}

export async function testMigration(last, current, migrateModules) {
  await _runMigration(last, current, true,  migrateModules, true);
}

export async function forceRunMigration(fromVersion, toVersion, migrateModules) {
  await _runMigration(fromVersion, toVersion, true, migrateModules, false);
}

function _requiresMigration(lastMigration, currentVersion) {
  const last = versions.indexOf(lastMigration);
  const current = versions.indexOf(currentVersion);
  return current > last;
}

async function _runMigration(lastMigration, currentVersion, skipLastMigrationValueUpdate=false, migrateModules=new Set(), testPath=false) {
  const after = versions.indexOf(lastMigration);
  const until = versions.indexOf(currentVersion);

  for (let i = after + 1; i <= until; i++) {
    const migratingTo = versions[i];
    ui.notifications.notify(`Running system migration for version: ${migratingTo}`, {permanent: true});
    try {
      const migrationPath = testPath ? `../../migrations/${migratingTo}.mjs` : `../migrations/${migratingTo}.mjs`
      const migrationModule = await import(migrationPath);
      await migrationModule.runMigration(migrateModules);
      if (!skipLastMigrationValueUpdate) await game.settings.set("dc20rpg", "lastMigration", migratingTo);
      ui.notifications.notify(`Finished system migration for version: ${migratingTo}`, {permanent: true});
    }
    catch (e) {
      ui.notifications.error(`System migration for version '${migratingTo}' failed with: ${e}`, {permanent: true});
    } 
  }
}