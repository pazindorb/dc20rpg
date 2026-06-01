export class DC20RpgMacroConfig extends foundry.applications.sheets.MacroConfig {

  /** @override */
  async _processSubmitData(event, form, submitData, options) {
    event.preventDefault();
    if (this.document.flags?.dc20rpg?.temporaryMacro) {
      const data = this.document.flags.dc20rpg;
      if (data.itemUuid) {
        const item = await fromUuid(data.itemUuid);
        if (item) await item.update({[data.updatePath]: submitData.command})
      }
      if (data.effectUuid) {
        const effect = await fromUuid(data.effectUuid);
        if (effect) await effect.update({[`system.macro`]: submitData.command});
      }
    }
    else {
      return await super._processSubmitData(event, form, submitData, options);
    }
  }
}