import { toggleConditionOn } from "../helpers/effects.mjs";
import { datasetOf } from "../helpers/events.mjs";

export class DC20TokenHUD extends TokenHUD {

  get template() {
    return `systems/dc20rpg/templates/hud/token-hud.hbs`;
  }

  /** @overload */
  getData(options={}) {
    let data = super.getData(options);
    data.statusEffects = this._prepareStatusEffects(data.statusEffects);
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const actor = this.actor;
    if (!actor) return;

    html.find(".effect-control").mousedown(ev => toggleConditionOn(datasetOf(ev).statusId, actor, ev.which));
    html.find(".effect-control").click(ev => {ev.preventDefault(); ev.stopPropagation()})         // remove default behaviour
    html.find(".effect-control").contextmenu(ev => {ev.preventDefault(); ev.stopPropagation()})   // remove default behaviour
  }

  _prepareStatusEffects(statusEffects) {
    const actorStatuses = this.actor?.statuses || [];
    actorStatuses.forEach(status => {
      const statEff = statusEffects[status.id];
      if (!statEff.stack) statEff.stack = status.stack;
      else statEff.stack += status.stack;

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
    return statusEffects;
  }

  //TODO: We need to make sure it works fine with future foundry updates
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
        title: game.i18n.localize(status.name ?? /** @deprecated since v12 */ status.label),
        src: status.img ?? /** @deprecated since v12 */ status.icon,
        isActive: false,
        isOverlay: false
      };
    }

    // Update the status of effects which are active for the token actor
    const activeEffects = this.actor?.effects || [];
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