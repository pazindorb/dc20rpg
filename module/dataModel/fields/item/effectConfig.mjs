export default class EffectsConfigFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      linkWithToggle: new f.BooleanField({required: true, initial: false}),
      toggleItem: new f.BooleanField({required: true, initial: true}),
      addToTemplates: new f.StringField({required: true, initial: ""}), // TODO backward compatibilty remove as part of 0.11.0 update
      ...fields
    }
    super(fields, options);
  }
}