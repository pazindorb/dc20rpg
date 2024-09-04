export default class LanguageFields extends foundry.data.fields.SchemaField {
  constructor(type, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const lang = (category) => ({
      mastery: new f.NumberField(init0),
      category: new f.StringField({initial: category})
    })
    fields = {
      com: new f.SchemaField({
        mastery: new f.NumberField({ required: true, nullable: false, integer: true, initial: 2 }),
        category: new f.StringField({initial: "mortal"}),
        label: new f.StringField({initial: "dc20rpg.languages.com"})
      }),
      hum: new f.SchemaField({
        ...lang("mortal"),
        label: new f.StringField({initial: "dc20rpg.languages.hum"})
      }),
      dwa: new f.SchemaField({
        ...lang("mortal"),
        label: new f.StringField({initial: "dc20rpg.languages.dwa"})
      }),
      elv: new f.SchemaField({
        ...lang("mortal"),
        label: new f.StringField({initial: "dc20rpg.languages.elv"})
      }),
      gno: new f.SchemaField({
        ...lang("mortal"),
        label: new f.StringField({initial: "dc20rpg.languages.gno"})
      }),
      hal: new f.SchemaField({
        ...lang("mortal"),
        label: new f.StringField({initial: "dc20rpg.languages.hal"})
      }),
      gia: new f.SchemaField({
        ...lang("exotic"),
        label: new f.StringField({initial: "dc20rpg.languages.gia"})
      }),
      dra: new f.SchemaField({
        ...lang("exotic"),
        label: new f.StringField({initial: "dc20rpg.languages.dra"})
      }),
      orc: new f.SchemaField({
        ...lang("exotic"),
        label: new f.StringField({initial: "dc20rpg.languages.orc"})
      }),
      fey: new f.SchemaField({
        ...lang("exotic"),
        label: new f.StringField({initial: "dc20rpg.languages.fey"})
      }),
      ele: new f.SchemaField({
        ...lang("exotic"),
        label: new f.StringField({initial: "dc20rpg.languages.ele"})
      }),
      cel: new f.SchemaField({
        ...lang("divine"),
        label: new f.StringField({initial: "dc20rpg.languages.cel"})
      }),
      fie: new f.SchemaField({
        ...lang("divine"),
        label: new f.StringField({initial: "dc20rpg.languages.fie"})
      }),
      dee: new f.SchemaField({
        ...lang("outer"),
        label: new f.StringField({initial: "dc20rpg.languages.dee"})
      }),
    };
    super(fields, options);
  }
}