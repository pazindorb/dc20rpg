export function prepareColorPalete() {
  // Set color palete
  const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
  let color = colorPalete[game.settings.get("dc20rpg", "selectedColor")];
  if (!color) color = colorPalete["default"];

  const root = document.documentElement.style;
  Object.entries(color).forEach(([key, color]) => root.setProperty(key, color));
}

export function defaultColorPalete() {
  return {
    default: _defaultColors(),
    dark: _darkColors()
  }
}
function _defaultColors() {
  return {
    ['--primary-color']: "#741a89",
    ['--primary-light']: "#917996",
    ['--primary-dark']: "#5a265f",
    ['--primary-darker']: "#3f0344",

    ['--background-color']: "transparent",
    ['--background-banner']: "#6c0097b0",
    
    ['--secondary-color']: "#c0c0c0",
    ['--secondary-dark']: "#646464",
    ['--secondary-darker']: "#262626",
    ['--secondary-lighter']: "#dfdfdf",
    ['--secondary-light-alpha']: "#dfdfdfcc",
    ['--menu-line']: "#0000003b",

    ['--golden']: "#ecde1e",
    ['--dark-red']: "#b20000",

    ['--unequipped']: "#c5c5c5a3",
    ['--equipped']: "#88a16f",
    ['--attuned']: "#c7c172",
    ['--activated-effect']: "#77adad",
    ['--item-selected']: "#ac45d5a6",

    ['--action-point']: "#610064",
    ['--stamina']: "#b86b0d",
    ['--mana']: "#124b8b",
    ['--health-point']: "#921a1a",
    ['--health']: "#138241",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",
  }
}
function _darkColors() {
  return {
    ['--primary-color']: "#741a89",
    ['--primary-light']: "#917996",
    ['--primary-dark']: "#5a265f",
    ['--primary-darker']: "#3f0344",

    ['--background-color']: "#00000078",
    ['--background-banner']: "#6c0097b0",

    ['--secondary-color']: "#c0c0c0",
    ['--secondary-dark']: "#646464",
    ['--secondary-darker']: "#262626",
    ['--secondary-lighter']: "#dfdfdf",
    ['--secondary-light-alpha']: "#dfdfdfcc",
    ['--menu-line']: "#0000003b",

    ['--golden']: "#ecde1e",
    ['--dark-red']: "#b20000",

    ['--unequipped']: "#c5c5c5a3",
    ['--equipped']: "#88a16f",
    ['--attuned']: "#c7c172",
    ['--activated-effect']: "#77adad",
    ['--item-selected']: "#ac45d5a6",

    ['--action-point']: "#610064",
    ['--stamina']: "#b86b0d",
    ['--mana']: "#124b8b",
    ['--health-point']: "#921a1a",
    ['--health']: "#138241",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",
  }
}

export class ColorSetting extends FormApplication {

  constructor(dialogData = {title: "Color Palete Selection"}, options = {}) {
    super(dialogData, options);
    this.selectedKey = game.settings.get("dc20rpg", "selectedColor");
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/color-settings.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  getData() {
    const selectedKey = this.selectedKey;
    const selected = this._getColor(selectedKey);
    return {
      choices: this._getColorChoices(),
      selectedKey: selectedKey,
      selected: selected,
      userIsGM: game.user.isGM
    };
  }

  _getColorChoices() {
    const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
    const keys = {};
    for(let colorKey of Object.keys(colorPalete)) {
      keys[colorKey] = colorKey;
    }
    return keys;
  }

  _getColor(selectedKey) {
    const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
    return colorPalete[selectedKey];
  }

  _updateObject() {}

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev));
    html.find(".save").click(ev => this._onSave(ev));
    html.find(".update").click(ev => this._onUpdate(ev, html));

    html.find('.add-new').click(ev => this._createNewColor(ev, html));
    html.find('.remove-selected').click(ev => this._removeSelected(ev));
  }

  async _createNewColor(event, html) {
    event.preventDefault();
    const newColorKey = html.find('.new-color-selector')[0].value;
    if (newColorKey && newColorKey !== "default") {
      const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
      const dft = this._getColor("default");
      colorPalete[newColorKey] = dft;
      await game.settings.set("dc20rpg", "colorPaleteStore", colorPalete);
      this.selectedKey = newColorKey;
      this.render(true);
    }
    else {
      ui.notifications.error("You need to provide valid key first"); 
    }
  }

  async _removeSelected(event){
    event.preventDefault();
    const selectedKey = event.currentTarget.dataset.key;
    const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
    delete colorPalete[selectedKey];
    await game.settings.set("dc20rpg", "colorPaleteStore", colorPalete);
    this.selectedKey = "default";
    this.render(true);
  }

  _onSelection(event) {
    event.preventDefault();
    this.selectedKey = event.currentTarget.value;
    this.render(true);
  }

  async _onSave(event) {
    event.preventDefault();
    await game.settings.set("dc20rpg", "selectedColor", this.selectedKey);
    this.close();
  }

  async _onUpdate(event, html) {
    const selectedKey = this.selectedKey;
    const selected = this._getColor(selectedKey);
    const inputs = html.find('.update-color-value');

    Object.values(inputs).forEach(input => {
      if (input.dataset) {
        const key = input.dataset.key;
        const value = input.value;
        selected[key] = value;
      }
    })

    const colorPalete = game.settings.get("dc20rpg", "colorPaleteStore");
    colorPalete[selectedKey] = selected;
    await game.settings.set("dc20rpg", "colorPaleteStore", colorPalete);
    this._onSave(event)
  }
}