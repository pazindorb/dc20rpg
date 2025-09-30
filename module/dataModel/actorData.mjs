import AttributeFields from "./fields/actor/attributes.mjs";
import ConditionsFields from "./fields/actor/conditions.mjs";
import DamageReductionFields from "./fields/actor/damageReduction.mjs";
import DefenceFields from "./fields/actor/defences.mjs";
import GFModFields from "./fields/actor/GFM.mjs";
import JumpFields from "./fields/actor/jump.mjs";
import CombatTraining from "./fields/combatTraining.mjs";
import MovementFields from "./fields/actor/movement.mjs";
import PointFields from "./fields/actor/points.mjs";
import ResourceFields from "./fields/actor/resources.mjs";
import RestFields from "./fields/actor/rest.mjs";
import RollLevelFields from "./fields/actor/rollLevel.mjs";
import SenseFields from "./fields/actor/senses.mjs";
import SizeFields from "./fields/actor/size.mjs";
import SkillFields from "./fields/actor/skills.mjs";
import RollMenu from "./fields/rollMenu.mjs";
import EquipmentSlotFields from "./fields/actor/equipmentSlots.mjs";

class DC20BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      attributes: new AttributeFields(),
      skills: new SkillFields("skill"),
      languages: new SkillFields("language"),
      expertise: new f.SchemaField({
        automated: new f.ArrayField(new f.StringField(), {required: true}),
        manual: new f.ArrayField(new f.StringField(), {required: true}),
        levelIncrease: new f.ArrayField(new f.StringField(), {required: true}),
      }),
      details: new f.SchemaField({}),
      resources: new ResourceFields(false),
      help: new f.SchemaField({
        active: new f.ObjectField({required: true}),
        maxDice: new f.NumberField({required: true, initial: 8})
      }),
      defences: new DefenceFields(),
      damageReduction: new DamageReductionFields(), 
      healingReduction: new f.SchemaField({
        flat: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        flatHalf: new f.BooleanField({required: true, initial: false}),
      }),
      statusResistances: new ConditionsFields(),
      customCondition: new f.StringField({initial: ""}),
      size: new SizeFields(),
      jump: new JumpFields(),
      movement: new MovementFields(),
      senses: new SenseFields(),
      scaling: new f.ObjectField({required: true}),
      currency: new f.SchemaField({
        cp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        sp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        gp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        pp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
      movePoints: new f.NumberField({ required: true, nullable: false, integer: false, initial: 0 }),
      moveCost: new f.NumberField({ required: true, nullable: false, integer: false, initial: 1 }),
      death: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        treshold: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
      saveDC: new f.SchemaField({
        value: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 8 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 8 }),
        }),
        bonus: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
      }),
      attackMod: new f.SchemaField({
        value: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        bonus: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
      }),
      combatTraining: new CombatTraining(),
      rollMenu: new RollMenu(false),
      globalFormulaModifiers: new GFModFields(),
      globalModifier: new f.SchemaField({
        range: new f.SchemaField({
          melee: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          normal: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        allow: new f.SchemaField({ 
          overheal: new f.BooleanField({required: true, initial: false}),
        }),
        prevent: new f.SchemaField({ 
          goUnderAP: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          hpRegeneration: new f.BooleanField({required: true, initial: false}),
        }),
        ignore: new f.SchemaField({
          difficultTerrain: new f.BooleanField({required: true, initial: false}),
          closeQuarters: new f.BooleanField({required: true, initial: false}),
          longRange: new f.BooleanField({required: true, initial: false}),
          flanking: new f.BooleanField({required: true, initial: false})
        }),
        provide: new f.SchemaField({
          halfCover: new f.BooleanField({required: true, initial: false}),
          tqCover: new f.BooleanField({required: true, initial: false}),
        }),
      }),
      events: new f.ArrayField(new f.StringField(), {required: true}),
      conditionals: new f.ArrayField(new f.ObjectField(), {required: true}),
      keywords: new f.ObjectField({required: true}),
      rollLevel: new RollLevelFields(),
      mcp: new f.ArrayField(new f.StringField(), {required: true}),
      sustain: new f.ObjectField({required: true, initial: {}}),
      journal: new f.StringField({required: true, initial: ""}),
      tokenHotbar: new f.SchemaField({
        sectionA: new f.ObjectField({required: true}),
        sectionB: new f.ObjectField({required: true}),
        resource1: new f.ObjectField({required: true}),
        resource2: new f.ObjectField({required: true}),
        resource3: new f.ObjectField({required: true}),
      })
    }
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }
}

