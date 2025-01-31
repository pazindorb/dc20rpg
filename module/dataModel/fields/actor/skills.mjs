export default class SkillFields {
  constructor(type) {
    const f = foundry.data.fields;
    const skillStore = game.settings.get("dc20rpg", "skillStore");

    switch(type) {
      case "skill": return new f.ObjectField({required: true, initial: skillStore.skills})
      case "trade": return new f.ObjectField({required: true, initial: skillStore.trades})
      case "language": return new f.ObjectField({required: true, initial: skillStore.languages})
    }
  }
}