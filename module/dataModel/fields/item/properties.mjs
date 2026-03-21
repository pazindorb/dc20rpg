export default class PropertyFields extends foundry.data.fields.SchemaField {
  constructor(itemType="", fields={}, options={}) {
    _preparePropertiesFor(itemType, fields);
    super(fields, options);
  }
}

function _preparePropertiesFor(itemType, fields) {
  const f = foundry.data.fields;
  const entries = Object.entries(CONFIG.DC20RPG.PROPERTIES)
  entries.forEach(([key, prop]) => {
    if (prop.type.includes(itemType)) {
      fields[key] = new f.ObjectField({required: true, initial: prop});
    }
  })
}