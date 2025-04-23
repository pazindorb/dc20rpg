export default class ConditionsFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const condition = () => ({
      resistance: new f.NumberField(init0),
      vulnerability: new f.NumberField(init0),
      immunity: new f.BooleanField({required: true, initial: false}),
    });

    fields = {
      magical: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.magical"})
      }),
      curse: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.curse"})
      }),
      movement: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.movement"})
      }),
      bleeding: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.bleeding"})
      }),
      blinded: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.blinded"})
      }),
      burning: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.burning"})
      }),
      charmed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.charmed"})
      }),
      dazed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.dazed"})
      }),
      deafened: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.deafened"})
      }),
      disoriented: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.disoriented"})
      }),
      doomed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.doomed"})
      }),
      exhaustion: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.exhaustion"})
      }),
      exposed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.exposed"})
      }),
      frightened: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.frightened"})
      }),
      grappled: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.grappled"})
      }),
      hindered: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.hindered"})
      }),
      impaired: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.impaired"})
      }),
      immobilized: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.immobilized"})
      }),
      incapacitated: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.incapacitated"})
      }),
      intimidated: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.intimidated"})
      }),
      paralyzed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.paralyzed"})
      }),
      petrified: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.petrified"})
      }),
      prone: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.prone"})
      }),
      poisoned: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.poisoned"})
      }),
      restrained: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.restrained"})
      }),
      slowed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.slowed"})
      }),
      stunned: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.stunned"})
      }),
      surprised: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.surprised"})
      }),
      taunted: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.taunted"})
      }),
      tethered: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.tethered"})
      }),
      terrified: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.terrified"})
      }),
      unconscious: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.unconscious"})
      }),
      weakened: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.weakened"})
      }),
    };
    super(fields, options);
  }
}        