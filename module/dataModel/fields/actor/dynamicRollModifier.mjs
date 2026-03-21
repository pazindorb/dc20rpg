export default class DynamicRollModifierFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      onYou: new f.SchemaField({
        attack: new f.ArrayField(new f.StringField(), {required: true}),
        martial: new f.SchemaField({ // TODO backward compatibilty remove as part of 0.11.0 update
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({ // TODO backward compatibilty remove as part of 0.11.0 update
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        checks: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
          att: new f.ArrayField(new f.StringField(), {required: true}), // TODO backward compatibilty remove as part of 0.11.0 update
          spe: new f.ArrayField(new f.StringField(), {required: true}),
          mar: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        saves: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        deathSave: new f.ArrayField(new f.StringField(), {required: true}),
        initiative: new f.ArrayField(new f.StringField(), {required: true}),
        skills: new f.ArrayField(new f.StringField(), {required: true}),
      }),
      againstYou: new f.SchemaField({
        attack: new f.ArrayField(new f.StringField(), {required: true}),
        martial: new f.SchemaField({ // TODO backward compatibilty remove as part of 0.11.0 update
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        spell: new f.SchemaField({ // TODO backward compatibilty remove as part of 0.11.0 update
          melee: new f.ArrayField(new f.StringField(), {required: true}),
          ranged: new f.ArrayField(new f.StringField(), {required: true}),
          area: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        checks: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
          att: new f.ArrayField(new f.StringField(), {required: true}), // TODO backward compatibilty remove as part of 0.11.0 update
          spe: new f.ArrayField(new f.StringField(), {required: true}),
          mar: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        saves: new f.SchemaField({
          mig: new f.ArrayField(new f.StringField(), {required: true}),
          agi: new f.ArrayField(new f.StringField(), {required: true}),
          int: new f.ArrayField(new f.StringField(), {required: true}),
          cha: new f.ArrayField(new f.StringField(), {required: true}),
        }),
        skills: new f.ArrayField(new f.StringField(), {required: true}),
        ...fields
      }),
    };
    super(fields, options);
  }
}