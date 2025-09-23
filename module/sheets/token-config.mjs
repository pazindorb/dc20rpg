export class DC20RpgTokenConfig extends foundry.applications.sheets.TokenConfig {

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.actions.overrideSize = async () => {
      const notOverrideSize = this.token?.flags?.dc20rpg?.notOverrideSize || false;
      await this.token.update({["flags.dc20rpg.notOverrideSize"]: !notOverrideSize});
    };
    return initialized;
  }

  async render(target, options={}) {
    const rendered = await super.render(target, options);

    const dimentions = this.element.querySelector('[data-application-part="appearance"]').querySelector('.slim');
    if (dimentions) {
      const notOverrideSize = this.token?.flags?.dc20rpg?.notOverrideSize || false;
      const formGroup = document.createElement("div");
      formGroup.innerHTML = `
        <label>${game.i18n.localize("dc20rpg.sheet.tokenConfig.notOverrideSize")}</label>
        <input type="checkbox" data-action="overrideSize" ${notOverrideSize ? "checked" : ""}>
        <p class="hint">${game.i18n.localize("dc20rpg.sheet.tokenConfig.notOverrideSizeTitle")}</p>
      `;
      formGroup.classList.add("form-group");
      formGroup.classList.add("slim");
      dimentions.after(formGroup);
    }

    return rendered;
  }
}