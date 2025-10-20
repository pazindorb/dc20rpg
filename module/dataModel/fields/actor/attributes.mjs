export default class AttributeFields extends foundry.data.fields.SchemaField {
  constructor(initialValue=0, saveMastery=false, fields={}, options={}) {
    const f = foundry.data.fields;
    const numberInitial = { required: true, nullable: false, integer: true, initial: initialValue };
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const attribute = () => ({
      saveMastery: new f.BooleanField({required: true, initial: saveMastery}),
      value: new f.NumberField(numberInitial),
      current: new f.NumberField(numberInitial),
      save: new f.NumberField(numberInitial),
      check: new f.NumberField(numberInitial),
      bonuses: new f.SchemaField({
        check: new f.NumberField(init0),
        value: new f.NumberField(init0),
        save: new f.NumberField(init0)
      })
    });
    fields = {
      mig: new f.SchemaField({...attribute(), label: new f.StringField({initial: "dc20rpg.attributes.mig"})}),
      agi: new f.SchemaField({...attribute(), label: new f.StringField({initial: "dc20rpg.attributes.agi"})}),
      cha: new f.SchemaField({...attribute(), label: new f.StringField({initial: "dc20rpg.attributes.cha"})}),
      int: new f.SchemaField({...attribute(), label: new f.StringField({initial: "dc20rpg.attributes.int"})}),
      ...fields
    };
    super(fields, options);
  }
}