export default class EffectsConfigFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      toggleable: new f.BooleanField({required: true, initial: false}),
      active: new f.BooleanField({required: true, initial: false}),
      addToChat: new f.BooleanField({required: true, initial: false}),
      ...fields
    }
    super(fields, options);
  }
}