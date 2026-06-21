export default class EffectsConfigFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      linkWithToggle: new f.BooleanField({required: true, initial: false}),
      toggleItem: new f.BooleanField({required: true, initial: true}),
      addToChat: new f.BooleanField({required: true, initial: false}), // TODO backward compatibilty remove as part of 0.10.5 update
      addToTemplates: new f.StringField({required: true, initial: ""}), // TODO backward compatibilty remove as part of 0.11.0 update
      ...fields
    }
    super(fields, options);
  }
}