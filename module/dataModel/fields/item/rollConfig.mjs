export default class RollConfigFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      rollBonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      canCrit: new f.BooleanField({required: true, initial: true}),
      canCritFail: new f.BooleanField({required: true, initial: true}),
      critThreshold: new f.NumberField({ required: true, nullable: false, integer: true, initial: 20 }),
      critFailThreshold: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      skipBonusDamage: new f.SchemaField({
        heavy: new f.BooleanField({required: true, initial: false}),
        brutal: new f.BooleanField({required: true, initial: false}),
        crit: new f.BooleanField({required: true, initial: false}),
        targetModifiers: new f.BooleanField({required: true, initial: false}), 
      }),
      ignoreCloseQuarters: new f.BooleanField({required: true, initial: false}),
      respectSizeRules: new f.BooleanField({required: true, initial: false}),
      ...fields
    };
    super(fields, options);
  }
}