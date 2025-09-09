export default class RollMenu extends foundry.data.fields.SchemaField {
  constructor(item, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    // Common fileds
    fields = {
      dis: new f.NumberField(init0),
      adv: new f.NumberField(init0),
      apCost: new f.NumberField(init0),
      gritCost: new f.NumberField(init0),
      autoCrit: new f.BooleanField({required: true, initial: false}),
      autoFail: new f.BooleanField({required: true, initial: false}),
      help:new f.ArrayField(new f.NumberField(), {required: true}),
      ignoreMCP: new f.BooleanField({required: true, initial: false}),
      ...fields
    };
    if (!item) return super(fields, options);

    // Item fields
    fields = {
      free: new f.BooleanField({required: true, initial: false}),
      rangeType: new f.StringField({required: true, initial: ""}),
      versatile: new f.BooleanField({required: true, initial: false}),
      flanks: new f.BooleanField({required: true, initial: false}),
      halfCover: new f.BooleanField({required: true, initial: false}),
      tqCover: new f.BooleanField({required: true, initial: false}),
      ...fields
    };
    
    super(fields, options);
  }
}

export function enrichRollMenuObject(object) {
  object.system.rollMenu.clear = () => {
    const clearRollMenu = {
      dis: 0,
      adv: 0,
      apCost: 0,
      gritCost: 0,
      autoCrit: false,
      autoFail: false,
      help: [],
      ignoreMCP: false,
      free: false,
      rangeType: "",
      versatile: false,
      halfCover: false,
      tqCover: false
    }

    object.update({["system.rollMenu"]: clearRollMenu})
  }

  object.system.rollMenu.helpDiceFormula = () => {
    let formula = "";
    object.system.rollMenu.help.forEach(dice => {
      formula += ` + d${dice}`;
    })
    return formula;
  }
}