export default class SkillFields extends foundry.data.fields.SchemaField {
  constructor(type, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const skill = (baseAttribute) => ({
      modifier: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
      mastery: new f.NumberField(init0),
      baseAttribute: new f.StringField({initial: baseAttribute})
    })
    switch(type) {
      case "skill": 
        fields = {..._skills(skill), ...fields}
        break;
      
      case "trade": 
        fields = {..._tradeSkills(skill), ...fields}
        break;
    }
    super(fields, options);
  }

}

function _skills(skill) {
  const f = foundry.data.fields;
  return {
    awa: new f.SchemaField({
      ...skill("prime"),
      label: new f.StringField({initial: "dc20rpg.skills.awa"})
    }),
    acr: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.skills.acr"})
    }),
    ani: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.skills.ani"})
    }),
    ath: new f.SchemaField({
      ...skill("mig"),
      label: new f.StringField({initial: "dc20rpg.skills.ath"})
    }),
    arc: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.arc"}),
      knowledgeSkill: new f.BooleanField({required: true, initial: true}),
      custom: new f.BooleanField({required: true, initial: false}),
    }),
    his: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.his"}),
      knowledgeSkill: new f.BooleanField({required: true, initial: true}),
      custom: new f.BooleanField({required: true, initial: false}),
    }),
    inf: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.skills.inf"})
    }),
    inm: new f.SchemaField({
      ...skill("mig"),
      label: new f.StringField({initial: "dc20rpg.skills.inm"})
    }),
    ins: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.skills.ins"})
    }),
    inv: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.inv"})
    }),
    med: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.med"})
    }),
    nat: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.nat"}),
      knowledgeSkill: new f.BooleanField({required: true, initial: true}),
      custom: new f.BooleanField({required: true, initial: false}),
    }),
    occ: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.occ"}),
      knowledgeSkill: new f.BooleanField({required: true, initial: true}),
      custom: new f.BooleanField({required: true, initial: false}),
    }),
    rel: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.rel"}),
      knowledgeSkill: new f.BooleanField({required: true, initial: true}),
      custom: new f.BooleanField({required: true, initial: false}),
    }),
    ste: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.skills.ste"})
    }),
    sur: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.skills.sur"})
    }),
    tri: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.skills.tri"})
    }),
  }
}

function _tradeSkills(skill) {
  const f = foundry.data.fields;
  return {
    alc: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.alc"})
    }),
    bla: new f.SchemaField({
      ...skill("mig"),
      label: new f.StringField({initial: "dc20rpg.trades.bla"})
    }),
    bre: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.bre"})
    }),
    cap: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.cap"})
    }),
    car: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.car"})
    }),
    coo: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.coo"})
    }),
    cry: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.cry"})
    }),
    dis: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.trades.dis"})
    }),
    gam: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.trades.gam"})
    }),
    gla: new f.SchemaField({
      ...skill("mig"),
      label: new f.StringField({initial: "dc20rpg.trades.gla"})
    }),
    her: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.her"})
    }),
    ill: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.ill"})
    }),
    jew: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.jew"})
    }),
    lea: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.lea"})
    }),
    loc: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.loc"})
    }),
    mas: new f.SchemaField({
      ...skill("mig"),
      label: new f.StringField({initial: "dc20rpg.trades.mas"})
    }),
    mus: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.trades.mus"})
    }),
    scu: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.scu"})
    }),
    the: new f.SchemaField({
      ...skill("cha"),
      label: new f.StringField({initial: "dc20rpg.trades.the"})
    }),
    tin: new f.SchemaField({
      ...skill("int"),
      label: new f.StringField({initial: "dc20rpg.trades.tin"})
    }),
    wea: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.wea"})
    }),
    veh: new f.SchemaField({
      ...skill("agi"),
      label: new f.StringField({initial: "dc20rpg.trades.veh"})
    }),
  }
}