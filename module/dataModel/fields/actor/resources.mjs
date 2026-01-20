export default class ResourceFields extends foundry.data.fields.SchemaField {
  constructor(pcResources, fields={}, options={}) {
    const f = foundry.data.fields;
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const resource = () => ({
      value: new f.NumberField(init0),
      bonus: new f.NumberField(init0),
      max: new f.NumberField(init0),
    })
    fields = {
      ap: new f.SchemaField({
        value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
        bonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 4 }),
        label: new f.StringField({initial: "dc20rpg.resource.ap"}),
        reset: new f.StringField({initial: "roundEnd"}),
      }),
      custom: new f.ObjectField({required: true}),
      ...fields
    };

    if (pcResources) {
      fields = {
        stamina: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.stamina"}),
          maxFormula: new f.StringField({ required: true, initial: "@resources.stamina.bonus + @details.class.bonusStamina"}),
          reset: new f.StringField({initial: "combatEnd"}),
        }),
        mana: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.mana"}),
          maxFormula: new f.StringField({ required: true, initial: "@resources.mana.bonus + @details.class.bonusMana"}),
          reset: new f.StringField({initial: "long"}),
          infusions: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
        }),
        grit: new f.SchemaField({ 
          ...resource(),
          label: new f.StringField({initial: "dc20rpg.resource.grit"}),
          maxFormula: new f.StringField({ required: true, initial: "2 + @chaValue + @resources.grit.bonus"}),
          reset: new f.StringField({initial: "long"}),
        }),
        restPoints: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.restPoints"}), 
          reset: new f.StringField({initial: "long4h"}),
          regenerationFormula: new f.StringField({initial: "@resources.health.max"}), 
        }),
        health: new f.SchemaField({
          ...resource(),
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          temp: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          useFlat: new f.BooleanField({required: true, initial: false}),
          reset: new f.StringField({initial: ""}),
        }),
        ...fields
      }
    }
    else {
      fields = {
        health: new f.SchemaField({
          ...resource(),
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          temp: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          useFlat: new f.BooleanField({required: true, initial: true}),
          reset: new f.StringField({initial: ""}),
        }),
        ...fields
      }
    }
    super(fields, options);
  }
}