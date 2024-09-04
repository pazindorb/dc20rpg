export default class AutoRollOutcomeFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    fields = {
      onYou: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.StringField({initial: "", required: true}),
          ranged: new f.StringField({initial: "", required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.StringField({initial: "", required: true}),
          ranged: new f.StringField({initial: "", required: true}),
        }),
        checks: new f.SchemaField({
          mig: new f.StringField({initial: "", required: true}),
          agi: new f.StringField({initial: "", required: true}),
          int: new f.StringField({initial: "", required: true}),
          cha: new f.StringField({initial: "", required: true}),
          att: new f.StringField({initial: "", required: true}),
          spe: new f.StringField({initial: "", required: true}),
        }),
        saves: new f.SchemaField({
          mig: new f.StringField({initial: "", required: true}),
          agi: new f.StringField({initial: "", required: true}),
          int: new f.StringField({initial: "", required: true}),
          cha: new f.StringField({initial: "", required: true}),
        }),
      }),
      againstYou: new f.SchemaField({
        martial: new f.SchemaField({
          melee: new f.StringField({initial: "", required: true}),
          ranged: new f.StringField({initial: "", required: true}),
        }),
        spell: new f.SchemaField({
          melee: new f.StringField({initial: "", required: true}),
          ranged: new f.StringField({initial: "", required: true}),
        }),
        ...fields
      }),
    };
    super(fields, options);
  }
}