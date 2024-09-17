export default class LanguageFields extends foundry.data.fields.SchemaField {
  constructor() {
    const f = foundry.data.fields;

    const lang = (category) => ({
      mastery: 0,
      category: category
    })
    const fields = {
      com: {
        mastery: 2 ,
        category: "mortal",
        label: "dc20rpg.languages.com"
      },
      hum: {
        ...lang("mortal"),
        label: "dc20rpg.languages.hum"
      },
      dwa: {
        ...lang("mortal"),
        label: "dc20rpg.languages.dwa"
      },
      elv: {
        ...lang("mortal"),
        label: "dc20rpg.languages.elv"
      },
      gno: {
        ...lang("mortal"),
        label: "dc20rpg.languages.gno"
      },
      hal: {
        ...lang("mortal"),
        label: "dc20rpg.languages.hal"
      },
      gia: {
        ...lang("exotic"),
        label: "dc20rpg.languages.gia"
      },
      dra: {
        ...lang("exotic"),
        label: "dc20rpg.languages.dra"
      },
      orc: {
        ...lang("exotic"),
        label: "dc20rpg.languages.orc"
      },
      fey: {
        ...lang("exotic"),
        label: "dc20rpg.languages.fey"
      },
      ele: {
        ...lang("exotic"),
        label: "dc20rpg.languages.ele"
      },
      cel: {
        ...lang("divine"),
        label: "dc20rpg.languages.cel"
      },
      fie: {
        ...lang("divine"),
        label: "dc20rpg.languages.fie"
      },
      dee: {
        ...lang("outer"),
        label: "dc20rpg.languages.dee"
      },
    };
    return new f.ObjectField({required: true, initial: fields});
  }
}