export default class SizeFields extends foundry.data.fields.SchemaField {
  constructor(fromAncestry=false, fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      fromAncestry: new f.BooleanField({required: true, initial: fromAncestry}),
      size: new f.StringField({required: true, initial: "medium"}),
      spaceOccupation: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
      ...fields
    };
    super(fields, options);
  }
}