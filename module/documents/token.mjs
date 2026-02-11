import { runEventsFor } from "../helpers/actors/events.mjs";
import { checkMeasuredTemplateWithEffects } from "./measuredTemplate.mjs";
import { generateRandomLootTable } from "../helpers/actors/storage.mjs";
import { spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";
import { gmCreate, gmDelete, gmUpdate } from "../helpers/sockets.mjs";

export class DC20RpgTokenDocument extends TokenDocument {

  movementCostHistory = [];

  get itemToken() {
    return this.flags?.dc20rpg?.itemData !== undefined;
  }

  get isFlanked() {
    return this.object.isFlanked;
  }

  hasStatusEffect(statusId) {
    if (!this.actor) return false;
    return this.actor.hasStatus(statusId);
  }

  /**@override*/
  prepareData() {
    this._prepareSystemSpecificVisionModes();
    super.prepareData();
    this._setTokenSize();
  }

  _prepareSystemSpecificVisionModes() {
    if (!this.sight.enabled) return; // Only when using vision
    if (!this.actor) return;
    
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
        
        // Wait for movement to finish before triggering measured template check
        let counter = 0;  // Max amount of loops
        const timeoutID = setInterval(async () => {
          if (counter > 100 || (
                (!changed.hasOwnProperty("x") || this.object.x === changed.x) && 
                (!changed.hasOwnProperty("y") || this.object.y === changed.y)
              )) {
            await this.updateLinkedTemplates();
            await checkMeasuredTemplateWithEffects();
            clearInterval(timeoutID);
          }
          else counter++;
        }, 100);
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
  //          LINKED TEMPLATES          =
  //=====================================
  async updateLinkedTemplates() {
    const linkedTemplates = this.flags.dc20rpg?.linkedTemplates;
    if (!linkedTemplates) return;
    
    const idsToRemove = new Set();
    for (const templateId of linkedTemplates) {
      const mt = canvas.templates.placeables.find(template => template.id === templateId);
      if (!mt) idsToRemove.add(templateId);
      else {
        await mt.document.update({
          x: this.object.center.x,
          y: this.object.center.y
        }, {skipLinkedEffectApplication: true});
      }

      if (idsToRemove.size > 0) {
        const templatesLeft = new Set(linkedTemplates).difference(idsToRemove);
        await this.update({["flags.dc20rpg.linkedTemplates"]: Array.from(templatesLeft)});
      } 
    }
  }

  //=====================================
  //               TARGET               =
  //=====================================
  toTarget(flags={}) {
    const actor = this.actor;
    const statuses = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
    const rollData = actor?.getRollData();
    const target = {
      name: actor.name,
      img: actor.img,
      id: this.id,
      isOwner: actor.isOwner,
      system: actor.system,
      statuses: statuses,
      effects: actor.allEffects,
      isFlanked: this.isFlanked,
      rollData: {
        target: {
          numberOfConditions: this._numberOfConditions(actor.coreStatuses),
          system: rollData
        }
      },
      token: this.object,
      flags: flags
    };
    return target;
  }

  _numberOfConditions(coreStatuses) {
    let number = 0;
    const conditions = CONFIG.DC20RPG.DROPDOWN_DATA.conditions;
    for (const status of coreStatuses) {
      if (conditions[status]) number += 1;
    }
    return number;
  }

  async _preDelete(options={}, user) {
    // Remove existing aura
    const linkedTemplates = this.flags.dc20rpg?.linkedTemplates || [];
    for (const templateId of linkedTemplates) {
      const template = canvas.templates.documentCollection.get(templateId);
      if (template) template.delete();
    }
    return await super._preDelete(options, user);
  }
}