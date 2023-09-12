/**
 * Dialog window for configuring defences.
 */
export class ConfigureCustomResourceDialog extends Dialog {

  constructor(actor, resourceKey, resourceData, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.resourceKey = resourceKey;
    this.resourceData = resourceData;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/configure-custom-resource.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return this.resourceData;
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".save").click((ev) => this._onUpdate(ev, html.find(".formula")));
  }

  _onUpdate(event, $formulaInput) {
    event.preventDefault()
    const data = { ...this.resourceData };
    data.maxFormula = $formulaInput.val();
    this.actor.update({ [`system.resources.custom.${this.resourceKey}`] : data });
    this.close();
  }
}

export function createConfigureCustomResourceDialog(actor, resourceKey) {
  const resourceData = actor.system.resources.custom[resourceKey];
  let dialog = new ConfigureCustomResourceDialog(actor, resourceKey, resourceData, {title: `Configure ${resourceData.name}}`});
  dialog.render(true);
}