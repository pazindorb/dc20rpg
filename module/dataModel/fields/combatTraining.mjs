export default class CombatTraining extends foundry.data.fields.SchemaField {
  constructor(isNPC=false, fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      weapons: new f.BooleanField({required: true, initial: isNPC}),
      spellFocuses: new f.BooleanField({required: true, initial: isNPC}),
      lightShield: new f.BooleanField({required: true, initial: isNPC}),
      heavyShield: new f.BooleanField({required: true, initial: isNPC}),
      lightArmor: new f.BooleanField({required: true, initial: true}),
      heavyArmor: new f.BooleanField({required: true, initial: isNPC}),
      ...fields
    };
    
    super(fields, options);
  }
}