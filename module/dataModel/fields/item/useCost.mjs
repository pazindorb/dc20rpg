export default class UseCostFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const initNull = { required: true, nullable: true, integer: true, initial: null };

    fields = {
      resources: new f.SchemaField({
        actionPoint: new f.NumberField(initNull),
        stamina: new f.NumberField(initNull),
        mana: new f.NumberField(initNull),
        health: new f.NumberField(initNull),
        grit: new f.NumberField(initNull),
        restPoints: new f.NumberField(initNull),
        custom: new f.ObjectField({required: true}),
      }),
      charges: new f.SchemaField({
        current: new f.NumberField(initNull),
        max: new f.NumberField(initNull),
        maxChargesFormula: new f.StringField({required: true, nullable: true, initial: null}),
        overriden: new f.BooleanField({required: true, initial: false}),
        rechargeFormula: new f.StringField({required: true, nullable: false, initial: ""}),
        rechargeDice: new f.StringField({required: true, nullable: false, initial: ""}),
        requiredTotalMinimum: new f.NumberField(initNull),
        reset: new f.StringField({required: true, nullable: false, initial: ""}),
        showAsResource: new f.BooleanField({required: true, initial: false}),
        subtract: new f.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      }),
      otherItem: new f.SchemaField({
        itemId: new f.StringField({required: true, initial: ""}),
        amountConsumed: new f.NumberField({ required: true, nullable: true, integer: true, initial: 0 }),
        consumeCharge: new f.BooleanField({required: true, initial: true}),
      })
    }
    super(fields, options);
  }
}