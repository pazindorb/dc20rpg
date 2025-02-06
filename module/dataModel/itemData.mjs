import AttackFormulaFields from "./fields/item/attackFormula.mjs";
import CheckFields from "./fields/item/check.mjs";
import ConditionalFields from "./fields/item/conditional.mjs";
import EffectsConfigFields from "./fields/item/effectConfig.mjs";
import PropertyFields from "./fields/item/properties.mjs";
import SaveFields from "./fields/item/save.mjs";
import UseCostFields from "./fields/item/useCost.mjs";
import UsesWeaponFields from "./fields/item/usesWeapon.mjs";
import CombatTraining from "./fields/combatTraining.mjs";

class DC20BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      itemKey: new f.StringField({required: true, initial: ""}),
      description: new f.StringField({required: true, initial: ""}),
      tableName: new f.StringField({required: true, initial: ""}),
      source: new f.StringField({required: true, initial: ""}),
      choicePointCost: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      hideFromCompendiumBrowser: new f.BooleanField({required: true, initial: false}),
      quickRoll: new f.BooleanField({required: true, initial: false}),
      macros: new f.SchemaField({
        onDemandMacroTitle: new f.StringField({required: true, initial: "Run On Demand Macro"}),
        onDemand: new f.StringField({required: true, initial: ""}),
        onCreate: new f.StringField({required: true, initial: ""}),
        preDelete: new f.StringField({required: true, initial: ""}),
        onRollPrompt: new f.StringField({required: true, initial: ""}),
        preItemCost: new f.StringField({required: true, initial: ""}),
        preItemRoll: new f.StringField({required: true, initial: ""}),
        postItemRoll: new f.StringField({required: true, initial: ""}),
        postChatMessageCreated: new f.StringField({required: true, initial: ""}),
        onItemToggle: new f.StringField({required: true, initial: ""}),
        rollLevelCheck: new f.StringField({required: true, initial: ""}),
        enhancementReset: new f.StringField({required: true, initial: ""}),
        customTrigger: new f.StringField({required: true, initial: ""})
      })
    }
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }

  static migrateData(source) {
    if (source.effectsConfig?.toggleable) {
      const effectConfig = source.effectsConfig;
      source.toggle = {
        toggleable: true,
        toggledOn: false,
        toggleOnRoll: false
      }
      source.effectsConfig.linkWithToggle = effectConfig.toggleable;
      delete source.effectsConfig.toggleable
      if (source.conditional?.connectedToEffects) {
        source.conditional.linkWithToggle = source.conditional.connectedToEffects;
        delete source.conditional.connectedToEffects;
      }
    }
    super.migrateData(source);
  }
}

class DC20UsableItemData extends DC20BaseItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      isReaction: new f.BooleanField({required: true, initial: false}),
      help: new f.SchemaField({
        ignoreMHP: new f.BooleanField({required: true, initial: false}),
        subtract: new f.BooleanField({required: true, initial: false}),
      }),
      toggle: new f.SchemaField({
        toggleable: new f.BooleanField({required: true, initial: false}),
        toggledOn: new f.BooleanField({required: true, initial: false}),
        toggleOnRoll: new f.BooleanField({required: true, initial: false}),
      }),
      actionType: new f.StringField({required: true, initial: ""}),
      attackFormula: new AttackFormulaFields(),
      check: new CheckFields(),
      save: new SaveFields(),
      costs: new UseCostFields(),
      againstEffect: new f.SchemaField({
        id: new f.StringField({required: true, initial: ""}),
        supressFromChatMessage: new f.BooleanField({required: true, initial: false}),
        untilYourNextTurnStart: new f.BooleanField({required: true, initial: false}),
        untilYourNextTurnEnd: new f.BooleanField({required: true, initial: false}),
        untilTargetNextTurnStart: new f.BooleanField({required: true, initial: false}),
        untilTargetNextTurnEnd: new f.BooleanField({required: true, initial: false}),
        untilFirstTimeTriggered: new f.BooleanField({required: true, initial: false}),
      }), // Left for backward compatibility
      againstStatuses: new f.ObjectField({required: true}),
      rollRequests: new f.ObjectField({required: true}),
      formulas: new f.ObjectField({required: true}), // TODO: Make specific formula config?
      enhancements: new f.ObjectField({required: true}), // TODO: Make specific enh config?
      copyEnhancements: new f.SchemaField({
        copy: new f.BooleanField({required: true, initial: false}),
        copyFor: new f.StringField({required: true, initial: ""}),
        linkWithToggle: new f.BooleanField({required: true, initial: false}),
        hideFromRollMenu: new f.BooleanField({required: true, initial: false}),
      }),
      range: new f.SchemaField({
        melee: new f.NumberField({ required: true, nullable: true, integer: true, initial: 1 }),
        normal: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
        max: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
        unit: new f.StringField({required: true, initial: ""}),
      }),
      duration: new f.SchemaField({
        value: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
        type: new f.StringField({required: true, initial: ""}),
        timeUnit: new f.StringField({required: true, initial: ""}),
      }),
      target: new f.SchemaField({
        count: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
        invidual: new f.BooleanField({required: true, initial: true}),
        type: new f.StringField({required: true, initial: ""}),
        areas: new f.ObjectField({required: true, initial: {
          default: {
            area: "",
            distance: null,
            width: null,
            unit: "",
            difficult: false,
          }
        }})
      }),
      conditional: new ConditionalFields(),
      hasAdvancement: new f.BooleanField({required: false, initial: false}),
      advancements: new f.ObjectField({required: true, initial: {
        default: {
          name: "Item Advancement",
          mustChoose: false,
          pointAmount: 1,
          level: 0,
          applied: false,
          talent: false,
          repeatable: false,
          repeatAt: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          allowToAddItems: false,
          additionalAdvancement: true,
          compendium: "",
          preFilters: "",
          items: {}
        }
      }})
    })
  }
}

