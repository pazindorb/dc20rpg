export default class ConditionsFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const condition = () => ({
      resistance: new f.BooleanField({required: true, initial: false}),
      vulnerability: new f.BooleanField({required: true, initial: false}),
      immunity: new f.BooleanField({required: true, initial: false}),
    });

    fields = {
      magical: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.magical"})
      }),
      cursed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.cursed"})
      }),
      poisoned: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.poisoned"})
      }),
      diseased: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.diseased"})
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
      intimidated: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.intimidated"})
      }),
      prone: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.prone"})
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
      unconscious: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.unconscious"})
      }),
    };
    super(fields, options);
  }
}        