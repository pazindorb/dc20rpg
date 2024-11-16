export default class RollLevelFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      onYou: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        checks: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
          att: new f.ArrayField(new f.StringField(), {required: true}),
          spe: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        saves: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
        }),
      }),
      againstYou: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        checks: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
          att: new f.ArrayField(new f.StringField(), {required: true}),
          spe: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        saves: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        ...fields
      }),
    };
    super(fields, options);
  }
}