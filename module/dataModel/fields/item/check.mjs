export default class CheckFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      canCrit: new f.BooleanField({required: true, initial: false}),
      checkKey: new f.StringField({required: true, initial: "mar"}),
      multiCheck: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        options: new f.ObjectField({required: true})
      }),
      againstDC: new f.BooleanField({required: true, initial: true}),
      checkDC: new f.NumberField({ required: true, nullable: false, integer: true, initial: 10 }),
      respectSizeRules: new f.BooleanField({required: true, initial: false}),
      ...fields
    };
    super(fields, options);
  }
}