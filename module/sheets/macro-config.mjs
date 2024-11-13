export class DC20RpgMacroConfig extends MacroConfig {
  /** @override */
  async _updateObject(event, formData) {
    event.preventDefault()
    if (this.object.flags?.dc20rpg?.temporaryMacro) {
      const data = this.object.flags.dc20rpg;
      await data.item.update({[`system.macros.${data.key}`]: formData.command})
    }
    else {
      await super._updateObject(event, formData);
    }
  }
}