import { DC20Dialog } from "../../dialogs/dc20Dialog.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import DC20RpgActiveEffect from "../../documents/activeEffect.mjs";
import { DC20RpgTokenDocument } from "../../documents/token.mjs";
import { runTemporaryMacro } from "../../helpers/macros.mjs";
import { DC20RpgActorSheet } from "../../sheets/actor-sheet.mjs";
import { DC20ItemSheet } from "../../sheets/item-sheet.mjs";
import { gmCreate } from "../../helpers/sockets.mjs";

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
  preventEffectRemoval = false;
  preCreation = "";
  postCreation = "";

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
    this.minimized = [];
    if (!this.type) {
      ui.notifications.error("You need to specify Area type first!") 
      return;
    }

    if (!options.token) this.#minimizeApps();
    const data = this.#prepareData(options);
    await this.#runMacro("preCreation", {data: data, options: options});
    const region = options.token ? await this.#placeOnToken(options.token, data) : await this.#placeOnSelector(data);
    this.#maximizeApps();
    this.#handleSustain(region, options.sustain);
    await this.#runMacro("postCreation", {region: region, options: options});
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
    data.attachment = {token: token.document.id};
    
    return await this.#createRegion(data);
  }

  async #placeOnSelector(data) {
    const region = await canvas.regions.placeRegion(data, {attachToToken: this.attachToToken, create: false});
    if (!region) return;
    return await this.#createRegion(region.toObject());
  }

  async #createRegion(data) {
    const regions = await gmCreate(data, {parent: canvas.scene, forceGM: !game.user.isGM}, CONFIG.Region.documentClass);
    return regions?.[0];
  }

  #prepareData(options={}) {
    const typeLabel = CONFIG.DC20RPG.DROPDOWN_DATA.areaTypes[this.type];
    const name = this.areaData?.itemName ? `${this.areaData.itemName} - ${typeLabel}` : typeLabel;
    const flags = {
      dc20rpg: foundry.utils.mergeObject(
        {
          img: this.areaData?.itemImg,
          applyDtFor: this.#resolveTokenDisposition(this.difficultTerrain),
        }, 
        options.flags
      ) 
    }

    const data = {
      name: name,
      flags: flags,
      shapes: this.#regionShapes(),
      color: game.user.color,
      levels: [canvas.level.id],
      highlightMode: "coverage",
      displayMeasurements: false,
      visibility: this.hideHighlight ? CONST.REGION_VISIBILITY.LAYER : CONST.REGION_VISIBILITY.ALWAYS,
      restriction: {enabled: this.blockByWalls},
      ownership: {[game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}
    };
    
    // We want to skip that for target mode
    if (!options.targetMode) data.behaviors = this.#prepareBehaviors();
    return data;
  }

  #prepareBehaviors() {
    const behaviors = [];

    if (this.difficultTerrain) {
      behaviors.push({
        name: "Difficult Terrain",
        type: "modifyMovementCost",
        system: {
          difficulties: {ground: 2, swimming: 1, glide: 1, flying: 1, climbing: 1, burrow: 1}
        }
      })
    }
    if (this.effects.length > 0) {
      const scriptData = {
        effects: foundry.utils.deepClone(this.effects),
        applyEffectsFor: this.#resolveTokenDisposition(this.applyEffectsFor),
        scriptId: foundry.utils.randomID(14),
        areaOwnerId: game.user.id
      };
      behaviors.push({
        name: "Apply Effects",
        type: "executeScript",
        system: {
          events: ["tokenEnter"],
          source: `DC20.Area.applyEffectScript(${JSON.stringify(scriptData)}, event);`
        }
      })
      behaviors.push({
        name: "Delete Effects",
        type: "executeScript",
        system: {
          events: ["tokenExit"],
          source: `DC20.Area.removeEffectScript(${JSON.stringify(scriptData.scriptId)}, ${this.preventEffectRemoval}, event);`
        }
      })
    }

    return behaviors;
  }

  static async applyEffectScript(scriptData, event) {
    if (!game.user.isActiveGM) return;
    const token = event?.data?.token;
    const actor = token?.actor;
    if (!actor) return;

    const applyFor = scriptData.applyEffectsFor;
    let apply = false;
    if (applyFor === "never") return;
    else if (applyFor === "all") apply = true;
    else if (applyFor === "ask") {
      apply = await SimplePopup.open("confirm", 
        {header: `Apply Effect`, message: `Do you want to apply Area Effect to '${token.name}'`, confirmLabel: "Apply", denyLabel: "Do not apply"}, 
        {users: [scriptData.areaOwnerId]}
      )
    }
    else apply = applyFor.includes(token.disposition);
    if (!apply) return;

    for (const effect of scriptData.effects) {
      effect.flags.dc20rpg.scriptId = scriptData.scriptId;
      await DC20RpgActiveEffect.gmCreate(effect, {parent: actor, ignoreResponse: true});
    }
  }

  static async removeEffectScript(scriptId, preventEffectRemoval, event) {
    if (!game.user.isActiveGM) return;
    if (preventEffectRemoval) return;
    const token = event?.data?.token;
    const actor = token?.actor;
    if (!actor) return;

    for (const effect of actor.allEffects) {
      if (effect.flags?.dc20rpg?.scriptId === scriptId) await effect.gmDelete({ignoreResponse: true});
    }
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

  async #runMacro(macroKey, data) {
    const command = this[macroKey];
    if (!command) return;
    await runTemporaryMacro(command, {name: "Area Macro"}, {area: this, ...data});
  }

  #resolveTokenDisposition(type) {
    if (!this.actor) return "all"; // In that case we assume it should be applied to all
    
    const token = this.actor.getActiveTokens()[0];
    const disposition = token ? token.document.disposition : this.actor.prototypeToken.disposition;
    if (type === "enemy") {
      return DC20RpgTokenDocument.getEnemyTokenDispositionsFor(disposition);
    }
    if (type === "ally") {
      return DC20RpgTokenDocument.getFriendlyTokenDispositionsFor(disposition);
    }
    if (type === "") return "never";
    return type;
  }
} 
