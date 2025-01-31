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
      }),
      custom: new f.ObjectField({required: true}),
      ...fields
    };

    if (pcResources) {
      fields = {
        stamina: new f.SchemaField({...resource(), label: new f.StringField({initial: "dc20rpg.resource.stamina"})}),
        mana: new f.SchemaField({...resource(), label: new f.StringField({initial: "dc20rpg.resource.mana"})}),
        grit: new f.SchemaField({ ...resource(),label: new f.StringField({initial: "dc20rpg.resource.grit"})}),
        restPoints: new f.SchemaField({
          ...resource(), 
          label: new f.StringField({initial: "dc20rpg.resource.restPoints"}), 
          maxFormula: new f.StringField({ required: true, initial: "max(@mig, 0) + @level + @resources.restPoints.bonus"}),
        }),
        health: new f.SchemaField({
          ...resource(),
          value: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          current: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          max: new f.NumberField({ required: true, nullable: false, integer: true, initial: 6 }),
          temp: new f.NumberField({ required: true, nullable: true, integer: true, initial: null }),
          useFlat: new f.BooleanField({required: true, initial: false}),
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
        }),
        ...fields
      }
    }
    super(fields, options);
  }
}