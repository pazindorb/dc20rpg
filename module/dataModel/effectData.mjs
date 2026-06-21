export class DC20BaseActiveEffectData extends foundry.data.ActiveEffectTypeDataModel {
  static defineSchema() {
    const f = foundry.data.fields;

    return this.mergeSchema(super.defineSchema(), {
      changes: new f.ArrayField(new f.SchemaField({
        key: new f.StringField({required: true}),
        type: new f.StringField({required: true, blank: false, initial: "add"}),
        value: new f.AnyField({required: true, nullable: true, serializable: true, initial: ""}),
        phase: new f.StringField({required: true, blank: false, initial: "initial"}),
        priority: new f.NumberField(),
        useCustom: new f.BooleanField({required: true, initial: false})
      })),
      sustained: new f.SchemaField({
        isSustained: new f.BooleanField({required: true, initial: false}),
        actorUuid: new f.StringField({required: true}),
        itemId: new f.StringField({required: true}),
      }),
      statusId: new f.StringField({required: true}),
      condition: new f.BooleanField({required: true, initial: false}),
      duration: new f.SchemaField({
        useCounter: new f.BooleanField({required: true, initial: false}),         // TODO: REMOVE
        resetWhenEnabled: new f.BooleanField({required: true, initial: false}),
        onTimeEnd: new f.StringField({required: true}),                           // TODO: REMOVE
        expiryAction: new f.StringField({required: true, initial: ""}),
      }),
      effectKey: new f.StringField({required: true}),
      macro: new f.StringField({required: true}),
      addToChat: new f.BooleanField({required: true, initial: false}),
      applyToSelf: new f.BooleanField({required: true, initial: false}),
      applyToTemplate: new f.BooleanField({required: true, initial: true}),
      requireEquip: new f.BooleanField({required: true, initial: false}),
      nonessential: new f.BooleanField({required: true, initial: false}),
      refreshTarget: new f.BooleanField({required: true, initial: false}),
      disableWhen: new f.SchemaField({
        path: new f.StringField({required: true}),
        mode: new f.StringField({required: true}),
        value: new f.StringField({required: true})
      }),
      chatMessageId: new f.StringField({required: true, initial: ""}),
    });
  }

  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }
}

