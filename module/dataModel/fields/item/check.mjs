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
      contestedKey: new f.StringField({required: true, initial: "phy"}), // Left for backward compatibility
      againstDC: new f.BooleanField({required: true, initial: true}),
      checkDC: new f.NumberField({ required: true, nullable: false, integer: true, initial: 10 }),
      respectSizeRules: new f.BooleanField({required: true, initial: false}), // Left for backward compatibility
      failEffect: new f.StringField({required: true, initial: ""}), // Left for backward compatibility
      ...fields
    };
    super(fields, options);
  }
}