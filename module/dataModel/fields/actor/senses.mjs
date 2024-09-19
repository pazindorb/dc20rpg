export default class SenseFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const sense = () => ({
      range: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
      overridenRange: new f.NumberField(init0),
      override: new f.BooleanField({required: true, initial: false})
    });

    fields = {
      darkvision: new f.SchemaField({
        ...sense(),
        label: new f.StringField({initial: "dc20rpg.senses.darkvision"}),
      }),
      tremorsense: new f.SchemaField({
        ...sense(),
        label: new f.StringField({initial: "dc20rpg.senses.tremorsense"}),
      }),
      blindsight: new f.SchemaField({
        ...sense(),
        label: new f.StringField({initial: "dc20rpg.senses.blindsight"}),
      }),
      truesight: new f.SchemaField({
        ...sense(),
        label: new f.StringField({initial: "dc20rpg.senses.truesight"}),
      }),
    };
    super(fields, options);
  }
}