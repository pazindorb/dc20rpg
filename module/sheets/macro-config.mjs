export class DC20RpgMacroConfig extends MacroConfig {

  /** @override */
  async _updateObject(event, formData) {
    event.preventDefault()
    if (this.object.flags?.dc20rpg?.temporaryMacro) {
      const data = this.object.flags.dc20rpg;
      if (data.item) {
        if (data.enhKey) await data.item.update({[`system.enhancements.${data.enhKey}.modifications.macro`]: formData.command});
        else await data.item.update({[`system.macros.${data.key}`]: formData.command});
      }
      if (data.effect) await data.effect.update({[`flags.dc20rpg.macro`]: formData.command});
    }
    else {
      await super._updateObject(event, formData);
    }
  }
}