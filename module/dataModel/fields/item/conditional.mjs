export default class ConditionalFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      hasConditional: new f.BooleanField({required: true, initial: false}),
      name: new f.StringField({required: true, initial: ""}),
      condition: new f.StringField({required: true, initial: ""}),
      useFor: new f.StringField({required: true, initial: ""}),
      linkWithToggle: new f.BooleanField({required: true, initial: false}),
      bonus: new f.StringField({ required: true, initial: "0" }),
    }
    super(fields, options);
  }
}