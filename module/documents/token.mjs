import { runEventsFor } from "../helpers/actors/events.mjs";
import { generateRandomLootTable } from "../helpers/actors/storage.mjs";
import { spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { gmCreate, gmDelete, gmUpdate } from "../helpers/sockets.mjs";

export class DC20RpgTokenDocument extends TokenDocument {

  movementCostHistory = [];

  get itemToken() {
    return this.flags?.dc20rpg?.itemData !== undefined;
  }

  /**@override*/
  prepareData() {
    super.prepareData();
    
    if (this.actor) {
      this._prepareSystemSpecificVisionModes();
      this._setTokenSize();
      this._setSceneMaxMeleeThreat();
    }
  }

  _setSceneMaxMeleeThreat() {
    if (!canvas.tokens) return;

    const meleeThreat = this.actor.system.details.meleeThreat; 
    if (!canvas.tokens.maxMeleeThreat) {
      canvas.tokens.maxMeleeThreat = meleeThreat;
    }
    if (meleeThreat > canvas.tokens.maxMeleeThreat) {
      canvas.tokens.maxMeleeThreat = meleeThreat;
    }
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
    const size = this.actor?.system?.size;
    if (!size) return;
    if (this.flags?.dc20rpg?.notOverrideSize) return;

    const spaceOccupation = size.spaceOccupation || this._sizeCategoryToSpaces(size.size);
    this._updateSize(spaceOccupation);
  }

  _sizeCategoryToSpaces(category) {
    switch(category) {
      case "tiny":                  return 0.5;
      case "large":                 return 2;
      case "huge":                  return 3;
      case "gargantuan":            return 4;
      case "colossal":              return 5;
      case "titanic":               return 7;
    }
    return 1; // small, medium
  }

  async _updateSize(size) {
    if (this.width !== size && this.height !== size && this._id) {
      await this.update({
        _id: this._id,
        width: size,
        height: size
      })
    }
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (userId === game.user.id && this.actor) {
      if (changed.hasOwnProperty("x") || changed.hasOwnProperty("y")) {
        runEventsFor("move", this.actor);
      }
    }
  }

  //======================================
  //=           CRUD OPERATIONS          =
  //======================================
  static async gmCreate(data={}, operation={}) {
    return await gmCreate(data, operation, this);
  }

  async gmUpdate(data={}, operation={}) {
    return await gmUpdate(data, operation, this);
  }

  async gmDelete(operation={}) {
    return await gmDelete(operation, this);
  }

  //=====================================
  //              MOVEMENT              =
  //=====================================
  async _preUpdateMovement(movement, operation) {
    super._preUpdateMovement(movement, operation);
    const freeMove = game.keyboard.downKeys.has("KeyF");
    const teleport = operation.teleport;
    const shouldSubtract = this.shouldSubtractMovePoints();
    if (freeMove || teleport || !shouldSubtract) {
      if (!operation.isUndo) this.movementCostHistory.push(0);
      return true;
    }

    const movementCost = movement.passed.cost;
    let subtracted = await subtractMovePoints(this.actor, movementCost);

    if (subtracted !== true) {
      subtracted = await spendMoreApOnMovement(this.actor, subtracted, this.movementAction);
    }

    // Do not move the actor
    if (subtracted !== true) {
      ui.notifications.warn("Not enough movement! If you want to make a free move hold 'F' key.");
      return false;
    }
    if (!operation.isUndo) this.movementCostHistory.push(movementCost);
    return true;
  }

  shouldSubtractMovePoints() {
    if (!this.actor) return false;
    
    const movePointsUseOption = game.settings.get("dc20rpg", "useMovementPoints");
    const onTurn = movePointsUseOption === "onTurn";
    const onCombat = movePointsUseOption === "onCombat";
    const never = movePointsUseOption === "never";

    if (never) return false; 
    if (onCombat || onTurn) {
      const activeCombat = game.combats.active;
      if (!activeCombat?.started) return false;
      if (onTurn && !this.actor.myTurnActive) return false;
    }
    return true;
  }

  _onUpdateMovement(movement, operation, user) {
    super._onUpdateMovement(movement, operation, user);
    if (user.id === game.user.id && this.actor) {
      // Revert movement points 
      if (operation.isUndo) {
        const revertedCost = this.movementCostHistory.pop();
        if (revertedCost !== undefined) {
            const movePoints = this.actor.system.movePoints;
            const newMovePoints = movePoints + revertedCost;
            this.actor.update({["system.movePoints"]: newMovePoints});
        }
      }
    }
  }

  _onCreate(data, options, userId) {
    if (userId === game.user.id && this.actor) {
      this._onStorageCreation();
    }
    super._onCreate(data, options, userId);
  }

  _onStorageCreation() {
    if (this.actor?.type !== "storage") return;
    if (this.actor.system.storageType === "randomLootTable") generateRandomLootTable(this.actor);
    if (!this.actorLink && this.actor.ownership.default === 0) this.actor.update({["ownership.default"]: 1});
  }

  //=====================================
  //          TOKEN DISPOSITION         =
  //=====================================
  static getEnemyTokenDispositionsFor(disposition) {
    const neutralIdentity = game.settings.get("dc20rpg", "neutralDispositionIdentity");
    const enemy = [];

    if (disposition === 0) {
      if (neutralIdentity !== "friendly") enemy.push(1);
      if (neutralIdentity !== "hostile") enemy.push(-1);
    }
    
    if (disposition === -1) enemy.push(1);
    if (disposition === 1) enemy.push(-1);
    if (neutralIdentity === "friendly" && disposition === -1) enemy.push(0);
    if (neutralIdentity === "hostile" && disposition === 1) enemy.push(0);
    if (neutralIdentity === "separated" && disposition !== 0) enemy.push(0);
    return enemy;
  }

  static getFriendlyTokenDispositionsFor(disposition) {
    const neutralIdentity = game.settings.get("dc20rpg", "neutralDispositionIdentity");
    const friendly = [];

    friendly.push(disposition);

    if (disposition === 0) {
      if (neutralIdentity === "friendly") friendly.push(1);
      if (neutralIdentity === "hostile") friendly.push(-1);
    }

    if (neutralIdentity === "friendly" && disposition === 1) friendly.push(0);
    if (neutralIdentity === "hostile" && disposition === -1) friendly.push(0);
    return friendly;
  }
}