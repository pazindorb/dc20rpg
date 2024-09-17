export default class SkillFields {
  constructor(type) {
    const f = foundry.data.fields;
    
    const skill = (baseAttribute) => ({
      modifier: 0,
      bonus: 0,
      mastery: 0,
      baseAttribute: baseAttribute
    })

    switch(type) {
      case "skill": 
        return new f.ObjectField({required: true, initial: _skills(skill)})
      
      case "trade": 
        return new f.ObjectField({required: true, initial: _tradeSkills(skill)})
    }
  }

}

function _skills(skill) {
  const f = foundry.data.fields;
  return {
    awa: {
      ...skill("prime"),
      label: "dc20rpg.skills.awa"
    },
    acr: {
      ...skill("agi"),
      label: "dc20rpg.skills.acr"
    },
    ani: {
      ...skill("cha"),
      label: "dc20rpg.skills.ani"
    },
    ath: {
      ...skill("mig"),
      label: "dc20rpg.skills.ath"
    },
    arc: {
      ...skill("int"),
      label: "dc20rpg.skills.arc",
      knowledgeSkill: true,
      custom: false,
    },
    his: {
      ...skill("int"),
      label: "dc20rpg.skills.his",
      knowledgeSkill: true,
      custom: false,
    },
    inf: {
      ...skill("cha"),
      label: "dc20rpg.skills.inf"
    },
    inm: {
      ...skill("mig"),
      label: "dc20rpg.skills.inm"
    },
    ins: {
      ...skill("cha"),
      label: "dc20rpg.skills.ins"
    },
    inv: {
      ...skill("int"),
      label: "dc20rpg.skills.inv"
    },
    med: {
      ...skill("int"),
      label: "dc20rpg.skills.med"
    },
    nat: {
      ...skill("int"),
      label: "dc20rpg.skills.nat",
      knowledgeSkill: true,
      custom: false,
    },
    occ: {
      ...skill("int"),
      label: "dc20rpg.skills.occ",
      knowledgeSkill: true,
      custom: false,
    },
    rel: {
      ...skill("int"),
      label: "dc20rpg.skills.rel",
      knowledgeSkill: true,
      custom: false,
    },
    ste: {
      ...skill("agi"),
      label: "dc20rpg.skills.ste"
    },
    sur: {
      ...skill("int"),
      label: "dc20rpg.skills.sur"
    },
    tri: {
      ...skill("agi"),
      label: "dc20rpg.skills.tri"
    },
  }
}

function _tradeSkills(skill) {
  const f = foundry.data.fields;
  return {
    alc: {
      ...skill("int"),
      label: "dc20rpg.trades.alc"
    },
    bla: {
      ...skill("mig"),
      label: "dc20rpg.trades.bla"
    },
    bre: {
      ...skill("int"),
      label: "dc20rpg.trades.bre"
    },
    cap: {
      ...skill("agi"),
      label: "dc20rpg.trades.cap"
    },
    car: {
      ...skill("int"),
      label: "dc20rpg.trades.car"
    },
    coo: {
      ...skill("int"),
      label: "dc20rpg.trades.coo"
    },
    cry: {
      ...skill("int"),
      label: "dc20rpg.trades.cry"
    },
    dis: {
      ...skill("cha"),
      label: "dc20rpg.trades.dis"
    },
    gam: {
      ...skill("cha"),
      label: "dc20rpg.trades.gam"
    },
    gla: {
      ...skill("mig"),
      label: "dc20rpg.trades.gla"
    },
    her: {
      ...skill("int"),
      label: "dc20rpg.trades.her"
    },
    ill: {
      ...skill("agi"),
      label: "dc20rpg.trades.ill"
    },
    jew: {
      ...skill("agi"),
      label: "dc20rpg.trades.jew"
    },
    lea: {
      ...skill("agi"),
      label: "dc20rpg.trades.lea"
    },
    loc: {
      ...skill("agi"),
      label: "dc20rpg.trades.loc"
    },
    mas: {
      ...skill("mig"),
      label: "dc20rpg.trades.mas"
    },
    mus: {
      ...skill("cha"),
      label: "dc20rpg.trades.mus"
    },
    scu: {
      ...skill("agi"),
      label: "dc20rpg.trades.scu"
    },
    the: {
      ...skill("cha"),
      label: "dc20rpg.trades.the"
    },
    tin: {
      ...skill("int"),
      label: "dc20rpg.trades.tin"
    },
    wea: {
      ...skill("agi"),
      label: "dc20rpg.trades.wea"
    },
    veh: {
      ...skill("agi"),
      label: "dc20rpg.trades.veh"
    },
  }
}