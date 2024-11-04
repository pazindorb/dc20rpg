export default class UsesWeaponFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      weaponAttack: new f.BooleanField({required: true, initial: false}),
      weaponId: new f.StringField({required: true, initial: ""}),
      ...fields
    }
    super(fields, options);
  }
}