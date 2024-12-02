import { subtractMovePoints } from "../helpers/actors/actions.mjs";
import { getPointsOnLine } from "../helpers/utils.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { getStatusWithId } from "../statusEffects/statusUtils.mjs";

export class DC20RpgTokenDocument extends TokenDocument {

  /**@override*/
  prepareData() {
    this._prepareSystemSpecificVisionModes();
    this._setTokenSize();
    super.prepareData();
    // Refresh existing token if exist
    if (this.object) this.object.refresh();
  }

  _prepareSystemSpecificVisionModes() {
    if (!this.sight.enabled) return; // Only when using vision
    const senses = this.actor.system.senses;
    const sight = this.sight;
    const detection = this.detectionModes;

    // Darkvision
    if (senses.darkvision.value > 0) {
      const defaults = CONFIG.Canvas.visionModes.darkvision.vision.defaults;
      sight.visionMode = "darkvision";
      sight.range = senses.darkvision.value;
      sight.attenuation = defaults.attenuation;
      sight.brightness = defaults.brightness;
      sight.contrast = defaults.contrast;
      sight.saturation = defaults.saturation;
    }

    // Tremorsense
    if (senses.tremorsense.value > 0) {
      detection.push({
        id: "feelTremor",
        enabled: true,
        range: senses.tremorsense.value
      })
    }

    // Blindsight
    if (senses.blindsight.value > 0) {
      detection.push({
        id: "seeInvisibility",
        enabled: true,
        range: senses.blindsight.value
      })
    }

    // Truesight
    if (senses.truesight.value > 0) {
      detection.push({
        id: "seeAll",
        enabled: true,
        range: senses.truesight.value
      })
    }
  }

  _setTokenSize() {
    const size = this.actor.system.size.size;

    switch(size) {
      case "large":
        this.width = 2;
        this.height = 2;
        break;

      case "huge":
        this.width = 3;
        this.height = 3;

      case "gargantuan":
        this.width = 4;
        this.height = 4;
    }
  }

  hasStatusEffect(statusId) {
    return this.actor?.hasStatus(statusId) ?? false;
  }

  async _preUpdate(changed, options, user) {
    const freeMove = game.keyboard.downKeys.has("KeyF");
    if (changed.hasOwnProperty("x") && changed.hasOwnProperty("y") && !freeMove) {
      const startPosition = {x: this.x, y: this.y};
      const costFunction = canvas.grid.isGridless 
                              ? (from, to, distance) => this.costFunctionGridless(from, to, distance, this) 
                              : (from, to, distance) => this.costFunctionGrid(from, to, distance, this);
      const pathCost = canvas.grid.measurePath([startPosition, changed], {cost: costFunction}).cost;
      
      const slowed = getStatusWithId(this.actor, "slowed")?.stack || 0;
      const finalCost = pathCost + slowed;
      const subtracted = await subtractMovePoints(this.actor, finalCost);
      if (!subtracted) return false;
    }
    super._preUpdate(changed, options, user);
  }

  costFunctionGrid(from, to, distance) {
    if (DC20RpgMeasuredTemplate.isDifficultTerrain(from.i, from.j)) return 2;
    return 1;
  }

  costFunctionGridless(from, to, distance, tokenDoc) {
    let finalCost = 0;
    let traveled = 0;

    const travelPoints = getPointsOnLine(from.j, from.i, to.j, to.i, canvas.grid.size);
    for (let i = 0; i < travelPoints.length-1; i++) {
      const x = travelPoints[i].x;
      const y = travelPoints[i].y;
      if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y)) finalCost += 2;
      else finalCost += 1;
      traveled +=1;
    }
    
    const distanceLeft = distance - traveled;
    if (distanceLeft >= 0.1) {
      const multiplier = DC20RpgMeasuredTemplate.isDifficultTerrain(travelPoints[travelPoints.length-1].x, travelPoints[travelPoints.length-1].y) ? 2 : 1;
      finalCost += distanceLeft * multiplier;
    }
    return finalCost;
  }
}