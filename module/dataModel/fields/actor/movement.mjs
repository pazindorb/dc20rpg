export default class MovementFields extends foundry.data.fields.SchemaField {
  constructor(custom=true, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const movement = () => ({
      useCustom: new f.BooleanField({required: true, initial: custom}),
      fullSpeed: new f.BooleanField({required: true, initial: false}),
      halfSpeed: new f.BooleanField({required: true, initial: false}),
      current: new f.NumberField(init0),
      value: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
    });

    fields = {
      ground: new f.SchemaField({
        useCustom: new f.BooleanField({required: true, initial: custom}),
        current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 5 }),
        value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 5 }),
        bonus: new f.NumberField(init0), 
        label: new f.StringField({initial: "dc20rpg.speed.ground"}),
      }),
      climbing: new f.SchemaField({
        ...movement(),
        label: new f.StringField({initial: "dc20rpg.speed.climbing"}),
      }),
      swimming: new f.SchemaField({
        ...movement(),
        label: new f.StringField({initial: "dc20rpg.speed.swimming"}),
      }),
      burrow: new f.SchemaField({
        ...movement(),
        label: new f.StringField({initial: "dc20rpg.speed.burrow"}),
      }),
      glide: new f.SchemaField({
        ...movement(),
        label: new f.StringField({initial: "dc20rpg.speed.glide"}),
      }),
      flying: new f.SchemaField({
        ...movement(),
        label: new f.StringField({initial: "dc20rpg.speed.flying"}),
      }),
    };
    super(fields, options);
  }
}