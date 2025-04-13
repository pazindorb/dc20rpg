import { snapTokenToTheClosetPosition, spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { getPointsOnLine } from "../helpers/utils.mjs";
import DC20RpgMeasuredTemplate from "../placeable-objects/measuredTemplate.mjs";
import { getStatusWithId } from "../statusEffects/statusUtils.mjs";
import { runEventsFor } from "../helpers/actors/events.mjs";
import { checkMeasuredTemplateWithEffects } from "./measuredTemplate.mjs";

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
        break;

      case "colossal":
        this.width = 5;
        this.height = 5;
        break;

      case "titanic":
        this.width = 7;
        this.height = 7;
        break;
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
        
        // Wait for movement to finish before triggering measured template check
        let counter = 0;  // Max amount of loops
        const timeoutID = setInterval(() => {
          if (counter > 100 || (
                (!changed.hasOwnProperty("x") || this.object.x === changed.x) && 
                (!changed.hasOwnProperty("y") || this.object.y === changed.y)
              )) {
            this.updateLinkedTemplates();
            checkMeasuredTemplateWithEffects();
            clearInterval(timeoutID);
          }
          else counter++;
        }, 100);
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
        moveCost: this.actor.system.moveCost,
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
    const moveCost = movementData.moveCost;
    if (movementData.ignoreDT) return moveCost;

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
    if (currentDifficultTerrainSpaces > 0 && currentDifficultTerrainSpaces >= lastDifficultTerrainSpaces) return 1 + moveCost;
    return moveCost;
  }

  costFunctionGridless(from, to, distance, movementData, tokenWidth) {
    const moveCost = movementData.moveCost;
    let finalCost = 0;
    let traveled = 0;
    const gridSize = canvas.grid.size;
    const z = gridSize * tokenWidth;

    const travelPoints = getPointsOnLine(from.j, from.i, to.j, to.i, canvas.grid.size);
    for (let i = 0; i < travelPoints.length-1; i++) {
      if (movementData.ignoreDT) {
        finalCost += moveCost;
        traveled +=1;
      }
      else {
        const x = travelPoints[i].x + z/4;
        const y = travelPoints[i].y + z/4;
        if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y)) finalCost += 1;                   // Top Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y)) finalCost += 1;        // Top Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/2, y + z/2)) finalCost += 1;  // Bottom Right
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x, y + z/2)) finalCost += 1;        // Bottom Left
        else if (DC20RpgMeasuredTemplate.isDifficultTerrain(x + z/4, y + z/4)) finalCost += 1;  // Center
        finalCost += moveCost;
        traveled +=1;
      }
    }
    
    const distanceLeft = distance - traveled;
    if (distanceLeft >= 0.1) {
      if (movementData.ignoreDT) {
        finalCost += distanceLeft * moveCost;
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
        finalCost += distanceLeft * (multiplier + moveCost - 1);
      }
    }
    return finalCost;
  }

  async updateLinkedTemplates() {
    const linkedTemplates = this.flags.dc20rpg?.linkedTemplates;
    if (!linkedTemplates) return;
    
    const idsToRemove = new Set();
    for (const templateId of linkedTemplates) {
      const mt = canvas.templates.placeables.find(template => template.id === templateId);
      if (!mt) idsToRemove.add(templateId);
      else {
        await mt.document.update({
          skipUpdateCheck: true,
          x: this.object.center.x,
          y: this.object.center.y
        });
      }

      if (idsToRemove.size > 0) {
        const templatesLeft = new Set(linkedTemplates).difference(idsToRemove);
        this.update({["flags.dc20rpg.linkedTemplates"]: Array.from(templatesLeft)});
      } 
    }
  }
}