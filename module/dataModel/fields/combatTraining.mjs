export default class CombatTraining extends foundry.data.fields.SchemaField {
  constructor(all=false, fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      weapons: new f.BooleanField({required: true, initial: all}),
      lightShield: new f.BooleanField({required: true, initial: all}),
      heavyShield: new f.BooleanField({required: true, initial: all}),
      lightArmor: new f.BooleanField({required: true, initial: true}),
      heavyArmor: new f.BooleanField({required: true, initial: all}),
      ...fields
    };
    
    super(fields, options);
  }
}