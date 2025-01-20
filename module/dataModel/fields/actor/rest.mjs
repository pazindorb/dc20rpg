export default class RestFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      longRest: new f.SchemaField({
        exhSaveDC: new f.NumberField({ required: true, nullable: false, integer: true, initial: 10 }),
        half: new f.BooleanField({required: true, initial: false}),
        noActivity: new f.BooleanField({required: true, initial: false}),
      }),
      ...fields
    };
    
    super(fields, options);
  }
}