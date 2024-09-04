export default class PropertyFields extends foundry.data.fields.SchemaField {
  constructor(itemType="", fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const attunement = () => ({
      attunement: new f.SchemaField({
        active: new f.BooleanField({required: true, initial: false}),
        slotCost: new f.NumberField(init0),
        label: new f.StringField({initial: "dc20rpg.properties.attunement"})
      })
    })

    switch(itemType) {
      case "weapon": 
        fields = {
          ...attunement(),
          ..._weaponProps(), 
          ...fields
        }
        break;
      
      case "equipment": 
        fields = {
          ...attunement(),
          ..._equipmentProps(), 
          ...fields
        }
        break;
      
      default: 
        fields = {
          ...attunement(),
          ...fields,
        }
    }
    super(fields, options);
  }

}

function _weaponProps() {
  const f = foundry.data.fields;
  return {
    ammo: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.ammo"})
    }),
    concealable: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.concealable"})
    }),
    guard: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.guard"})
    }),
    heavy: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.heavy"})
    }),
    impact: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.impact"})
    }),
    longRanged: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.longRanged"})
    }),
    multiFaceted: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      selected: new f.StringField({required: true, initial: "first"}),
      labelKey: new f.StringField({required: true, initial: ""}),
      weaponStyle: new f.SchemaField({
        first: new f.StringField({required: true, initial: ""}),
        second: new f.StringField({required: true, initial: ""}),
      }),
      damageType: new f.SchemaField({
        first: new f.StringField({required: true, initial: ""}),
        second: new f.StringField({required: true, initial: ""}),
      }),
      label: new f.StringField({initial: "dc20rpg.properties.multiFaceted"})
    }),
    reach: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      label: new f.StringField({initial: "dc20rpg.properties.reach"})
    }),
    reload: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      loaded: new f.BooleanField({required: true, initial: true}),
      value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      label: new f.StringField({initial: "dc20rpg.properties.reload"})
    }),
    silent: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.silent"})
    }),
    toss: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.toss"})
    }),
    thrown: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.thrown"})
    }),
    twoHanded: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.twoHanded"})
    }),
    unwieldy: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.unwieldy"})
    }),
    versatile: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.versatile"})
    }),
    capture: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.capture"})
    }),
    returning: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.returning"})
    }),
  }
}

function _equipmentProps() {
  const f = foundry.data.fields;
  return {
    reinforced: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.reinforced"})
    }),
    sturdy: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.sturdy"})
    }),
    dense: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.dense"})
    }),
    requirement: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      value: new f.StringField({required: true, initial: ""}),
      label: new f.StringField({initial: "dc20rpg.properties.requirement"})
    }),
    agiDis: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.agiDis"})
    }),
    damageReduction: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      label: new f.StringField({initial: "dc20rpg.properties.damageReduction"})
    }),
    mounted: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.mounted"})
    }),
    thrown: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.thrown"})
    }),
    toss: new f.SchemaField({
      active: new f.BooleanField({required: true, initial: false}),
      label: new f.StringField({initial: "dc20rpg.properties.toss"})
    }),
  }
}