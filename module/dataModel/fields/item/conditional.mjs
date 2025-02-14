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
      flags: new f.SchemaField({
        ignorePdr: new f.BooleanField({required: true, initial: false}),
        ignoreMdr: new f.BooleanField({required: true, initial: false}),
        ignoreResistance: new f.ObjectField({required: true}),
        ignoreImmune: new f.ObjectField({required: true}),
      }),
      effect: new f.ObjectField({required: true, nullable: true, initial: null}),
      addsNewRollRequest: new f.BooleanField({required: true, initial: false}),
      rollRequest: new f.SchemaField({
        category: new f.StringField({required: true, initial: ""}),
        saveKey: new f.StringField({required: true, initial: ""}),
        contestedKey: new f.StringField({required: true, initial: ""}),
        dcCalculation: new f.StringField({required: true, initial: ""}),
        dc: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        addMasteryToDC: new f.BooleanField({required: true, initial: true}),
        respectSizeRules: new f.BooleanField({required: true, initial: false}),
      }),
    }
    super(fields, options);
  }
}