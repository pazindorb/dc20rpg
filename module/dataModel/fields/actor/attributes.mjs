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

export function enhanceAttributesObject(actor) {
  actor.attributes = {};

  for (const [key, original] of Object.entries(actor.system.attributes)) {
    const attribute = foundry.utils.deepClone(original);
    attribute.key = key;

    attribute.promptCheck = async (options, details) => await actor.promptRoll(key, "check", options, details);
    attribute.promptSave = async (options, details) => await actor.promptRoll(key, "save", options, details);
    
    attribute.increase = async () => await _increaseAttribute(key, actor);
    attribute.decrease = async () => await _decreaseAttribute(key, actor);
    
    actor.attributes[key] = attribute;
  }
}

async function _increaseAttribute(key, actor) {
  const level = actor.system.details.level;
  const upperLimit = 3 + Math.floor(level/5);
  const value = actor.system.attributes[key].current;
  const newValue = Math.min(upperLimit, value + 1);
	await actor.update({[`system.attributes.${key}.current`]: newValue});
}

async function _decreaseAttribute(key, actor) {
  const value = actor.system.attributes[key].current;
  const newValue = Math.max(-2, value - 1);
	await actor.update({[`system.attributes.${key}.current`]: newValue});
}