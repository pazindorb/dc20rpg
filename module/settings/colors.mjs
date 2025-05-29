export function prepareColorPalette() {
  // Set color Palette
  const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
  let color = colorPalette[game.settings.get("dc20rpg", "selectedColor")];
  if (!color) color = colorPalette["default"];

  const root = document.documentElement.style;
  Object.entries(color).forEach(([key, color]) => root.setProperty(key, color));
}

export function defaultColorPalette() {
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

    ['--table-1']: "#5a265f",
    ['--table-2']: "#48034e",

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
    ['--grit']: "#7a0404",

    ['--health-bar']: "#6fde75",
    ['--temp-health-bar']: "#ccac7d",
    ['--stamina-bar']: "#e1d676",
    ['--mana-bar']: "#81a3e7",
    ['--grit-bar']: "#b36363",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",

    // NPC Sheet
    ['--npc-main']: "#1f268d",
    ['--npc-main-light']: "#534d69",
    ['--npc-main-lighter']: "#6876a7",
    ['--npc-main-dark']: "#0e1250",
    ['--npc-secondary']: "#c0c0c0",
    ['--npc-secondary-light']: "#dfdfdf",
    ['--npc-secondary-light-alpha']: "#dfdfdfcc",
    ['--npc-secondary-dark']: "#646464",
    ['--npc-secondary-darker']: "#262626",
    ['--npc-text-color-1']: "#ffffff",
    ['--npc-text-color-2']: "#000000",
    ['--npc-background']: "transparent",
    ['--npc-table-1']: "#262a69",
    ['--npc-table-2']: "#050947",
    ['--npc-header-image-color']: "#2442c9a3",
    ['--npc-sidetab-image-color']: "#2442c9a3",

    // PC Sheet
    ['--pc-main']: "#5d178b",
    ['--pc-main-light']: "#534d69",
    ['--pc-main-lighter']: "#786188",
    ['--pc-main-dark']: "#2b0e50",
    ['--pc-secondary']: "#c0c0c0",
    ['--pc-secondary-light']: "#dfdfdf",
    ['--pc-secondary-light-alpha']: "#dfdfdfcc",
    ['--pc-secondary-dark']: "#646464",
    ['--pc-secondary-darker']: "#262626",
    ['--pc-text-color-1']: "#ffffff",
    ['--pc-text-color-2']: "#000000",
    ['--pc-background']: "transparent",
    ['--pc-table-1']: "#573085",
    ['--pc-table-2']: "#290547",
    ['--pc-header-image-color']: "#44116ba3",
    ['--pc-sidetab-image-color']: "#431169a3",
    ['--pc-unique-item-color']: "#ac45d5a6",

    // Storage Sheet
    ['--storage-main']: "#1f268d",
    ['--storage-main-light']: "#534d69",
    ['--storage-main-lighter']: "#6876a7",
    ['--storage-main-dark']: "#0e1250",
    ['--storage-secondary']: "#c0c0c0",
    ['--storage-secondary-light']: "#dfdfdf",
    ['--storage-secondary-light-alpha']: "#dfdfdfcc",
    ['--storage-secondary-dark']: "#646464",
    ['--storage-secondary-darker']: "#262626",
    ['--storage-text-color-1']: "#ffffff",
    ['--storage-text-color-2']: "#000000",
    ['--storage-background']: "transparent",
    ['--storage-table-1']: "#262a69",
    ['--storage-table-2']: "#050947",
    ['--storage-header-image-color']: "#3c8316a3",
    ['--storage-sidetab-image-color']: "#3c8316a3",
  }
}

