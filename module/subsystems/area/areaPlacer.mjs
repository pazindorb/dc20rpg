import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { TokenSelector } from "../../dialogs/token-selector.mjs";
import { getTokensInsideRegion } from "../../helpers/utils.mjs";
import { Area } from "./area.mjs";

export class AreaPlacer extends DC20Dialog {

  static async create(areas, options={}) {
    new AreaPlacer(areas, options).render(true);
  }

  constructor(areas={}, options={}) {
    super(options);
    const values = Object.values(areas);
    this.areaOptions = options;
    this.areas = values.map(area => Area.enrich(area, options));
    if (this.areas.length === 0) {
      ui.notifications.error("There is no area to place!");
      this.close();
    }
  }

  static PARTS = {
    root: {
      template: "systems/dc20rpg/templates/dialogs/area-placer-dialog.hbs",
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dc20rpg", "dialog"]
    });
  }

  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);
    initialized.window.title = "Area Placer";
    initialized.window.icon = "fa-solid fa-bullseye";
    initialized.position.width = 450;

    initialized.actions.add = (event, target) => this.#onChangeSpace(parseInt(target.dataset.index), true);
    initialized.actions.subtract = (event, target) => this.#onChangeSpace(parseInt(target.dataset.index), false);
    initialized.actions.addWidth = (event, target) => this.#onChangeSpace(parseInt(target.dataset.index), true, true);
    initialized.actions.subtractWidth = (event, target) => this.#onChangeSpace(parseInt(target.dataset.index), false, true);
    initialized.actions.place = this._onPlaceArea;
    return initialized;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.areas = this.areas.map(area => {
      const unit = area.unit || "Spaces";
      const type = area.type;

      let label =  game.i18n.localize(`dc20rpg.area.${type}`);
      if (["ring", "wall", "line"].includes(type)) {
        label += ` (${area.distance}/${area.width} ${unit})`;
      }
      else {
        label += ` (${area.distance} ${unit})`;
      }

      area.label = label;
      return area;
    });
    return context;
  }

  #onChangeSpace(index, up, width) {
    const area = this.areas[index];
    if (!area) return;

    if (width) {
      if (up) area.width += 1;
      else area.width -= 1;
    }
    else {
      if (up) area.distance += 1;
      else area.distance -= 1;
    }
    this.render();
  }

  async _onPlaceArea(event, target) {
    if (this.areaPlacing) return;

    const index = parseInt(target.dataset.index);
    const area = this.areas[index];
    if (!area) return;

    area.placing = true;
    this.areaPlacing = true;
    this.render();

    if (this.areaOptions.tokenId && area.attachToToken && area.selfOnly) {
      this.areaOptions.token = canvas.tokens.placeables.find(token => token.id === this.areaOptions.tokenId);
    }
    const region = await area.place(this.areaOptions);
    if (region) {
      this.close();
      if (this.areaOptions.targetMode) {
        this.#openTokenSelector(region);
      }
    }
    else {
      this.areaPlacing = false;
      area.placing = false;
      this.render();
    }
  }

  async #openTokenSelector(region) {
    const tokens = getTokensInsideRegion(region);
    if (tokens.length > 0) {
      const placeables = tokens.map(token => token.object);
      const selected = await TokenSelector.open(placeables);
      const tokenIds = selected.map(token => token.id)
      canvas.tokens.setTargets(tokenIds, {mode: "replace"});
    }
    region.delete();
  }
}

export function openAreaPlacer(areas, options) {
  new AreaPlacer(areas, options).render(true);
}