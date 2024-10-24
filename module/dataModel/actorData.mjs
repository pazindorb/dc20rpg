import AttributeFields from "./fields/actor/attributes.mjs";
import AutoRollOutcomeFields from "./fields/actor/autoRollOutcome.mjs";
import ConditionsFields from "./fields/actor/conditions.mjs";
import DamageReductionFields from "./fields/actor/damageReduction.mjs";
import DefenceFields from "./fields/actor/defences.mjs";
import GFModFields from "./fields/actor/GFM.mjs";
import JumpFields from "./fields/actor/jump.mjs";
import LanguageFields from "./fields/actor/language.mjs";
import MasteriesFields from "./fields/masteries.mjs";
import MovementFields from "./fields/actor/movement.mjs";
import PointFields from "./fields/actor/points.mjs";
import ResourceFields from "./fields/actor/resources.mjs";
import RestFields from "./fields/actor/rest.mjs";
import RollLevelFields from "./fields/actor/rollLevel.mjs";
import SenseFields from "./fields/actor/senses.mjs";
import SizeFields from "./fields/actor/size.mjs";
import SkillFields from "./fields/actor/skills.mjs";

class DC20BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return {
      attributes: new AttributeFields(),
      skills: new SkillFields("skill"),
      languages: new LanguageFields(),
      expertise: new f.SchemaField({
        skills: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        trade: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
      defences: new DefenceFields(),
      damageReduction: new DamageReductionFields(),
      conditions: new ConditionsFields(),
      customCondition: new f.StringField({initial: ""}),
      size: new SizeFields(),
      jump: new JumpFields(),
      movement: new MovementFields(),
      senses: new SenseFields(),
      resources: new ResourceFields(),
      exhaustion: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      death: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        stable: new f.BooleanField({required: true, initial: true}),
        treshold: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        doomed: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
      globalFormulaModifiers: new GFModFields(),
      events: new f.ArrayField(new f.StringField(), {required: true}),
      conditionals: new f.ArrayField(new f.StringField(), {required: true}),
      rollLevel: new RollLevelFields(),
      autoRollOutcome: new AutoRollOutcomeFields(),
      mcp: new f.ArrayField(new f.StringField(), {required: true}),
      journal: new f.StringField({required: true, initial: ""})
    }
  }

  static migrateData(source) {
    if (source.vision) {
      source.senses = source.vision;
      delete source.vision;
    }
    return super.migrateData(source);
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
      attributes: new AttributeFields(-2),
      attributePoints: new PointFields(12),
      savePoints: new PointFields(2),
      skillPoints: new f.SchemaField({
        skill: new PointFields(0, {converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
        trade: new PointFields(0,{converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
        knowledge: new PointFields(0,{converted: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 })}),
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
      tradeSkills: new SkillFields("trade"),
      details: new f.SchemaField({
        ancestry: new f.SchemaField({id: new f.StringField({required: true})}, {required: false}),
        background: new f.SchemaField({id: new f.StringField({required: true})}, {required: false}),
        class: new f.SchemaField({
          id: new f.StringField({required: true}),
          maxHpBonus: new f.NumberField({ required: false, integer: true }),
          bonusStamina: new f.NumberField({ required: false, integer: true }),
          bonusMana: new f.NumberField({ required: false, integer: true }),
        }, {required: false}),
        subclass: new f.SchemaField({id: new f.StringField({required: false})}, {required: false}),
        level: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        combatMastery: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        martial: new f.BooleanField({required: true, initial: false}),
        spellcaster: new f.BooleanField({required: true, initial: false}),
        armorEquipped: new f.BooleanField({required: true, initial: false}),
        heavyEquipped: new f.BooleanField({required: true, initial: false}),
        primeAttrKey: new f.StringField({required: false}),
      }),
      size: new SizeFields(true),
      movement: new MovementFields(false),
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
      scaling: new f.ObjectField({required: true}),
      currency: new f.SchemaField({
        cp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        sp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        gp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        pp: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      }),
      masteries: new MasteriesFields(),
      rest: new RestFields()
    });
  } 

  static migrateData(source) {
    return super.migrateData(source);
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
        creatureType: new f.StringField({required: false}),
        category: new f.StringField({required: false}),
        aligment: new f.StringField({required: false}),
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
      masteries: new MasteriesFields(true)
    });
  } 
}

export class DC20CompanionData extends DC20NpcData {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      traits: new f.ObjectField({required: true}),
      companionOwnerId: new f.StringField({required: true, initial: ""}),
      shareWithCompanionOwner: new f.SchemaField({
        attackMod: new f.BooleanField({required: true, initial: true}),
        saveDC: new f.BooleanField({required: true, initial: true}),
        ap: new f.BooleanField({required: true, initial: true}),
        health: new f.BooleanField({required: true, initial: false}),
        combatMastery: new f.BooleanField({required: true, initial: true}),
        masteries: new f.BooleanField({required: true, initial: true}),
        speed: new f.BooleanField({required: true, initial: false}),
        skills: new f.BooleanField({required: true, initial: false}),
        defences: new f.SchemaField({
          mystical: new f.BooleanField({required: true, initial: false}),
          physical: new f.BooleanField({required: true, initial: false}),
        }),
        damageReduction: new f.SchemaField({
          pdr: new f.BooleanField({required: true, initial: false}),
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
      }),
    })
  }
}