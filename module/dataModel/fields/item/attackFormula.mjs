export default class AttackFormulaFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;

    fields = {
      rangeType: new f.StringField({required: true, initial: "melee"}),
      checkType: new f.StringField({required: true, initial: "attack"}), // TODO rename to checkKey for consistency, see DC20SpellData - we need to change that too
      targetDefence: new f.StringField({required: true, initial: "physical"}),
      rollBonus: new f.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      combatMastery: new f.BooleanField({required: true, initial: false}),
      critThreshold: new f.NumberField({ required: true, nullable: false, integer: true, initial: 20 }),
      halfDmgOnMiss: new f.BooleanField({required: true, initial: false}),
      formulaMod: new f.StringField({required: true, initial: "physical"}),
      ...fields
    };
    super(fields, options);
  }
}