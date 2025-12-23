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
      coreFormula: new f.SchemaField({
        modifier: new f.StringField({required: true, initial: ""}),
        source: new f.StringField({required: true, initial: ""}),
      }),
      help:new f.ArrayField(new f.StringField(), {required: true}),
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
  object.system.rollMenu.clear = async () => await _clearRollMenu(object);
  object.system.rollMenu.helpDiceFormula = () => _helpDiceFormula(object);
  object.system.rollMenu.apForAdvUp = async () => await _resourceForAdv(object, "ap", true);
  object.system.rollMenu.apForAdvDown = async () => await _resourceForAdv(object, "ap", false);
  object.system.rollMenu.gritForAdvUp = async () => await _resourceForAdv(object, "grit", true);
  object.system.rollMenu.gritForAdvDown = async () => await _resourceForAdv(object, "grit", false);
}

async function _clearRollMenu(object) {
  const clearRollMenu = {
    dis: 0,
    adv: 0,
    apCost: 0,
    gritCost: 0,
    autoCrit: false,
    autoFail: false,
    coreFormula: {
      modifier: "",
      source: ""
    },
    help: [],
    ignoreMCP: false,
    free: false,
    rangeType: "",
    versatile: false,
    halfCover: false,
    tqCover: false
  }

  await object.update({["system.rollMenu"]: clearRollMenu})
}

function _helpDiceFormula(object) {
  let formula = "";
  object.system.rollMenu.help.forEach(dice => {
    formula += ` ${dice}`;
  })
  return formula;
}

async function _resourceForAdv(object, key, up) {
  const adv = object.system.rollMenu.adv;
  const cost = object.system.rollMenu[`${key}Cost`];

  if (up && adv < 9) {
    await object.update({
      [`system.rollMenu.${key}Cost`]: cost + 1,
      ['system.rollMenu.adv']: adv + 1
    });
  }

  if (!up && cost > 0) {
    await object.update({
      [`system.rollMenu.${key}Cost`]: cost - 1,
      ['system.rollMenu.adv']: adv - 1
    });
  }
}