class DC20ItemItemData extends DC20BaseItemData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      quantity: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      weight: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      price: new f.SchemaField({
        value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        currency: new f.StringField({required: true, initial: "gp"})
      }),
      rarity: new f.StringField({required: true, initial: ""}),
      statuses: new f.SchemaField({
        attuned: new f.BooleanField({required: true, initial: false}),
        equipped: new f.BooleanField({required: true, initial: false}),
        identified: new f.BooleanField({required: true, initial: true}),
      }),
      properties: new PropertyFields(),
      effectsConfig: new EffectsConfigFields({mustEquip: new f.BooleanField({required: true, initial: true})})
    })
  }
}

class DC20ItemUsableMergeData extends DC20BaseItemData {
  static defineSchema() {
    const itemData = DC20ItemItemData.defineSchema();
    const usableData = DC20UsableItemData.defineSchema();

    return {
      ...itemData,
      ...usableData,
    }
  }
}

class DC20UniqueItemData extends DC20BaseItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      scaling: new f.ObjectField({required: true}),
      advancements: new f.ObjectField({required: true}), // TODO: Make specific advancement config?
    })
  }

  static migrateData(source) {
    if (source.advancements) {
      const entries = Object.entries(source.advancements);
      for (const [key, advancement] of entries) {
        if (advancement.repeatAt === undefined) {
          source.advancements[key].repeatAt = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        }
      }
    }
    return super.migrateData(source);
  }
}

export class DC20WeaponData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      weaponStyle: new f.StringField({required: true, initial: ""}),
      weaponType: new f.StringField({required: true, initial: ""}),
      weaponStyleActive: new f.BooleanField({required: true, initial: false}),
      properties: new PropertyFields("weapon"),
    })
  }
}

export class DC20EquipmentData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      armorBonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      armorPdr: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      equipmentType: new f.StringField({required: true, initial: ""}),
      properties: new PropertyFields("equipment"),
    })
  }
}

export class DC20ConsumableData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      consumableType: new f.StringField({required: true, initial: ""}),
      consume: new f.BooleanField({required: true, initial: true}),
      deleteOnZero: new f.BooleanField({required: true, initial: true}),
      showAsResource: new f.BooleanField({required: true, initial: false}),
    })
  }
}

export class DC20LootData extends DC20ItemItemData {
  static defineSchema() {
    return super.defineSchema();
  }
}

export class DC20FeatureData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      featureType: new f.StringField({required: true, initial: ""}),
      featureOrigin: new f.StringField({required: true, initial: ""}),
      isResource: new f.BooleanField({required: true, initial: false}),
      resource: new f.SchemaField({
        name: new f.StringField({required: true, initial: ""}),
        resourceKey: new f.StringField({required: true, initial: "key"}),
        reset: new f.StringField({required: true, initial: ""}),
        useStandardTable: new f.BooleanField({required: true, initial: true}),
        customMaxFormula: new f.StringField({required: true, initial: ""}),
        values: new f.ArrayField(
          new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }), {
            required: true,
            initial: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
          }),
      }),
      usesWeapon: new UsesWeaponFields(),
      effectsConfig: new EffectsConfigFields()
    })
  }
}

export class DC20BasicActionData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      category: new f.StringField({required: true, initial: ""}),
      hideFromCompendiumBrowser: new f.BooleanField({required: true, initial: true}),
      effectsConfig: new EffectsConfigFields()
    })
  }
}

