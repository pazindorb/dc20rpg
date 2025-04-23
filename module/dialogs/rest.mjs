import { refreshAllActionPoints, regainBasicResource, spendRpOnHp } from "../helpers/actors/costManipulator.mjs";
import { restTypeFilter, runEventsFor } from "../helpers/actors/events.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { emitSystemEvent } from "../helpers/sockets.mjs";
import { promptRoll } from "./roll-prompt.mjs";

/**
 * Dialog window for resting.
 */
export class RestDialog extends Dialog {

  constructor(actor, preselected, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.data = {
      selectedRestType: preselected || "long",
      noActivity: true
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dc20rpg/templates/dialogs/rest-dialog.hbs",
      classes: ["dc20rpg", "dialog", "flex-dialog"]
    });
  }

  getData() {
    const restTypes = CONFIG.DC20RPG.DROPDOWN_DATA.restTypes;
    this.data.rest = this.actor.system.rest;
    this.data.resources = {
      restPoints: this.actor.system.resources.restPoints
    };

    return {
      restTypes: restTypes,
      ...this.data
    }
  }

   /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".selectable").change(ev => this._onSelection(ev));
    html.find(".regain-rp").click(ev => this._onRpRegained(ev));
    html.find(".spend-rp").click(ev => this._onRpSpend(ev));
    html.find(".finish-rest").click(ev => this._onFinishRest(ev));
    html.find(".reset-rest").click(ev => this._onResetRest(ev));
    html.find(".activity").click(ev => this._onSwitch(ev));
  }

  async _onSelection(event) {
    event.preventDefault();
    this.data.selectedRestType = event.currentTarget.value;
    this.render();
  }

  async _onSwitch(event) {
    const activity = datasetOf(event).activity === "true";
    this.data.noActivity = !activity;
    this.render();
  }

  async _onRpSpend(event) {
    event.preventDefault();
    await spendRpOnHp(this.actor, 1);
    this.render();
  }

  async _onRpRegained(event) {
    event.preventDefault();
    await regainBasicResource("restPoints", this.actor, 1, true);
    this.render();
  }

  async _onResetRest(event) {
    event.preventDefault();
    await this._resetLongRest();
    this.render();
  }

  //==================================//
  //            Finish Rest           //
  //==================================//
  async _onFinishRest(event) {
    event.preventDefault();
    switch (this.data.selectedRestType) {
      case "quick":
        await this._finishQuickRest(this.actor);
        this.close();
        break;
      case "short":
        await this._finishShortRest(this.actor);
        this.close();
        break;
      case "long":
        const closeWindow = await this._finishLongRest(this.actor, this.data.noActivity);
        if (closeWindow) this.close();
        else this.render(true);
        break;
      case "full": 
        await this._finishFullRest(this.actor);
        this.close();
        break;
      default:
        ui.notifications.error("Choose correct rest type first.");
    }
  }

  async _finishQuickRest(actor) {
    await _refreshItemsOn(actor, ["round", "quick"]);
    await _refreshCustomResourcesOn(actor, ["round", "quick"]);
    await runEventsFor("rest", actor, restTypeFilter(["quick"]));
    return true;
  }
  
  async _finishShortRest(actor) {
    await _refreshItemsOn(actor, ["round", "quick", "short"]);
    await _refreshCustomResourcesOn(actor, ["round", "quick", "short"]);
    await runEventsFor("rest", actor, restTypeFilter(["quick", "short"]));
    return true;
  }
  
  async _finishLongRest(actor, noActivity) {
    await _respectActivity(actor, noActivity);
  
    const halfFinished = actor.system.rest.longRest.half;
    if (halfFinished) {
      await _refreshMana(actor);
      await _refreshGrit(actor);
      await _refreshItemsOn(actor, ["round", "combat", "quick", "short", "long"]);
      await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short", "long"]);
      await _checkForExhaustionSave(actor);
      await _clearDoomed(actor);
      await runEventsFor("rest", actor, restTypeFilter(["long"]));
      await this._resetLongRest();
      return true;
    } 
    else {
      await _refreshRestPoints(actor);
      await _refreshItemsOn(actor, ["round", "quick", "short"]);
      await _refreshCustomResourcesOn(actor, ["round", "quick", "short"]);
      await runEventsFor("rest", actor, restTypeFilter(["quick", "short"]));
      await actor.update({["system.rest.longRest.half"]: true});
      return false;
    }
  }
  
  async _finishFullRest(actor) {
    await _refreshMana(actor);
    await _refreshGrit(actor);
    await _refreshRestPoints(actor);
    await _refreshHealth(actor);
    await _clearExhaustion(actor);
    await _clearDoomed(actor);
    await _refreshItemsOn(actor, ["round", "combat", "quick", "short", "long", "full", "day"]);
    await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short", "long", "full"]);
    await runEventsFor("rest", actor, restTypeFilter(["quick", "short", "long", "full"]));
    return true;
  }

  async _resetLongRest() {
    const updateData = {
      ["system.rest.longRest.half"]: false,
      ["system.rest.longRest.noActivity"]: false
    };
    await this.actor.update(updateData);
    return;
  }
}

/**
 * Opens Rest Dialog popup for given actor.
 */
export function createRestDialog(actor, preselected) {
  new RestDialog(actor, preselected, {title: `Begin Your Rest ${actor.name}`}).render(true);
}

