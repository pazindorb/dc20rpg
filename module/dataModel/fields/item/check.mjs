export default class CheckFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      canCrit: new f.BooleanField({required: true, initial: false}),
      checkKey: new f.StringField({required: true, initial: "att"}),
      contestedKey: new f.StringField({required: true, initial: "phy"}),
      checkDC: new f.NumberField({ required: true, nullable: false, integer: true, initial: 10 }),
      failEffect: new f.StringField({required: true, initial: ""}), // Left for backward compatibility
      ...fields
    };
    super(fields, options);
  }
}