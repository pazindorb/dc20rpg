export default class EquipmentSlotFields extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const f = foundry.data.fields;
    const init = (slotName, slotIcon) => {
      return {
        slotName: slotName,
        slotIcon: slotIcon
      }
    }


    fields = {
      head: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.head", "icons/equipment/head/helm-barbute-white.webp")}}),
      neck: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.neck", "icons/weapons/bows/shortbow-white.webp")}}),
      mantle: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.mantle", "icons/weapons/bows/shortbow-white.webp")}}),
      body: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.body", "icons/equipment/chest/breastplate-leather-brown-belted.webp")}}),
      waist: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.waist", "icons/weapons/bows/shortbow-white.webp")}}),
      hand: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.hand", "icons/weapons/bows/shortbow-white.webp")}}),
      ring: new f.ObjectField({required: true, initial: {
        left: init("dc20rpg.sheet.equipmentSlot.ringLeft", "icons/weapons/bows/shortbow-white.webp"),
        right: init("dc20rpg.sheet.equipmentSlot.ringRight", "icons/weapons/bows/shortbow-white.webp"),
      }}),
      feet: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.feet", "icons/weapons/bows/shortbow-white.webp")}}),
      trinket: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.trinket", "icons/weapons/bows/shortbow-white.webp")}}),
      weapon: new f.ObjectField({required: true, initial: {
        mainHand: init("dc20rpg.sheet.equipmentSlot.mainHand", "icons/weapons/bows/shortbow-white.webp"),
        offHand: init("dc20rpg.sheet.equipmentSlot.offHand", "icons/weapons/bows/shortbow-white.webp"),
      }}),
    }

    super(fields, options);
  }
}