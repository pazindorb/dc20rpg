import { arraysHaveCommonString } from "../../../helpers/utils.mjs";

export default class PropertyFields extends foundry.data.fields.SchemaField {
  constructor(itemType="", fields={}, options={}) {
    _preparePropertiesFor(itemType, fields);
    super(fields, options);
  }
}

function _preparePropertiesFor(itemType, fields) {
  const f = foundry.data.fields;
  let acceptedTypes = ["other"];
  if (itemType === "weapon") acceptedTypes = ["melee", "ranged"];
  if (itemType === "equipment") acceptedTypes = ["lshield", "hshield", "light", "heavy"];

  const entries = Object.entries(CONFIG.DC20RPG.PROPERTIES)
  entries.forEach(([key, prop]) => {
    if (arraysHaveCommonString(acceptedTypes, prop.for)) {
      fields[key] = new f.ObjectField({required: true, initial: prop});
    }
  })
}