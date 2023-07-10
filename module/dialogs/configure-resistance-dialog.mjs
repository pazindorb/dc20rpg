/**
 * Dialog window for configuring defences.
 */
export class ConfigureResistanceDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.resistances = foundry.utils.deepClone(this.actor.system.resistances);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/configure-resistance-dialog.hbs",
      classes: ["dc20rpg", "dialog"]
    });
  }

  getData() {
    return this.resistances;
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".activable").click(ev => this._onActivable(ev));
    html.find(".activable-inner").click(ev => this._onActivableInner(ev));
    html.find(".input-resist").change(ev => this._onValueChange(ev));
    html.find(".save").click(ev => this._onUpdate(ev));
  }

  _onActivable(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    this.resistances[key].immune = !this.resistances[key].immune;
    this.render(true);
  }

  _onActivableInner(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    const innerKey = event.currentTarget.dataset.innerKey;
    this.resistances[key][innerKey] = !this.resistances[key][innerKey];
    console.info(this.resistances)
    this.render(true);
  }

  _onValueChange(event) {
    event.preventDefault();
    const value = event.currentTarget.value;
    const key = event.currentTarget.dataset.key;
    this.resistances[key].value = value;
    this.render(true);
  }

  _onUpdate(event) {
    event.preventDefault();
    this.actor.update({ [`system.resistances`] : this.resistances });
    this.close();
  }
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createConfigureResistanceDialog(actor) {
  let dialog = new ConfigureResistanceDialog(actor, {title: "Configure Resistance"});
  dialog.render(true);
}