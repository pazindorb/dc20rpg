export default class SizeFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      size: new f.StringField({required: true, initial: "medium"}),               // TODO: Remove as part of 0.12.0
      category: new f.NumberField({ required: true, nullable: true, integer: true, initial: 2 }),
      spaceOccupation: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      increaseBy: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
      ...fields
    };
    super(fields, options);
  }
}