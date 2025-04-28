export default class DamageReductionFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const dmgType = (category) => ({
      vulnerable: new f.NumberField(init0),
      resist: new f.NumberField(init0),
      vulnerability: new f.BooleanField({required: true, initial: false}),
      resistance: new f.BooleanField({required: true, initial: false}),
      immune: new f.BooleanField({required: true, initial: false}),
      category: new f.StringField({required: true, initial: category}) 
    });

    fields = {
      flat: new f.NumberField(init0),
      flatHalf: new f.BooleanField({required: true, initial: false}),
      pdr: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        label: new f.StringField({initial: "dc20rpg.damageReduction.pdr"}),
      }),
      edr: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        label: new f.StringField({initial: "dc20rpg.damageReduction.edr"}),
      }),
      mdr: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        label: new f.StringField({initial: "dc20rpg.damageReduction.mdr"}),
      }),
      damageTypes: new f.SchemaField({
        corrosion: new f.SchemaField({
          ...dmgType("elemental"),
          label: new f.StringField({initial: "dc20rpg.reductions.corrosion"})
        }),
        cold: new f.SchemaField({
          ...dmgType("elemental"),
          label: new f.StringField({initial: "dc20rpg.reductions.cold"})
        }),
        fire: new f.SchemaField({
          ...dmgType("elemental"),
          label: new f.StringField({initial: "dc20rpg.reductions.fire"})
        }),
        lightning: new f.SchemaField({
          ...dmgType("elemental"),
          label: new f.StringField({initial: "dc20rpg.reductions.lightning"})
        }),
        poison: new f.SchemaField({
          ...dmgType("elemental"),
          label: new f.StringField({initial: "dc20rpg.reductions.poison"})
        }),
        radiant: new f.SchemaField({
          ...dmgType("mystical"),
          label: new f.StringField({initial: "dc20rpg.reductions.radiant"})
        }),
        psychic: new f.SchemaField({
          ...dmgType("mystical"),
          label: new f.StringField({initial: "dc20rpg.reductions.psychic"})
        }),
        sonic: new f.SchemaField({
          ...dmgType("mystical"),
          label: new f.StringField({initial: "dc20rpg.reductions.sonic"})
        }),
        umbral: new f.SchemaField({
          ...dmgType("mystical"),
          label: new f.StringField({initial: "dc20rpg.reductions.umbral"})
        }),
        piercing: new f.SchemaField({
          ...dmgType("physical"),
          label: new f.StringField({initial: "dc20rpg.reductions.piercing"})
        }),
        slashing: new f.SchemaField({
          ...dmgType("physical"),
          label: new f.StringField({initial: "dc20rpg.reductions.slashing"})
        }),
        bludgeoning: new f.SchemaField({
          ...dmgType("physical"),
          label: new f.StringField({initial: "dc20rpg.reductions.bludgeoning"})
        }),
      }), 
    };
    super(fields, options);
  }
}        