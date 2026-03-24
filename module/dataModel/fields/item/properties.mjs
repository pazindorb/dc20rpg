export default class PropertyFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    Object.entries(CONFIG.DC20RPG.PROPERTIES).forEach(([key, prop]) => {
      fields[key] = new f.ObjectField({required: true, initial: prop});
    })
    super(fields, options);
  }
}