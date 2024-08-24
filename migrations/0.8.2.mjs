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
    _updateGlobalFormulaModifier(actor);
    for (const item of actor.items) {
      _updateItemEnhancements(item);
    }
  }

  // Iterate over tokens
  for (const actor of Object.values(game.actors.tokens)) {
    _updateGlobalFormulaModifier(actor);
    for (const item of actor.items) {
      _updateItemEnhancements(item);
    }
  }

  // Iterate over compendium actors
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world" 
        && !compendium.locked
        && compendium.documentClass === DC20RpgActor 
    ) {
      const content = await compendium.getDocuments();
      for(const actor of content) {
        _updateGlobalFormulaModifier(actor);
        for (const item of actor.items) {
          _updateItemEnhancements(item);
        }
      }
    }
  }
}

async function _migrateItems() {
  // Iterate over items on world
  for (const item of game.items) {
    _updateItemEnhancements(item);
  }

  // Iterate over compendium items
  for (const compendium of game.packs) {
    if (compendium.metadata.packageType === "world" 
        && !compendium.locked
        && compendium.documentClass === DC20RpgItem 
    ) {
      const content = await compendium.getDocuments();
      for(const item of content) {
        _updateItemEnhancements(item);
      }
    }
  }
}

function _updateGlobalFormulaModifier(actor) {
  actor.update({
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

function _updateItemEnhancements(item) {
  const enhs = getValueFromPath(item, "system.enhancements");
  if (!enhs) return;
  for(const [key, enh] of Object.entries(enhs)) {
    enh.charges = {
      consume: false,
      fromOriginal: false,
      originalId: item.id
    };
    enh.addsNewFormula = false;
    enh.formula = {
      formula: "",
      type: "",
      category: "damage",
    };
    enh.overrideDamageType = false;
    enh.damageType = "";
    enhs[key] = enh;
  }
  item.update({["system.enhancements"]: enhs});
}