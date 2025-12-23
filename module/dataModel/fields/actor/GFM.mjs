export default class GFModFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      attributeCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      attackCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      spellCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      skillCheck: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      save: new f.ArrayField(new f.StringField(), {required: true}),  // TODO backward compatibilty remove as part of 0.10.5 update
      damage: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
      }),
      healing: new f.ArrayField(new f.StringField(), {required: true}),
      ...fields
    };
    super(fields, options);
  }
}