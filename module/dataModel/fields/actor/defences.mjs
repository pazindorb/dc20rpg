export default class DefenceFields extends foundry.data.fields.SchemaField {
  constructor(formulaKey="standard", fields={}, options={}) {
    const f = foundry.data.fields;
    const init8 = { required: true, nullable: false, integer: true, initial: 8 };
    const init0 = { required: true, nullable: false, integer: true, initial: 0 };

    const defence = () => ({
      formulaKey: new f.StringField({required: false, initial: formulaKey}),
      customFormula: new f.StringField({required: true, initial: ""}),
      value: new f.NumberField(init8),
      normal: new f.NumberField(init8),
      heavy: new f.NumberField(init0),
      brutal: new f.NumberField(init0),
    });

    fields = {
      physical: new f.SchemaField({
        ...defence(), 
        label: new f.StringField({initial: "dc20rpg.defence.physical"}),
        bonuses: new f.SchemaField({
          noArmor: new f.NumberField(init0),
          noHeavy: new f.NumberField(init0),
          always: new f.NumberField(init0),
          armor: new f.NumberField(init0),
        })
      }),
      mystical: new f.SchemaField({
        ...defence(), 
        label: new f.StringField({initial: "dc20rpg.defence.mystical"}),
        bonuses: new f.SchemaField({
          noArmor: new f.NumberField(init0),
          noHeavy: new f.NumberField(init0),
          always: new f.NumberField(init0),
        })
      }),
      ...fields
    };
    super(fields, options);
  }
}