export function openRestDialogForOtherPlayers(actor, preselected) {
  emitSystemEvent("startRest", {
    actorId: actor.id,
    preselected: preselected
  });
}

export async function refreshOnRoundEnd(actor) {
  refreshAllActionPoints(actor);
  await _refreshItemsOn(actor, ["round"]);
  await _refreshCustomResourcesOn(actor, ["round"]);
}

export async function refreshOnCombatStart(actor) {
  refreshAllActionPoints(actor);
  await _refreshStamina(actor);
  await _refreshItemsOn(actor, ["round", "combat"]);
  await _refreshCustomResourcesOn(actor, ["round", "combat"]);
}

export async function rechargeItem(item, half) {
  if (!item.system.costs) return;
  const charges = item.system.costs.charges;
  if (charges.max === charges.current) return;

  const rollData = await item.getRollData();
  let newCharges = charges.max;

  if (charges.rechargeDice) {
    const roll = await evaluateFormula(charges.rechargeDice, rollData);
    const result = roll.total;
    const rechargeOutput = result >= charges.requiredTotalMinimum 
                                ? game.i18n.localize("dc20rpg.rest.rechargedDescription") 
                                : game.i18n.localize("dc20rpg.rest.notrechargedDescription")
    ui.notifications.notify(`${item.actor.name} ${rechargeOutput} ${item.name}`);
    if (result < charges.requiredTotalMinimum) return;
  }
  if (charges.overriden) {
    const roll = await evaluateFormula(charges.rechargeFormula, rollData);
    newCharges = roll.total;
  }

  if (half) newCharges = Math.ceil(newCharges/2);
  item.update({[`system.costs.charges.current`]: Math.min(charges.current + newCharges, charges.max)});
}

async function _refreshItemsOn(actor, resetTypes) {
  const items = actor.items;

  items.forEach(async item => {
    if (!item.system.costs) return;
    const charges = item.system.costs.charges;
    if (charges.max === charges.current) return;
    if (!resetTypes.includes(charges.reset) && !_halfOnShortValid(charges.reset, resetTypes)) return;

    const half = charges.reset === "halfOnShort" && resetTypes.includes("short") && !resetTypes.includes("long");
    rechargeItem(item, half);
  })
}

function _halfOnShortValid(reset, resetTypes) {
  if (reset !== "halfOnShort") return false;
  if (resetTypes.includes("short") || resetTypes.includes("long")) return true;
  return false;
}

async function _refreshCustomResourcesOn(actor, resetTypes) {
  const customResources = actor.system.resources.custom;
  const updateData = {}
  Object.entries(customResources).forEach(([key, resource]) => {
    if (resetTypes.includes(resource.reset) || (resource.reset === "halfOnShort" && resetTypes.includes("long"))) {
      resource.value = resource.max;
      updateData[`system.resources.custom.${key}`] = resource;
    }
    else if (resource.reset === "halfOnShort" && resetTypes.includes("short")) {
      const newValue = resource.value + Math.ceil(resource.max/2)
      resource.value = Math.min(newValue, resource.max);
      updateData[`system.resources.custom.${key}`] = resource;
    }
  });
  actor.update(updateData);
}

async function _clearExhaustion(actor) {
  actor.effects.forEach(effect => {
    if (effect.system?.statusId === "exhaustion") effect.delete();
  })
  await actor.update({["system.rest.longRest.exhSaveDC"]: 10});
}

async function _clearDoomed(actor) {
  actor.effects.forEach(effect => {
    if (effect.system?.statusId === "doomed") effect.delete();
  })
}

async function _respectActivity(actor, noActivity) {
  if (noActivity) {
    await actor.toggleStatusEffect("exhaustion", { active: false });
    await actor.update({["system.rest.longRest.noActivity"]: true});
  }
}

async function _checkForExhaustionSave(actor) {
  const noActivity = actor.system.rest.longRest.noActivity;
  if (!noActivity) {
    const rollDC = actor.system.rest.longRest.exhSaveDC;
    const details = {
      roll: "d20 + @attributes.mig.save",
      label: `Might Save vs DC ${rollDC}`,
      rollTitle: "Exhaustion Save",
      type: "save",
      against: rollDC
    }
    const roll = await promptRoll(actor, details);
    if (roll.total < rollDC) {
      await actor.toggleStatusEffect("exhaustion", { active: true });
      await actor.update({["system.rest.longRest.exhSaveDC"]: rollDC + 5});
    }
  }
}

async function _refreshMana(actor) {
  if (!actor.system.resources.mana) return;
  const manaMax = actor.system.resources.mana.max;
  await actor.update({["system.resources.mana.value"]: manaMax});
}

async function _refreshStamina(actor) {
  if (!actor.system.resources.stamina) return;
  const manaStamina = actor.system.resources.stamina.max;
  await actor.update({["system.resources.stamina.value"]: manaStamina});
}

async function _refreshHealth(actor) {
  const hpMax = actor.system.resources.health.max;
  await actor.update({["system.resources.health.current"]: hpMax});
}

async function _refreshGrit(actor) {
  if (!actor.system.resources.grit) return;
  const gritMax = actor.system.resources.grit.max;
  await actor.update({["system.resources.grit.value"]: gritMax});
}

async function _refreshRestPoints(actor) {
  const rpMax = actor.system.resources.restPoints.max;
  await actor.update({["system.resources.restPoints.value"]: rpMax});
}