export class DC20CharacterData extends DC20BaseActorData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      attributes: new AttributeFields(-2, true),
      attributePoints: new PointFields(12),
      resources: new ResourceFields(true),
      skillPoints: new f.SchemaField({
        skill: new PointFields(0, {converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
        trade: new PointFields(0,{converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
        language: new PointFields(0,{converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
      }),
      known: new f.SchemaField({
        cantrips: new f.SchemaField({
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        spells: new f.SchemaField({
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        maneuvers: new f.SchemaField({
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        techniques: new f.SchemaField({
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
      }),
      tradeSkills: new SkillFields("trade"), // TODO backward compatibilty remove as part of 0.10.0 update
      trades: new SkillFields("trade"),
      details: new f.SchemaField({
        ancestry: new f.SchemaField({id: new f.StringField({required: true})}, {required: true}),
        background: new f.SchemaField({id: new f.StringField({required: true})}, {required: true}),
        class: new f.SchemaField({
          id: new f.StringField({required: true}),
          maxHpBonus: new f.NumberField({ required: true, integer: true, initial: 0, nullable: false }),
          bonusStamina: new f.NumberField({ required: true, integer: true, initial: 0, nullable: false }),
          bonusMana: new f.NumberField({ required: true, integer: true, initial: 0, nullable: false }),
        }, {required: true}),
        subclass: new f.SchemaField({id: new f.StringField({required: true})}, {required: true}),
        level: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        manaSpendLimit: new f.SchemaField({
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }), 
        combatMastery: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        martial: new f.BooleanField({required: true, initial: false}),
        martialExpansionProvided: new f.BooleanField({required: true, initial: false}),
        spellcaster: new f.BooleanField({required: true, initial: false}),
        primeAttrKey: new f.StringField({required: true}),
        advancementInfo: new f.SchemaField({ // BACKWARD COMPATIBILITY: This info was moved to class item - remove after 0.9.7.0
          multiclassTalents: new f.ObjectField({required: true}), 
        })
      }),
      size: new SizeFields(true),
      movement: new MovementFields(false),
      rest: new RestFields(),
      equipmentSlots: new EquipmentSlotFields(),
      tokenHotbar: new f.SchemaField({        
        sectionA: new f.ObjectField({required: true}),
        sectionB: new f.ObjectField({required: true}),
        resource1: new f.ObjectField({required: true, initial: {
          color: "#e1d676",
          key: "stamina",
          label: "Stamina",
        }}),
        resource2: new f.ObjectField({required: true, initial: {
          color: "#81a3e7",
          key: "mana",
          label: "Mana",
        }}),
        resource3: new f.ObjectField({required: true, initial: {
          color: "#991a1aff",
          key: "grit",
          label: "Grit",
        }}),
      })
    });
  } 
}

export class DC20NpcData extends DC20BaseActorData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      defences: new DefenceFields("flat"),
      jump: new JumpFields("flat"),
      details: new f.SchemaField({
        level: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        combatMastery: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        creatureType: new f.StringField({required: true}),
        role: new f.StringField({required: true}),
        aligment: new f.StringField({required: true}),
      }),
      saveDC: new f.SchemaField({
        flat: new f.BooleanField({required: true, initial: false}),
        value: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 8 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 8 }),
        }),
        bonus: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
      }),
      attackMod: new f.SchemaField({
        flat: new f.BooleanField({required: true, initial: false}),
        value: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        bonus: new f.SchemaField({
          spell: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
          martial: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
      }),
      combatTraining: new CombatTraining(true)
    });
  } 
}

export class DC20CompanionData extends DC20NpcData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      attributePoints: new PointFields(8),
      traits: new f.ObjectField({required: true}),
      companionOwnerId: new f.StringField({required: true, initial: ""}),
      shareWithCompanionOwner: new f.SchemaField({
        attackMod: new f.BooleanField({required: true, initial: true}),
        saveDC: new f.BooleanField({required: true, initial: true}),
        ap: new f.BooleanField({required: true, initial: true}),
        health: new f.BooleanField({required: true, initial: false}),
        combatMastery: new f.BooleanField({required: true, initial: true}),
        prime: new f.BooleanField({required: true, initial: true}),
        combatTraining: new f.BooleanField({required: true, initial: true}),
        speed: new f.BooleanField({required: true, initial: false}),
        skills: new f.BooleanField({required: true, initial: false}),
        defences: new f.SchemaField({
          area: new f.BooleanField({required: true, initial: false}),
          precision: new f.BooleanField({required: true, initial: false}),
        }),
        damageReduction: new f.SchemaField({
          pdr: new f.BooleanField({required: true, initial: false}),
          edr: new f.BooleanField({required: true, initial: false}),
          mdr: new f.BooleanField({required: true, initial: false}),
        }),
        attributes: new f.SchemaField({
          mig: new f.BooleanField({required: true, initial: false}),
          agi: new f.BooleanField({required: true, initial: false}),
          cha: new f.BooleanField({required: true, initial: false}),
          int: new f.BooleanField({required: true, initial: false}),
        }),
        saves: new f.SchemaField({
          mig: new f.BooleanField({required: true, initial: false}),
          agi: new f.BooleanField({required: true, initial: false}),
          cha: new f.BooleanField({required: true, initial: false}),
          int: new f.BooleanField({required: true, initial: false}),
        }),
        mcp: new f.BooleanField({required: true, initial: false}),
        initiative: new f.BooleanField({required: true, initial: false}),
      }),
    })
  }
}

export class DC20StorageData extends DC20BaseActorData {
    static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      randomLoot: new f.SchemaField({
        numberOfItems: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
        rollDice: new f.NumberField({ required: true, nullable: false, integer: true, initial: 100 }),
      }),
      vendor: new f.SchemaField({
        allowSelling: new f.BooleanField({required: true, initial: false}),
        sellCostPercent: new f.NumberField({ required: true, nullable: false, integer: true, initial: 30 }),
        infiniteStock: new f.BooleanField({required: true, initial: false}),
      }),
      storageType: new f.StringField({required: true, initial: ""}),
    });
  }
}