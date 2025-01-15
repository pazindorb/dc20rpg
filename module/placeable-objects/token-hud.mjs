import { getSimplePopup } from "../dialogs/simple-popup.mjs";
import { makeMoveAction } from "../helpers/actors/actions.mjs";
import { regainBasicResource, subtractAP } from "../helpers/actors/costManipulator.mjs";
import { toggleConditionOn } from "../helpers/effects.mjs";
import { datasetOf, valueOf } from "../helpers/listenerEvents.mjs";

export class DC20RpgTokenHUD extends TokenHUD {

  get template() {
    return `systems/dc20rpg/templates/hud/token-hud.hbs`;
  }

  /** @overload */
  getData(options={}) {
    let data = super.getData(options);
    data.actionPoints = this._prepareActionPoints();
    data.statusEffects = this._prepareStatusEffects(data.statusEffects);
    data.movePoints = this.actor.system.movePoints;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const actor = this.actor;
    if (!actor) return;

    html.find(".effect-control").mousedown(ev => toggleConditionOn(datasetOf(ev).statusId, actor, ev.which));
    html.find(".effect-control").click(ev => {ev.preventDefault(); ev.stopPropagation()})         // remove default behaviour
    html.find(".effect-control").contextmenu(ev => {ev.preventDefault(); ev.stopPropagation()})   // remove default behaviour

    // Ap Spend/Regain
    html.find(".regain-ap").click(() => regainBasicResource("ap", actor, 1, "true"));
    html.find(".spend-ap").click(() => subtractAP(actor, 1));

    // Move Points
    html.find(".move-points").change(ev => this._onMovePointsChange(valueOf(ev), actor));
    html.find(".move-icon").mousedown(ev => this._onMoveAction(actor, ev.which === 1))
  }

  async _onMoveAction(actor, simple) {
    const subtracted = await subtractAP(actor, 1);
    if (!subtracted) return;

    if (simple) makeMoveAction(actor);
    else {
      const key = await getSimplePopup("select", {
          selectOptions: CONFIG.DC20RPG.DROPDOWN_DATA.moveTypes, 
          header: game.i18n.localize("dc20rpg.dialog.movementType.title"), 
          preselect: "ground"
        });
      if (key) makeMoveAction(actor, {moveType: key});
    }
  }

  _onMovePointsChange(newValue, actor) {
    let isDelta = false;
    let add = false;
    if (newValue.startsWith("+")) {
      isDelta = true;
      add = true;
    }
    if (newValue.startsWith("-")) {
      isDelta = true;
      add = false;
    }

    let movePoints = parseFloat(newValue);
    if (isNaN(movePoints)) return;
    else movePoints = Math.abs(movePoints);

    if(isDelta) {
      const currentMovePoints = actor.system.movePoints || 0;
      const newMovePoints = add ? currentMovePoints + movePoints : currentMovePoints - movePoints;
      actor.update({["system.movePoints"]: Math.max(newMovePoints, 0)});
    }
    else {
      actor.update({["system.movePoints"]: movePoints});
    }
  }

  _prepareActionPoints() {
    const actionPoints = this.actor.system.resources.ap;
    if (!actionPoints) return;

    return {
      value: actionPoints.value, 
      max: actionPoints.max
    }
  }

  _prepareStatusEffects(statusEffects) {
    const actorStatuses = this.actor?.statuses || [];
    actorStatuses.forEach(status => {
      const statEff = statusEffects[status.id];
      if (!statEff.stack) statEff.stack = status.stack;
      else statEff.stack += status.stack;

      statEff.stackable = CONFIG.statusEffects.find(e => e.id === status.id)?.stackable;
      if (statEff.stack > 0) {
        // This means that status comes from some other effect
        if (!statEff.isActive) {
          statEff.isActive = true;
          statEff.fromOther = true;
        }
        statEff.isActive = true;
        statEff.cssClass = "active";
      } 
    })

    // When both Unconscious and Petrified conditions are active
    // where we need to remove single stack of exposed condition. 
    // Right now I have no idea how to deal with that case better. Hardcoded it is then...
    if (this.actor.hasStatus("unconscious") && this.actor.hasStatus("petrified")) {
      const status = statusEffects.exposed;
      status.stack--;
    }
    return statusEffects;
  }

  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  _getStatusEffectChoices() {

    // Include all HUD-enabled status effects
    const choices = {};
    for ( const status of CONFIG.statusEffects ) {
      if ( (status.hud === false) || ((foundry.utils.getType(status.hud) === "Object")
        && (status.hud.actorTypes?.includes(this.document.actor.type) === false)) ) {
        continue;
      }
      choices[status.id] = {
        _id: status._id,
        id: status.id,
        title: game.i18n.localize(status.name),
        src: status.img,
        isActive: false,
        isOverlay: false
      };
    }

    // Update the status of effects which are active for the token actor
    const activeEffects = this.actor?.appliedEffects || [];
    for ( const effect of activeEffects ) {
      if (effect.disabled) continue;
      for ( const statusId of effect.statuses ) {
        const status = choices[statusId];
        if (effect.sourceName === "None") status.fromOther = false;
        if ( !status ) continue;
        if ( status._id ) {
          if ( status._id !== effect.id ) continue;
        } else {
          if ( effect.statuses.size !== 1 ) continue;
        }
        if (effect.sourceName !== "None" && status.fromOther === undefined) status.fromOther = true;
        status.isActive = true;
        if ( effect.getFlag("core", "overlay") ) status.isOverlay = true;
        break;
      }
    }

    // Flag status CSS class
    for ( const status of Object.values(choices) ) {
      status.cssClass = [
        status.isActive ? "active" : null,
        status.isOverlay ? "overlay" : null
      ].filterJoin(" ");
    }
    return choices;
  }
}