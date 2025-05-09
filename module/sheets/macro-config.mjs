export class DC20RpgMacroConfig extends foundry.applications.sheets.MacroConfig {

  /** @override */
  async _processSubmitData(event, form, submitData, options) {
    event.preventDefault();
    if (this.document.flags?.dc20rpg?.temporaryMacro) {
      const data = this.document.flags.dc20rpg;
      if (data.item) {
        if (data.enhKey) await data.item.update({[`system.enhancements.${data.enhKey}.modifications.macros.${data.macroKey}`]: formData.command});
        else await data.item.update({[`system.macros.${data.key}.command`]: submitData.command});
      }
      if (data.effect) await data.effect.update({[`flags.dc20rpg.macro`]: submitData.command});
    }
    else {
      return await _processSubmitData(event, form, submitData, options);
    }
  }
}