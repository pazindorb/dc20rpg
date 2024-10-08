import { runDefaultColorsUpdate } from "../module/settings/colors.mjs";

export async function runMigration() {


  await runDefaultColorsUpdate();
}