export class DC20TechniqueData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      techniqueType: new f.StringField({required: true, initial: ""}),
      techniqueOrigin: new f.StringField({required: true, initial: ""}),
      knownLimit: new f.BooleanField({required: true, initial: true}),
      usesWeapon: new UsesWeaponFields(),
      effectsConfig: new EffectsConfigFields()
    })
  }
}

export class DC20SpellData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      spellType: new f.StringField({required: true, initial: ""}),
      spellOrigin: new f.StringField({required: true, initial: ""}),
      magicSchool: new f.StringField({required: true, initial: ""}),
      knownLimit: new f.BooleanField({required: true, initial: true}),
      attackFormula: new AttackFormulaFields({checkType: new f.StringField({required: true, initial: "spell"})}),
      usesWeapon: new UsesWeaponFields(),
      effectsConfig: new EffectsConfigFields(),
      spellLists: new f.SchemaField({
        arcane: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          label: new f.StringField({initial: "dc20rpg.spellList.arcane"})
        }),
        divine: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          label: new f.StringField({initial: "dc20rpg.spellList.divine"})
        }),
        primal: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          label: new f.StringField({initial: "dc20rpg.spellList.primal"})
        }),
      }),
      components: new f.SchemaField({
        verbal: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          char: new f.StringField({required: true, initial: "V"}),
          label: new f.StringField({initial: "dc20rpg.spellComponent.verbal"})
        }),
        somatic: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          char: new f.StringField({required: true, initial: "S"}),
          label: new f.StringField({initial: "dc20rpg.spellComponent.somatic"})
        }),
        material: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: false}),
          char: new f.StringField({required: true, initial: "M"}),
          description: new f.StringField({required: true, initial: ""}),
          cost: new f.StringField({required: true, initial: ""}),
          consumed: new f.BooleanField({required: true, initial: false}),
          label: new f.StringField({initial: "dc20rpg.spellComponent.material"})
        })
      }),
      tags: new f.SchemaField({
        fire: new f.SchemaField({
          active: new f.BooleanField({required: true, initial: true}),
          label: new f.StringField({initial: "dc20rpg.spellTags.fire"})
        }),
      }),
    })
  }
}

export class DC20ClassData extends DC20UniqueItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      classSpecialId: new f.StringField({required: true, initial: ""}),
      level: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      combatTraining: new CombatTraining(),
      bannerImg: new f.StringField({required: false, initial: ""}),
      martial: new f.BooleanField({required: true, initial: false}),
      spellcaster: new f.BooleanField({required: true, initial: false}),
      talentMasteries: new f.ArrayField(
        new f.StringField({required: true, initial: ""}), {
          required: true,
          initial: ["","","","","","","","","","","","","","","","","","","",""]
      }),
      scaling: new f.ObjectField({required: true, initial: {
        maxHpBonus: {
          label: "dc20rpg.scaling.maxHpBonus",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        bonusStamina: {
          label: "dc20rpg.scaling.bonusStamina",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        bonusMana: {
          label: "dc20rpg.scaling.bonusMana",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        skillPoints: {
          label: "dc20rpg.scaling.skillPoints",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        tradePoints: {
          label: "dc20rpg.scaling.tradePoints",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        attributePoints: {
          label: "dc20rpg.scaling.attributePoints",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        maneuversKnown: {
          label: "dc20rpg.scaling.maneuversKnown",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        techniquesKnown: {
          label: "dc20rpg.scaling.techniquesKnown",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        cantripsKnown: {
          label: "dc20rpg.scaling.cantripsKnown",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        },
        spellsKnown: {
          label: "dc20rpg.scaling.spellsKnown",
          values: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        }
      }}),
      startingEquipment: new f.SchemaField({
        weapons: new f.StringField({required: true, initial: ""}),
        armor: new f.StringField({required: true, initial: ""}),
        other: new f.StringField({required: true, initial: ""})
      }),
      maneuversProvided: new f.BooleanField({required: true, initial: false}),
    })
  }
}

export class DC20SubclassData extends DC20UniqueItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      forClass: new f.SchemaField({
        classSpecialId: new f.StringField({required: true, initial: ""}),
        name: new f.StringField({required: true, initial: ""}),
      })
    })
  }
}

export class DC20AncestryData extends DC20UniqueItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      movement: new f.SchemaField({
        speed: new f.NumberField({ required: true, nullable: false, integer: true, initial: 5 })
      })
    })
  }

  static migrateData(source) {
    if (source.size) {
      delete source.size;
    }
    return super.migrateData(source);
  }
}

export class DC20BackgroundData extends DC20UniqueItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      skillPoints: new f.NumberField({ required: true, nullable: false, integer: true, initial: 5 }),
      tradePoints: new f.NumberField({ required: true, nullable: false, integer: true, initial: 3 }),
      langPoints: new f.NumberField({ required: true, nullable: false, integer: true, initial: 2 }),
    })
  }
}