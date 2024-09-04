export default class RestFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      restPoints: new f.SchemaField({
        current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        maxFormula: new f.StringField({ required: true, initial: "max(@mig, 0) + @level + @system.rest.restPoints.bonus" }),
      }),
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