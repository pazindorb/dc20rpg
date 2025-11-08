import AttackFormulaFields from "./fields/item/attackFormula.mjs";
import CheckFields from "./fields/item/check.mjs";
import ConditionalFields from "./fields/item/conditional.mjs";
import EffectsConfigFields from "./fields/item/effectConfig.mjs";
import PropertyFields from "./fields/item/properties.mjs";
import SaveFields from "./fields/item/save.mjs";
import UseCostFields from "./fields/item/useCost.mjs";
import UsesWeaponFields from "./fields/item/usesWeapon.mjs";
import CombatTraining from "./fields/combatTraining.mjs";
import { createNewAdvancement } from "../subsystems/character-progress/advancement/advancements.mjs";
import RollMenu from "./fields/rollMenu.mjs";

class DC20BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      itemKey: new f.StringField({required: true, initial: ""}),
      description: new f.StringField({required: true, initial: ""}),
      shortInfo: new f.StringField({required: true, initial: ""}),
      tableName: new f.StringField({required: true, initial: ""}),
      source: new f.StringField({required: true, initial: ""}),
      choicePointCost: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      requirements: new f.SchemaField({
        level: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
        items: new f.StringField({required: true, initial: ""}),
      }),
      rollMenu: new RollMenu(true),
      hideFromCompendiumBrowser: new f.BooleanField({required: true, initial: false}),
      quickRoll: new f.BooleanField({required: true, initial: false}),
      macros: new f.ObjectField({required: true})
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
      usable: new f.BooleanField({required: true, initial: true, readonly: true}),
      isReaction: new f.BooleanField({required: true, initial: false}),
      help: new f.SchemaField({
        ignoreMHP: new f.BooleanField({required: true, initial: false}),
        subtract: new f.BooleanField({required: true, initial: false}),
        duration: new f.StringField({required: true, initial: "round"}),
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
      }), // Left for backward compatibility remove as part of 0.10
      againstStatuses: new f.ObjectField({required: true}),
      rollRequests: new f.ObjectField({required: true}),
      formulas: new f.ObjectField({required: true}),
      enhancements: new f.ObjectField({required: true}),
      copyEnhancements: new f.SchemaField({
        copy: new f.BooleanField({required: true, initial: false}),
        copyFor: new f.StringField({required: true, initial: ""}),
        linkWithToggle: new f.BooleanField({required: true, initial: false}),
        hideFromRollMenu: new f.BooleanField({required: true, initial: false}), // TODO: backward compatibility remove as part of 0.10
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
        type: new f.StringField({required: true, initial: ""}),
        areas: new f.ObjectField({required: true, initial: {
          default: {
            area: "",
            distance: null,
            width: null,
            unit: "",
            difficult: "",
          }
        }})
      }),
      conditional: new ConditionalFields(), // Left for backward compatibility remove as part of 0.10
      conditionals: new f.ObjectField({required: true}),
      hasAdvancement: new f.BooleanField({required: true, initial: false}),
      provideMartialExpansion: new f.BooleanField({required: true, initial: false}),
      advancements: new f.ObjectField({required: true, initial: {default: createNewAdvancement()}}),
      tip: new f.StringField({required: true, initial: ""}),
    })
  }
}

class DC20ItemItemData extends DC20BaseItemData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      inventory: new f.BooleanField({required: true, initial: true, readonly: true}),
      quantity: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      lootRoll: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      stackable: new f.BooleanField({required: true, initial: false}),
      weight: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      price: new f.SchemaField({
        value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        currency: new f.StringField({required: true, initial: "gp"})
      }),
      infusions: new f.ObjectField({required:true, initial: {}}),
      infusionCostReduction: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
      magicPower: new f.NumberField({required: true, nullable: true, integer: true, initial: null}),
      rarity: new f.StringField({required: true, initial: ""}),
      statuses: new f.SchemaField({
        attuned: new f.BooleanField({required: true, initial: false}),
        equipped: new f.BooleanField({required: true, initial: false}),
        slotLink: new f.SchemaField({
          category: new f.StringField({required: true, initial: ""}),
          key: new f.StringField({required: true, initial: ""}),
          predefined: new f.StringField({required: true, initial: ""}),
        }),
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
      unique: new f.BooleanField({required: true, initial: true, readonly: true}),
      scaling: new f.ObjectField({required: true}),
      advancements: new f.ObjectField({required: true}),
    })
  }
}

