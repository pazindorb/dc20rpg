export default class JumpFields extends foundry.data.fields.SchemaField {
  constructor(key="agi", fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    fields = {
      current: new f.NumberField(init0),
      value: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
      key: new f.StringField({required: true, initial: key}),
      label: new f.StringField({initial: "dc20rpg.speed.jump"}),
    };
    super(fields, options);
  }
}