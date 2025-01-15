export default class GFModFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      attributeCheck: new f.ArrayField(new f.StringField(), {required: true}),
      attackCheck: new f.ArrayField(new f.StringField(), {required: true}),
      spellCheck: new f.ArrayField(new f.StringField(), {required: true}),
      skillCheck: new f.ArrayField(new f.StringField(), {required: true}),
      save: new f.ArrayField(new f.StringField(), {required: true}),
      attackDamage: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
      }),
      healing: new f.ArrayField(new f.StringField(), {required: true}),
      ...fields
    };
    super(fields, options);
  }
}