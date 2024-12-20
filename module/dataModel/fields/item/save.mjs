export default class SaveFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      type: new f.StringField({required: true, initial: "phy"}),
      dc: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
      calculationKey: new f.StringField({required: true, initial: "spell"}),
      addMastery: new f.BooleanField({required: true, initial: false}),
      failEffect: new f.StringField({required: true, initial: ""}), // Left for backward compatibility
      ...fields
    };
    super(fields, options);
  }
}