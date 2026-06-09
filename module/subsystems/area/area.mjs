import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { DC20RpgActorSheet } from "../../sheets/actor-sheet.mjs";
import { DC20ItemSheet } from "../../sheets/item-sheet.mjs";

export class Area {
  type = "";
  distance = 1;
  width = 1;
  height = 1;
  unit = "";

  alwaysActive = false;
  selfOnly = false;
  linkWithToggle = false;
  attachToToken = false;
  hideHighlight = false;
  blockByWalls = true;
  
  effect = null;
  difficultTerrain = "";
  applyEffectsFor = "";
  macro = "";

  constructor(data) {
    foundry.utils.mergeObject(this, data);
  }

  static async create(data={}, options={}) {
    const item = options.parent;
    if (!item) {
      ui.notifications.error("Item does not exist. Cannot use creator.");
      return;
    }

    const area = foundry.utils.mergeObject(new Area(), data);
    const key = options.key ? options.key : foundry.utils.randomID();
    await item.update({[`system.areas.${key}`]: {...area}});
    return key;
  }

  // DB objects cannot store methods, we need to add them to the item area
  static enrich(area, options) {
    const { areaData, effects, actor } = options;

    const enriched = foundry.utils.mergeObject(new Area(), area);
    enriched.areaData = areaData || null;
    enriched.effects = effects || [];
    enriched.actor = actor || null;
    enriched.hasWidth = ["wall", "line", "ring"].includes(enriched.type);
    if (area.effect) enriched.effects.push(area.effect); // Add area specific effect
    return enriched;
  }

  async place(options={}) {
    if (!this.type) {
      ui.notifications.error("You need to specify Area type first!") 
      return;
    }

    this.#minimizeApps();
    const data = this.#prepareData(options);
    const region = options.token ? await this.#placeOnToken(options.token, data) : await this.#placeOnSelector(data);
    this.#maximizeApps();
    this.#handleSustain(region, options.sustain);
    return region;
  }

  async #placeOnToken(token, data) {
    const shapes = foundry.utils.deepClone(data.shapes)
    for (const shape of shapes) {
      if (shape.base?.type === "token") {
        shape.base.x = token.document.x;
        shape.base.y = token.document.y;
        shape.base.width = token.document.width;
        shape.base.height = token.document.height;
        shape.base.shape = token.document.shape;
      }
      else {
        shape.x = token.center.x,
        shape.y = token.center.y
      }
    }
    data.shapes = shapes;
    data.attachment = {token: token.document};
    
    return await CONFIG.Region.documentClass.create(data, {parent: canvas.scene})
  }

  async #placeOnSelector(data) {
    return await canvas.regions.placeRegion(data, {attachToToken: this.attachToToken});
  }

  #prepareData(options={}) {
    const typeLabel = CONFIG.DC20RPG.DROPDOWN_DATA.areaTypes[this.type];
    const name = !!this.areaData ? `${this.areaData.name} - ${typeLabel}` : typeLabel;
    const data = {
      name: name,
      shapes: this.#regionShapes(),
      color: this.hideHighlight ? "#ffffff" : game.user.color,
      restriction: {enabled: true},
      levels: [canvas.level.id],
      highlightMode: "coverage",
      displayMeasurements: false,
      visibility: CONST.REGION_VISIBILITY.OBSERVER,
      restriction: {enabled: this.blockByWalls},
      ownership: {[game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}
    };
    
    // We want to skip that for target mode
    if (!options.targetMode) {
      // data.behaviors = TODO PREPARE BASED ON ITEM AND STUFF

      // trigger macro
    }
    
    return data;
  }

  #regionShapes() {
    const distancePixels = canvas.dimensions.distancePixels;
    const distance = this.distance * distancePixels;
    const width = this.width ? this.width * distancePixels : distancePixels;

    const shapes = [];
    const shape = {x: 0, y: 0};
    switch (this.type) {
      case "arc": 
        shape.type = "cone";
        shape.radius = distance;
        shape.angle = 180;
        break;

      case "cone":
        shape.type = "cone";
        shape.radius = distance;
        shape.angle = 90;
        break;

      case "aura":
        shape.type = "emanation";
        shape.radius = distance;
        shape.base = {type: "token", x: 0, y: 0, width: 1, height: 1, shape: canvas.grid.type}
        break;

      case "cylinder": case "sphere": case "dome":
        // Sphere use diameter, so we need to cut distance it in half
        shape.type = "circle";
        shape.radius = distance / 2;
        break;

      case "ring": 
        // Ring use diameter, so we need to cut distance it in half
        // TODO: Ring wymaga dopracowania - jego grubość czasem psuje highlight
        shape.type = "ring";
        shape.radius = distance / 2;
        shape.innerWidth = width;
        shape.outerWidth = 0;
        break;

      case "line": case "wall":
        shape.type = "line";
        shape.length = distance;
        shape.width = width;
        break;

      case "zone":
        shape.type = "token";
        shape.width = 1;
        shape.height = 1;
        shape.shape = canvas.grid.isGridless ? CONST.TOKEN_SHAPES.RECTANGLE_1 : canvas.grid.type;

        // shape.
        for (let i = 1; i < this.distance; i++) shapes.push(shape);
        break;
    }

    shape.gridBased = true;
    shapes.push(shape);
    return shapes;
  }

  #minimizeApps() {
    const minimized = [];
    foundry.applications.instances.forEach(app => {
      if (app instanceof DC20Dialog || app instanceof DC20ItemSheet || app instanceof DC20RpgActorSheet) {
        if (!app.minimized) {
          app.minimize();
          minimized.push(app);
        }
      }
    })
    Object.values(ui.windows).forEach(app => {
      if (app instanceof FormApplication || app instanceof DC20RpgActorSheet) {
        if (!app._minimized) {
          app.minimize();
          minimized.push(app);
        }
      }
    })
    this.minimized = minimized;
  }

  #maximizeApps() {
    this.minimized.forEach(app => app.maximize());
    this.minimized = [];
  }

  async #handleSustain(region, sustain) {
    if (!region || !sustain) return;
    const actor = await fromUuid(sustain.actorUuid)
    if (actor) actor.addRegionToSustain(sustain.itemId, region.uuid);
  }
} 