function _darkColors() {
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

    ['--table-1']: "#5a265f",
    ['--table-2']: "#48034e",

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
    ['--grit']: "#7a0404",

    ['--health-bar']: "#6fde75",
    ['--temp-health-bar']: "#ccac7d",
    ['--stamina-bar']: "#e1d676",
    ['--mana-bar']: "#81a3e7",
    ['--grit-bar']: "#b36363",

    ['--crit']: "#0e8b1e",
    ['--crit-background']: "#4f9f5c",
    ['--fail']: "#b10000",
    ['--fail-background']: "#914a4a",

    // NPC Sheet
    ['--npc-main']: "#1f268d",
    ['--npc-main-light']: "#534d69",
    ['--npc-main-lighter']: "#6876a7",
    ['--npc-main-dark']: "#0e1250",
    ['--npc-secondary']: "#c0c0c0",
    ['--npc-secondary-light']: "#dfdfdf",
    ['--npc-secondary-light-alpha']: "#dfdfdfcc",
    ['--npc-secondary-dark']: "#646464",
    ['--npc-secondary-darker']: "#262626",
    ['--npc-text-color-1']: "#ffffff",
    ['--npc-text-color-2']: "#9fa3d1",
    ['--npc-background']: "#303030",
    ['--npc-table-1']: "#262a69",
    ['--npc-table-2']: "#050947",
    ['--npc-header-image-color']: "#2442c9a3",
    ['--npc-sidetab-image-color']: "#2442c9a3",

    // PC Sheet
    ['--pc-main']: "#3d0f5c",
    ['--pc-main-light']: "#534d69",
    ['--pc-main-lighter']: "#786188",
    ['--pc-main-dark']: "#2b0e50",
    ['--pc-secondary']: "#c0c0c0",
    ['--pc-secondary-light']: "#dfdfdf",
    ['--pc-secondary-light-alpha']: "#dfdfdfcc",
    ['--pc-secondary-dark']: "#646464",
    ['--pc-secondary-darker']: "#262626",
    ['--pc-text-color-1']: "#ffffff",
    ['--pc-text-color-2']: "#d0c1e2",
    ['--pc-background']: "#303030",
    ['--pc-table-1']: "#573085",
    ['--pc-table-2']: "#290547",
    ['--pc-header-image-color']: "#371452a3",
    ['--pc-sidetab-image-color']: "#371452a3",
    ['--pc-unique-item-color']: "#ac45d5a6",

    // Storage Sheet
    ['--storage-main']: "#1f268d",
    ['--storage-main-light']: "#534d69",
    ['--storage-main-lighter']: "#6876a7",
    ['--storage-main-dark']: "#0e1250",
    ['--storage-secondary']: "#c0c0c0",
    ['--storage-secondary-light']: "#dfdfdf",
    ['--storage-secondary-light-alpha']: "#dfdfdfcc",
    ['--storage-secondary-dark']: "#646464",
    ['--storage-secondary-darker']: "#262626",
    ['--storage-text-color-1']: "#ffffff",
    ['--storage-text-color-2']: "#000000",
    ['--storage-background']: "#303030",
    ['--storage-table-1']: "#262a69",
    ['--storage-table-2']: "#050947",
    ['--storage-header-image-color']: "#2442c9a3",
    ['--storage-sidetab-image-color']: "#2442c9a3",
  }
}

export class ColorSetting extends FormApplication {

