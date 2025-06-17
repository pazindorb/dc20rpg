import { runEventsFor } from "../helpers/actors/events.mjs";
import { checkMeasuredTemplateWithEffects } from "./measuredTemplate.mjs";
import { companionShare } from "../helpers/actors/companion.mjs";
import { generateRandomLootTable } from "../helpers/actors/storage.mjs";
import { spendMoreApOnMovement, subtractMovePoints } from "../helpers/actors/actions.mjs";

export class DC20RpgTokenDocument extends TokenDocument {

  movementCostHistory = [];

  get itemToken() {
    return this.flags?.dc20rpg?.itemData !== undefined;
  }

  get activeCombatant() {
    const activeCombat = game.combats.active;
    if (!activeCombat?.started) return false;

    const combatantId = activeCombat.current.combatantId;
    const combatant = activeCombat.combatants.get(combatantId);

    const myTurn = combatant?.tokenId === this.id;
    if (myTurn) return true;

    if (companionShare(this.actor, "initiative")) {
      const ownerTurn = combatant?.actorId === this.actor.companionOwner.id;
      if (ownerTurn) return true;
    }
    return false;
  }

  /**@override*/
  prepareData() {
    this._prepareSystemSpecificVisionModes();
    super.prepareData();
    this._setTokenSize();
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

    switch(size.size) {
      case "tiny":
        this._updateSize(0.5);
        break;

      case "small": case "medium": case "mediumLarge":
        this._updateSize(1);
        break;

      case "large":
        this._updateSize(2);
        break;

      case "huge":
        this._updateSize(3);
        break;

      case "gargantuan":
        this._updateSize(4);
        break;

      case "colossal":
        this._updateSize(5);
        break;

      case "titanic":
        this._updateSize(7);
        break;
    }
  }

  async _updateSize(size) {
    if (this.width !== size && this.height !== size) {
      await this.update({
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
        this.object.movedRecently = {
          from: {
            x: this.object.x,
            y: this.object.y
          },
          to: {
            x: changed.x || this.object.x,
            y: changed.y || this.object.y
          }
        };
        
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

    // Spend extra AP to move
    if (subtracted !== true && game.settings.get("dc20rpg","askToSpendMoreAP")) {
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
    const movePointsUseOption = game.settings.get("dc20rpg", "useMovementPoints");
    const onTurn = movePointsUseOption === "onTurn";
    const onCombat = movePointsUseOption === "onCombat";
    const never = movePointsUseOption === "never";

    if (never) return false; 
    if (onCombat || onTurn) {
      const activeCombat = game.combats.active;
      if (!activeCombat?.started) return false;
      if (onTurn && !this.activeCombatant) return false;
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

  async _onCreate(data, options, userId) {
    if (userId === game.user.id && this.actor) {
      if (this.actor?.type === "storage") {
        if (this.actor.system.storageType === "randomLootTable") generateRandomLootTable(this.actor);
        if (!this.actorLink && this.actor.ownership.default === 0) this.actor.update({["ownership.default"]: 1});
      }
    }
    super._onCreate(data, options, userId);
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