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
      neck: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.neck", "icons/equipment/neck/choker-simple-bone-fangs.webp")}}),
      mantle: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.mantle", "icons/equipment/back/mantle-collared-white.webp")}}),
      body: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.body", "icons/equipment/chest/breastplate-leather-brown-belted.webp")}}),
      waist: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.waist", "icons/equipment/waist/belt-buckle-horned.webp")}}),
      hand: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.hand", "icons/magic/perception/hand-eye-black.webp")}}),
      ring: new f.ObjectField({required: true, initial: {
        left: init("dc20rpg.sheet.equipmentSlot.ringLeft", "icons/equipment/finger/ring-faceted-white.webp"),
        right: init("dc20rpg.sheet.equipmentSlot.ringRight", "icons/equipment/finger/ring-faceted-white.webp"),
      }}),
      feet: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.feet", "icons/equipment/feet/boots-galosh-white.webp")}}),
      trinket: new f.ObjectField({required: true, initial: {default: init("dc20rpg.sheet.equipmentSlot.trinket", "icons/tools/instruments/horn-white-gray.webp")}}),
      weapon: new f.ObjectField({required: true, initial: {
        mainHand: init("dc20rpg.sheet.equipmentSlot.mainHand", "icons/weapons/swords/sword-simple-white.webp"),
        offHand: init("dc20rpg.sheet.equipmentSlot.offHand", "icons/weapons/swords/sword-simple-white.webp"),
      }}),
    }

    super(fields, options);
  }
}