export class InfoDisplay extends Dialog {

  constructor(informations, header, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.informations = informations;
    this.header = header;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/info-display-dialog.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  getData() {
    return {
      info: this.informations,
      header: this.header
    };
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".close").click(ev => this._onClose(ev));
  }

  _onClose(event) {
    event.preventDefault();
    this.close();
  }
}

export function createInfoDisplayDialog(informations, title) {
  const dialog = new InfoDisplay(informations, title, {title: title});
  dialog.render(true);
}