export class DC20WeaponData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      weaponStyle: new f.StringField({required: true, initial: ""}),
      weaponType: new f.StringField({required: true, initial: ""}),
      weaponStyleActive: new f.BooleanField({required: true, initial: false}),
      actionType: new f.StringField({required: true, initial: "attack"}),
      properties: new PropertyFields("weapon"),
      formulas: new f.ObjectField({required: true, initial: {
        weaponDamage: {
          formula: "1",
          type: "slashing",
          category: "damage",
          fail: false,
          failFormula: "",
          each5: false,
          each5Formula: "",
          dontMerge: false,
          overrideDefence: "",
        }
      }}),
    })
  }
}

export class DC20EquipmentData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      equipmentType: new f.StringField({required: true, initial: ""}),
      properties: new PropertyFields("equipment"),
    })
  }
}

export class DC20ConsumableData extends DC20ItemUsableMergeData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      stackable: new f.BooleanField({required: true, initial: true}),
      consumableType: new f.StringField({required: true, initial: ""}),
      consume: new f.BooleanField({required: true, initial: true}),
      deleteOnZero: new f.BooleanField({required: true, initial: true}),
      showAsResource: new f.BooleanField({required: true, initial: false}),
      overridenDamageType: new f.StringField({required: true, initial: ""})
    })
  }
}

export class DC20LootData extends DC20ItemItemData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      stackable: new f.BooleanField({required: true, initial: true}),
    });
  }
}

export class DC20ContainerData extends DC20ItemItemData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      contents: new f.ObjectField({required: true}),
      inventoryOnly: new f.BooleanField({required: true, initial: true}),
    });
  }
}

export class DC20FeatureData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      featureType: new f.StringField({required: true, initial: ""}),
      featureOrigin: new f.StringField({required: true, initial: ""}),
      featureSourceItem: new f.StringField({required: true, initial: ""}),
      staminaFeature: new f.BooleanField({required: true, initial: false}),
      flavorFeature: new f.BooleanField({required: true, initial: false}),
      requirements: new f.SchemaField({
        level: new f.NumberField({ required: true, nullable: true, integer: true, initial: 1 }),
        items: new f.StringField({required: true, initial: ""}),
      }),
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

export class DC20InfusionData extends DC20UsableItemData {
  static defineSchema() {
    const f = foundry.data.fields;
  
    return this.mergeSchema(super.defineSchema(), {
      knownLimit: new f.BooleanField({required: true, initial: true}),
      effectsConfig: new EffectsConfigFields(),
      infusion: new f.SchemaField({
        power: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
        variablePower: new f.BooleanField({required: true, initial: false}),
        costReduction: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        tags: new f.SchemaField({
          attunement: new f.SchemaField({
            active: new f.BooleanField({required: true, initial: false}),
            label: new f.StringField({initial: "dc20rpg.infusion.tags.attunement"}),
          }),
          artifact: new f.SchemaField({
            active: new f.BooleanField({required: true, initial: false}),
            label: new f.StringField({initial: "dc20rpg.infusion.tags.artifact"}),
          }),
          consumable: new f.SchemaField({
            active: new f.BooleanField({required: true, initial: false}),
            label: new f.StringField({initial: "dc20rpg.infusion.tags.consumable"}),
          }),
          charges: new f.SchemaField({
            active: new f.BooleanField({required: true, initial: false}),
            label: new f.StringField({initial: "dc20rpg.infusion.tags.charges"}),
          }),
          limited: new f.SchemaField({
            active: new f.BooleanField({required: true, initial: false}),
            label: new f.StringField({initial: "dc20rpg.infusion.tags.limited"}),
          }),
        }),
        copy: new f.SchemaField({
          effects: new f.BooleanField({required: true, initial: false}),
          enhancements: new f.BooleanField({required: true, initial: false}),
          macros: new f.BooleanField({required: true, initial: false}),
          conditionals: new f.BooleanField({required: true, initial: false}),
          formulas: new f.BooleanField({required: true, initial: false}),
          rollRequests: new f.BooleanField({required: true, initial: false}),
          againstStatuses: new f.BooleanField({required: true, initial: false}),
          toggle: new f.BooleanField({required: true, initial: false}),
        }),
      })
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
      combatTraining: new CombatTraining(),
      bannerImg: new f.StringField({required: true, initial: ""}),
      martial: new f.BooleanField({required: true, initial: false}),
      spellcaster: new f.BooleanField({required: true, initial: false}),
      martialExpansion: new f.BooleanField({required: true, initial: false}),
      multiclass: new f.ObjectField({required: true}),
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
      startingEquipment: new f.ObjectField({required: true, initial: {}})
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