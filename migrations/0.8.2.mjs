import { DC20RpgActor } from "../module/documents/actor.mjs";
import { DC20RpgItem } from "../module/documents/item.mjs";
import { getValueFromPath } from "../module/helpers/utils.mjs";

export async function runMigration() {
  await _migrateActors();
  await _migrateItems();
}

async function _migrateActors() {
  // Iterate over actors
  for (const actor of game.actors) {
    await _updateGlobalFormulaModifier(actor);
    await _updateConditionImmunities(actor);
    for (const item of actor.items) {
      await _updateItemEnhancements(item);
    }
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    await _updateGlobalFormulaModifier(actor);
    await _updateConditionImmunities(actor);
    for (const item of actor.items) {
      await _updateItemEnhancements(item);
    }
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentClass === DC20RpgActor
    ) {
      const content = await compendium.getDocuments();
      for (const actor of content) {
        await _updateGlobalFormulaModifier(actor);
        await _updateConditionImmunities(actor);
        for (const item of actor.items) {
          await _updateItemEnhancements(item);
        }
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over items on world
  for (const item of game.items) {
    await _updateItemEnhancements(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world"
      && !compendium.locked
      && compendium.documentClass === DC20RpgItem
    ) {
      const content = await compendium.getDocuments();
      for (const item of content) {
        await _updateItemEnhancements(item);
      }
    }
  }
}

async function _updateGlobalFormulaModifier(actor) {
  await actor.update({
    ["system.globalFormulaModifiers"]: {
      attributeCheck: [],
      attackCheck: [],
      spellCheck: [],
      skillCheck: [],
      tradeCheck: [],
      save: [],
      attackDamage: {
        martial: {
          melee: [],
          ranged: []
        },
        spell: {
          melee: [],
          ranged: []
        }
      },
      healing: []
    }
  });
}

async function _updateConditionImmunities(actor) {
  await actor.update({
    [`system.conditions.-=grapple`]: null,
    [`system.conditions.-=impared`]: null
  });
}

async function _updateItemEnhancements(item) {
  const enhs = getValueFromPath(item, "system.enhancements");
  if (!enhs) return;
  for (const [key, enh] of Object.entries(enhs)) {
    if (!enh.charges) {
      enh.charges = {
        consume: false,
        fromOriginal: false,
        originalId: item.id
      };
    }

    if (!enh.modifications.formula) {
      enh.modifications = {
        addsNewFormula: false,
        formula: {
          formula: "",
          type: "",
          category: "damage",
        },
        overrideDamageType: false,
        damageType: ""
      }
    }
    enhs[key] = enh;
  }
  await item.update({ ["system.enhancements"]: enhs });
}