export class DC20RpgTokenConfig extends foundry.applications.sheets.TokenConfig {

  activateListeners(html) {
    super.activateListeners(html);

    const notOverrideSize = this.token?.flags?.dc20rpg?.notOverrideSize || false;
    const notOverrideChecked = notOverrideSize ? "fa-solid fa-square-check" : "fa-regular fa-square";
    const notOverrideSizeRow = `
    <div class="form-group slim" title="${game.i18n.localize("dc20rpg.sheet.tokenConfig.notOverrideSizeTitle")}">
      <label>${game.i18n.localize("dc20rpg.sheet.tokenConfig.notOverrideSize")}</label>
      <a class="override-save-checkbox fa-lg ${notOverrideChecked}" style="font-size:1.75em;display:flex;align-items:center;justify-content:end;"></a>
    </div>
    `;
    const formGroup = html.find('[data-tab="appearance"]').find(".form-group").first();
    formGroup.after(notOverrideSizeRow);

    html.find('.override-save-checkbox').click(() => this.token.update({["flags.dc20rpg.notOverrideSize"]: !notOverrideSize}));
  }
}