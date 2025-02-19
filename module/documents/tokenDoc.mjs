import { snapTokenToTheClosetPosition, spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { getPointsOnLine } from "../helpers/utils.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { getStatusWithId } from "../statusEffects/statusUtils.mjs";
import { runEventsFor } from "../helpers/actors/events.mjs";

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
      if (sight.visionMode === "basic") sight.visionMode = "darkvision";
      if (senses.darkvision.value > sight.range) sight.range = senses.darkvision.value;
      if (sight.saturation === 0) sight.saturation = defaults.saturation;
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
    const size = this.actor.system.size;
    if (this.flags?.dc20rpg?.notOverrideSize) return;

    switch(size.size) {
      case "tiny":
        this.width = 0.5;
        this.height = 0.5;
        break;

      case "small": case "medium": case "mediumLarge":
        this.width = 1;
        this.height = 1;
        break;

      case "large":
        this.width = 2;
        this.height = 2;
        break;

      case "huge":
        this.width = 3;
        this.height = 3;
        break;

      case "gargantuan":
        this.width = 4;
        this.height = 4;
    }
  }

  hasStatusEffect(statusId) {
    return this.actor?.hasStatus(statusId) ?? false;
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id && this.actor) {
      if (changed.hasOwnProperty("x") || changed.hasOwnProperty("y")) {
        runEventsFor("move", this.actor);
      }
    }
  }

  movementData = {};
  async _preUpdate(changed, options, user) {
    const freeMove = game.keyboard.downKeys.has("KeyF");
    const teleport = options.teleport;
    if ((changed.hasOwnProperty("x") || changed.hasOwnProperty("y")) && !freeMove && !teleport) {
      const startPosition = {x: this.x, y: this.y};
      if (!changed.hasOwnProperty("x")) changed.x = startPosition.x;
      if (!changed.hasOwnProperty("y")) changed.y = startPosition.y;

      const ignoreDT = game.settings.get("dc20rpg", "disableDifficultTerrain") || this.actor.system.globalModifier.ignore.difficultTerrain;
      const occupiedSpaces = this.object.getOccupiedGridSpaces();
      this.movementData = {
        slowed: getStatusWithId(this.actor, "slowed")?.stack || 0,
        ignoreDT: ignoreDT
      };
      const costFunction = canvas.grid.isGridless 
                              ? (from, to, distance) => this.costFunctionGridless(from, to, distance, this.movementData, this.width) 
                              : (from, to, distance) => this.costFunctionGrid(from, to, distance, this.movementData, occupiedSpaces);
      const pathCost = canvas.grid.measurePath([startPosition, changed], {cost: costFunction}).cost;
      let subtracted = await subtractMovePoints(this, pathCost, options);
      // Spend extra AP to move
      if (subtracted !== true && game.settings.get("dc20rpg","askToSpendMoreAP")) {
        subtracted = await spendMoreApOnMovement(this.actor, subtracted);
      }
      // Snap to closest available position
      if (subtracted !== true && game.settings.get("dc20rpg","snapMovement")) {
        [subtracted, changed] = snapTokenToTheClosetPosition(this, subtracted, startPosition, changed, this.costFunctionGridless, this.costFunctionGrid);
      }
      // Do not move the actor
      if (subtracted !== true) {
        ui.notifications.warn("Not enough movement! If you want to make a free move hold 'F' key.");
        return false;
      }
    }
    super._preUpdate(changed, options, user);
  }

  costFunctionGrid(from, to, distance, movementData, occupiedSpaces) {
    const slowed = movementData.slowed;
    if (movementData.ignoreDT) return 1 + slowed;

    // In the first iteration we want to prepare absolute spaces occupied by the token
    if (!movementData.absoluteSpaces) {
      movementData.absoluteSpaces = occupiedSpaces.map(space => [space[0] - from.j, space[1] - from.i]);
    }

    const absolute = movementData.absoluteSpaces;
    let lastDifficultTerrainSpaces = movementData.lastDifficultTerrainSpaces || 0;
    let currentDifficultTerrainSpaces = 0;
    for (let i = 0; i < absolute.length; i++) {
      if (DC20RpgMeasuredTemplate.isDifficultTerrain(absolute[i][1] + from.i, absolute[i][0] + from.j)) {
        currentDifficultTerrainSpaces++
      }
    }
    movementData.lastDifficultTerrainSpaces = currentDifficultTerrainSpaces;

    // When we are reducing number of difficult terrain spaces in might mean that we are leaving difficult terrain
    if (currentDifficultTerrainSpaces > 0 && currentDifficultTerrainSpaces >= lastDifficultTerrainSpaces) return 2 + slowed;
    return 1 + slowed;
  }

  costFunctionGridless(from, to, distance, movementData, tokenWidth) {
    const slowed = movementData.slowed;
    let finalCost = 0;
    let traveled = 0;
    const gridSize = canvas.grid.size;
    const z = gridSize * tokenWidth;

    const travelPoints = getPointsOnLine(from.j, from.i, to.j, to.i, canvas.grid.size);
    for (let i = 0; i < travelPoints.length-1; i++) {
      if (movementData.ignoreDT) {
        finalCost += 1 + slowed;
        traveled +=1;
      }
      else {
        const x = travelPoints[i].x + z/4;
        const y = travelPoints[i].y + z/4;
        if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y)) finalCost += 2;                   // Top Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y)) finalCost += 2;        // Top Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y + z/2)) finalCost += 2;  // Bottom Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y + z/2)) finalCost += 2;        // Bottom Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/4, y + z/4)) finalCost += 2;  // Center
        else finalCost += 1;
        finalCost += slowed;
        traveled +=1;
      }
    }
    
    const distanceLeft = distance - traveled;
    if (distanceLeft >= 0.1) {
      if (movementData.ignoreDT) {
        finalCost += distanceLeft * (1 + slowed);
      }
      else {
        const x = travelPoints[travelPoints.length-1].x;
        const y = travelPoints[travelPoints.length-1].y;
        let multiplier = 1;
        if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y)) multiplier = 2;                   // Top Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y)) multiplier = 2;        // Top Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y + z/2)) multiplier = 2;  // Bottom Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y + z/2)) multiplier = 2;        // Bottom Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/4, y + z/4)) multiplier = 2;  // Center
        finalCost += distanceLeft * (multiplier + slowed);
      }
    }
    return finalCost;
  }
}