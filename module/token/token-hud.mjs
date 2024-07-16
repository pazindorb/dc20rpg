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
        statEff.isActive = true;
        statEff.cssClass = "active";
      }
    })
    return statusEffects;
  }
}