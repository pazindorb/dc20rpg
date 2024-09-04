export default class PointFields extends foundry.data.fields.SchemaField {
  constructor(max=0, fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      max: new f.NumberField({ required: true, nullable: false, integer: true, initial: max }),
      extra: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      spent: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      ...fields
    };
    
    super(fields, options);
  }
}