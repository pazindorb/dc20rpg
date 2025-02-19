export default class ConditionsFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const condition = () => ({
      advantage: new f.NumberField(init0),
      immunity: new f.BooleanField({required: true, initial: false}),
    });

    fields = {
      magical: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.magical"})
      }),
      movement: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.movement"})
      }),
      charmed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.charmed"})
      }),
      burning: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.burning"})
      }),
      bleeding: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.bleeding"})
      }),
      poisoned: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.poisoned"})
      }),
      taunted: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.taunted"})
      }),
      deafened: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.deafened"})
      }),
      blinded: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.blinded"})
      }),
      intimidated: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.intimidated"})
      }),
      rattled: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.rattled"})
      }),
      frightened: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.frightened"})
      }),
      slowed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.slowed"})
      }),
      grappled: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.grappled"})
      }),
      exposed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.exposed"})
      }),
      hindered: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.hindered"})
      }),
      restrained: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.restrained"})
      }),
      prone: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.prone"})
      }),
      incapacitated: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.incapacitated"})
      }),
      stunned: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.stunned"})
      }),
      paralyzed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.paralyzed"})
      }),
      unconscious: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.unconscious"})
      }),
      petrified: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.petrified"})
      }),
      surprised: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.surprised"})
      }),
      doomed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.doomed"})
      }),
      exhaustion: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.exhaustion"})
      }),
      impaired: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.impaired"})
      }),
      heavilyImpaired: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.heavilyImpaired"})
      }),
      dazed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.dazed"})
      }),
      heavilyDazed: new f.SchemaField({
        ...condition(),
        label: new f.StringField({initial: "dc20rpg.conditions.heavilyDazed"})
      }),
    };
    super(fields, options);
  }
}        