import AttackFormulaFields from "./fields/item/attackFormula.mjs";
import CheckFields from "./fields/item/check.mjs";
import ConditionalFields from "./fields/item/conditional.mjs";
import EffectsConfigFields from "./fields/item/effectConfig.mjs";
import PropertyFields from "./fields/item/properties.mjs";
import SaveFields from "./fields/item/save.mjs";
import UseCostFields from "./fields/item/useCost.mjs";
import UsesWeaponFields from "./fields/item/usesWeapon.mjs";
import MasteriesFields from "./fields/masteries.mjs";

class DC20BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      description: new f.StringField({required: true, initial: ""}),
      tableName: new f.StringField({required: true, initial: ""}),
      source: new f.StringField({required: true, initial: ""}),
    }
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }
}

class DC20UsableItemData extends DC20BaseItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      isReaction: new f.BooleanField({required: true, initial: false}),
      actionType: new f.StringField({required: true, initial: ""}),
      attackFormula: new AttackFormulaFields(),
      check: new CheckFields(),
      save: new SaveFields(),
      costs: new UseCostFields(),
      formulas: new f.ObjectField({required: true}), // TODO: Make specific formula config?
      enhancements: new f.ObjectField({required: true}), // TODO: Make specific enh config?
      copyEnhancements: new f.SchemaField({
        copy: new f.BooleanField({required: true, initial: false}),
        copyFor: new f.StringField({required: true, initial: ""}),
      }),
      range: new f.SchemaField({
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
            unit: ""
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
          allowToAddItems: false,
          additionalAdvancement: true,
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
      effectsConfig: new f.SchemaField({
        mustEquip: new f.BooleanField({required: true, initial: true}),
        addToChat: new f.BooleanField({required: true, initial: false}),
      })
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
}

export class DC20WeaponData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      weaponStyle: new f.StringField({required: true, initial: ""}),
      weaponType: new f.StringField({required: true, initial: ""}),
      properties: new PropertyFields("weapon"),
    })
  }
}

export class DC20EquipmentData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      armorBonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
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

export class DC20ToolData extends DC20ItemItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      tradeSkillKey: new f.StringField({required: true, initial: ""}),
      actionType: new f.StringField({required: true, initial: "tradeSkill"}),
      rollBonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
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
      level: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      masteries: new MasteriesFields(),
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
      })
    })
  }
}

export class DC20SubclassData extends DC20UniqueItemData {
  static defineSchema() {
    return super.defineSchema();
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