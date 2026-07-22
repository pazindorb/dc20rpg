import { runEventsFor } from "../helpers/actors/events.mjs";
import { generateRandomLootTable } from "../helpers/actors/storage.mjs";
import { spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { gmCreate, gmDelete, gmUpdate } from "../helpers/sockets.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";

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

    const meleeThreat = this.actor.system.globalModifier.melee.threat; 
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
      detection.basicSight.range = senses.darkvision.value;
      if (sight.visionMode === "basic") sight.visionMode = "darkvision";
    }

    // Tremorsense
    if (senses.tremorsense.value > 0) {
      detection.feelTremor = {
        enabled: true,
        range: senses.tremorsense.value
      }
    }

    // Blindsight
    if (senses.blindsight.value > 0) {
      detection.seeInvisibility = {
        enabled: true,
        range: senses.blindsight.value
      }
    }

    // Truesight
    if (senses.truesight.value > 0) {
      detection.seeAll = {
        enabled: true,
        range: senses.truesight.value
      }
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
    if (!game.user.isActiveGM) return;
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
  //           TRANSFORMATION           =
  //=====================================
  async transformation(transformTo) {
    const transformFrom = this.actor;
    if (!transformFrom || !transformTo) return;
    const transformationHistory = this.flags.dc20rpg?.transformationHistory;
    if (transformationHistory) {
      ui.notifications.error("This token has already been transformed - revert the previous transformation before applying the new one.");
      return;
    }

    const token = await transformTo.getTokenDocument({}, {parent: this.parent}); // Create dummy token
    const updateData =  foundry.utils.deepClone(token.toObject());
    const originalData = foundry.utils.deepClone(this.toObject());
    const transferableEffects = [];

    // Prepare Update data
    updateData.x = originalData.x;
    updateData.y = originalData.y;
    updateData.elevation = originalData.elevation;
    updateData.actorId = transformTo.id;
    updateData.disposition = originalData.disposition;

    // Check and prepare actor overship
    if (updateData.actorLink) {
      if (originalData.actorLink === false) {
        // We cannot allow it - delta changes break it
        ui.notifications.error(`You cannot transform unlinked actor '${transformFrom.name}' into a linked one ('${transformTo.name}') - Use actor with an unlinked token.`);
        return;
      }

      for (const ownerId of Object.keys(transformFrom.ownership)) {
        if (ownerId === "default") continue;
        if (transformTo.ownership[ownerId] !== 3) {
          ui.notifications.error(`You cannot transform this token into '${transformTo.name}' - This is an actor that is linked to the token and not all owners of '${transformFrom.name}' are also owners of '${transformTo.name}'. Use actor with an unlinked token or change permissions of '${transformTo.name}'.`);
          return;
        }
      }
    }

    // ====== HANDLE TRANSFERING DATA BETWEEN TOKENS ======
    const transformationConfig = await SimplePopup.open("input", {header: "Transformation configuration", inputs: [
      {type: "checkbox", label: "Transfer Temporary Effects"},
      {type: "checkbox", label: "Transfer Statuses"},
      {type: "checkbox", label: "Transfer Linked Regions"},
    ]})
    const transferEffects = !!transformationConfig?.[0];
    const transferStatuses = !!transformationConfig?.[1];
    const transferRegions = !!transformationConfig?.[2];
    // TEMPORARY EFFECTS 
    if (transferEffects) {
      for (const effect of this.actor.effects) { // TODO: Should we use allEffects instead? So we transfer temporary effects from items such as rage?
        if (effect.isTemporary) transferableEffects.push(effect.toObject());
      }
      originalData.transferableEffects = transferableEffects;
    }
    // STATUSES
    if (transferStatuses) {
      for (const effect of this.actor.effects) {
        if (effect.isStatus) transferableEffects.push(effect.toObject());
      }
      originalData.transferableEffects = transferableEffects;
    }
    // ATTACHED REGIONS
    if (!transferRegions) {
      originalData.removedRegions = []
      this.regions.filter(region => region.attachment?.token?.id === this.id)
                  .forEach(region => {
                    originalData.removedRegions.push(region.toObject());
                    gmDelete({ignoreResponse: true}, region);
                  })
    }
    // ====== HANDLE TRANSFERING DATA BETWEEN TOKENS ======

    await this.clearDelta();
    updateData.flags = {dc20rpg: {transformationHistory: originalData}}
    await this.gmUpdate(updateData);

    if (!updateData.actorLink) await this.actor.gmUpdate({ownership: transformFrom.ownership});
    await this.actor.gmUpdate({
      ["flags.dc20rpg.transformationHash"]: foundry.utils.randomID(),
      ["effects"]: transferableEffects,

    });
    ui.hotbar.render();
  }

  async revertTransformation() {
    const transformationHistory = this.flags.dc20rpg?.transformationHistory;
    if (!transformationHistory) return;

    transformationHistory.x = this.x;
    transformationHistory.y = this.y;
    transformationHistory.elevation = this.elevation;
    transformationHistory.flags = {dc20rpg: {transformationHistory: new foundry.data.operators.ForcedDeletion()}};
    await this.clearDelta();

    // Recreate Removed Regions
    if (transformationHistory.removedRegions) {
      const options = {parent: canvas.scene, forceGM: !game.user.isGM, ignoreResponse: true};
      for (const regionData of transformationHistory.removedRegions) {
        await gmCreate(regionData, options, CONFIG.Region.documentClass);
      }
    }
    // Remove Transfered Effects (only for linked tokens - unlinked actors are destroyed anyway)
    if (transformationHistory.transferableEffects && this.actorLink) {
      const effectIds = transformationHistory.transferableEffects.map(effect => effect._id);
      await this.actor.deleteEmbeddedDocuments("ActiveEffect", effectIds);
    }

    await this.gmUpdate(transformationHistory);
    await this.actor.gmUpdate({["flags.dc20rpg.transformationHash"]: foundry.utils.randomID()});
    ui.hotbar.render();
  }

  async clearDelta() {
    if (this.actorLink) return;
    await this.delta?.restore();
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