  constructor(dialogData = {title: "Color Palette Selection"}, options = {}) {
    super(dialogData, options);
    this.selectedKey = game.settings.get("dc20rpg", "selectedColor");
    this.liveRefresh = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/color-settings.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"],
      tabs: [{ navSelector: ".navigation", contentSelector: ".body", initial: "core" }],
    });
  }

  getData() {
    let selectedKey = this.selectedKey;
    let selected = this._getColor(selectedKey);
    if (!selected) {
      selectedKey = "default";
      selected = this._getColor(selectedKey);
    }
    return {
      choices: this._getColorChoices(),
      selectedKey: selectedKey,
      selected: this._groupColors(selected),
      userIsGM: game.user.isGM,
      liveRefresh: this.liveRefresh
    };
  }

  _groupColors(selected) {
    const core = {};
    const pc = {};
    const npc = {};
    const storage = {};
    const other = {};

    Object.entries(selected).forEach(([key, color]) => {
      if (key.startsWith("--pc")) pc[key] = color;
      else if (key.startsWith("--npc")) npc[key] = color;
      else if (key.startsWith("--storage")) storage[key] = color;
      else if (key.startsWith("--primary") || key.startsWith("--secondary")) core[key] = color;
      else other[key] = color;
    })
    return {
      core: core,
      pc: pc,
      npc: npc,
      storage: storage,
      other: other
    }
  }

  _getColorChoices() {
    const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
    const keys = {};
    for(let colorKey of Object.keys(colorPalette)) {
      keys[colorKey] = colorKey;
    }
    return keys;
  }

  _getColor(selectedKey) {
    const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
    return colorPalette[selectedKey];
  }

  _updateObject() {}

  _liveUpdateStyles() {
    if (!this.liveRefresh) return;
    const selectedColor = this._getColor(this.selectedKey);
    const root = document.documentElement.style
    Object.entries(selectedColor).forEach(([key, color]) => root.setProperty(key, color));
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev));
    html.find(".save").click(ev => this._onSave(ev));
    html.find(".update").click(ev => this._onUpdate(ev, html));

    html.find('.add-new').click(ev => this._createNewColor(ev, html));
    html.find('.remove-selected').click(ev => this._removeSelected(ev));
    html.find('.live-refresh').click(ev => this._onLiveRefresh(ev));

    // Export/Import
    html.find('.export').click(() => this._onExport());
    html.find('.import').click(() => this._onImport());
  }

  async _createNewColor(event, html) {
    event.preventDefault();
    const newColorKey = html.find('.new-color-selector')[0].value;
    if (newColorKey && newColorKey !== "default") {
      const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
      const dft = this._getColor("default");
      colorPalette[newColorKey] = dft;
      await game.settings.set("dc20rpg", "colorPaletteStore", colorPalette);
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
    const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
    delete colorPalette[selectedKey];
    await game.settings.set("dc20rpg", "colorPaletteStore", colorPalette);
    this.selectedKey = "default";
    this.render(true);
  }

  _onSelection(event) {
    event.preventDefault();
    this.selectedKey = event.currentTarget.value;
    this._liveUpdateStyles();
    this.render(true);
  }

  async _onSave(event) {
    event.preventDefault();
    await game.settings.set("dc20rpg", "selectedColor", this.selectedKey);
    this.close();
  }

  async _onUpdate(event, html) {
    event.preventDefault();
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

    const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
    colorPalette[selectedKey] = selected;
    await game.settings.set("dc20rpg", "colorPaletteStore", colorPalette);
    this._liveUpdateStyles();
  }

  _onLiveRefresh(event) {
    event.preventDefault();
    this.liveRefresh = !this.liveRefresh;
    this._liveUpdateStyles();
    this.render(true);
  }

  _onExport() {
    const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
    const toExport = colorPalette[this.selectedKey];
    toExport.paletteKey = this.selectedKey;
    createTextDialog(JSON.stringify(toExport), "Export Palette");
  }

  async _onImport() {
    const toImport = await createTextDialog("", "Import Palette");
    if (toImport) {
      try {
        const newPalette = JSON.parse(toImport);
        const newKey = newPalette.paletteKey;
        delete newPalette.paletteKey;

        const colorPalette = game.settings.get("dc20rpg", "colorPaletteStore");
        if (colorPalette[newKey]) {
          ui.notifications.warn(`Color Palette with key '${newKey}' already exist.`); 
          return;
        }
        colorPalette[newKey] = newPalette;
        await game.settings.set("dc20rpg", "colorPaletteStore", colorPalette);
        this.selectedKey = newKey;
        this.render(true);
      } 
      catch(error) {
        ui.notifications.error(`Cannot import Color Palette - error: ${error}`); 
      }
    }
  }
}

async function createTextDialog(text, title) {
  return new Promise((resolve, reject) => {
    // Create the dialog
    let dialog = new Dialog({
      title: title,
      content: `
        <div>
          <textarea id="input-string" name="input-string" rows="5" style="width: 383px; height: 500px">${text}</textarea>
        </div>
      `,
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: title,
          callback: (html) => {
            const userInput = html.find('[name="input-string"]').val();
            resolve(userInput);
          }
        },
      },
      default: "submit", 
    });
    dialog.render(true);
  });
}