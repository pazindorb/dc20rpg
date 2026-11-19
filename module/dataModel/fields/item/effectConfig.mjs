export default class EffectsConfigFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      linkWithToggle: new f.BooleanField({required: true, initial: false}),
      toggleItem: new f.BooleanField({required: true, initial: true}),
      ...fields
    }
    super(fields, options);
  }
}