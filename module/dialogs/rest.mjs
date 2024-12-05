import { sendDescriptionToChat } from "../chat/chat-message.mjs";
import { refreshAllActionPoints } from "../helpers/actors/costManipulator.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/listenerEvents.mjs";
import { evaluateFormula } from "../helpers/rolls.mjs";
import { promptRoll } from "./roll-prompt.mjs";

/**
 * Dialog window for resting.
 */
export class RestDialog extends Dialog {

  constructor(actor, dialogData = {}, options = {}) {
    super(dialogData, options);
    this.actor = actor;
    this.data = {
      selectedRestType: "long",
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
    const restTypes = DC20RPG.restTypes;
    this.data.rest = this.actor.system.rest;

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
    this.render(true);
  }

  async _onSwitch(event) {
    const activity = datasetOf(event).activity === "true";
    this.data.noActivity = !activity;
    this.render(true);
  }

  async _onRpSpend(event) {
    event.preventDefault();
    const rpCurrent = this.actor.system.rest.restPoints.current;
    const newRpAmount = rpCurrent - 1;
  
    if (newRpAmount < 0) {
      let errorMessage = `No more Rest Points to spend.`;
      ui.notifications.error(errorMessage);
      return;
    }
  
    const health = this.actor.system.resources.health;
    const hpCurrent = health.current;
    const hpMax = health.max;
  
    let newHP = hpCurrent + 2;
    newHP = newHP > hpMax ? hpMax : newHP;
  
    const updateData = {
      ["system.rest.restPoints.current"]: newRpAmount,
      ["system.resources.health.current"]: newHP
    };
    await this.actor.update(updateData);
    this.render(true);
  }

  async _onRpRegained(event) {
    event.preventDefault();
    const restPoints = this.actor.system.rest.restPoints;
    const newRP = Math.min(restPoints.max, restPoints.current + 1);
    await this.actor.update({["system.rest.restPoints.current"]: newRP});
    this.render(true);
  }

  async _onResetRest(event) {
    event.preventDefault();
    await this._resetLongRest();
    this.render(true);
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
    return true;
  }
  
  async _finishShortRest(actor) {
    await _refreshItemsOn(actor, ["round", "quick", "short"]);
    await _refreshCustomResourcesOn(actor, ["round", "quick", "short"]);
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
      await _checkIfNoActivityPeriodAppeared(actor);
      await _clearDoomed(actor);
      await this._resetLongRest();
      return true;
    } 
    else {
      await _refreshRestPoints(actor);
      await _refreshItemsOn(actor, ["round", "quick", "short"]);
      await _refreshCustomResourcesOn(actor, ["round", "quick", "short"]);
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
    await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short", "long", "full"])
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
 * Creates RestDialog for given actor. 
 */
export function createRestDialog(actor) {
  new RestDialog(actor, {title: "Begin Your Rest"}).render(true);
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

async function _refreshItemsOn(actor, resetTypes) {
  const items = actor.items;

  for (let item of items) {
    if (!item.system.costs) continue;
    const charges = item.system.costs.charges;
    if (!resetTypes.includes(charges.reset) && !_halfOnShortValid(charges.reset, resetTypes)) continue;

    const half = charges.reset === "halfOnShort" && resetTypes.includes("short") && !resetTypes.includes("long");
    const rollData = await item.getRollData();
    let newCharges = charges.max;

    if (charges.rechargeDice) {
      const roll = await evaluateFormula(charges.rechargeDice, rollData);
      const result = roll.total;
      if (result > charges.requiredTotalMinimum) {
        const label = `${actor.name} ${game.i18n.localize("dc20rpg.rest.recharged")} ${item.name}`;
        const description = `${actor.name} ${game.i18n.localize("dc20rpg.rest.rechargedDescription")} ${item.name}`;
        sendDescriptionToChat(actor, {
          rollTitle: label,
          image: actor.img,
          description: description
        })
      }
    }
    if (charges.overriden) {
      const roll = await evaluateFormula(charges.rechargeFormula, rollData);
      newCharges = roll.total;
    }

    if (half) newCharges = Math.ceil(newCharges/2);
    item.update({[`system.costs.charges.current`]: Math.min(charges.current + newCharges, charges.max)});
  }
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
  const updateData = {
    ["system.exhaustion"]: 0,
    ["system.rest.longRest.exhSaveDC"]: 10
  };
  await actor.update(updateData);
}

async function _clearDoomed(actor) {
  const updateData = {
    ["system.death.doomed"]: 0
  };
  await actor.update(updateData);
}

async function _respectActivity(actor, noActivity) {
  if (noActivity) {
    const currentExhaustion = actor.system.exhaustion;
    let newExhaustion = currentExhaustion - 1;
    newExhaustion = newExhaustion >= 0 ? newExhaustion : 0;
    const updateData = {
      ["system.exhaustion"]: newExhaustion,
      ["system.rest.longRest.noActivity"]: true
    };
    await actor.update(updateData);
  }
}

async function _checkIfNoActivityPeriodAppeared(actor) {
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
      const currentExhaustion = actor.system.exhaustion;
      let newExhaustion = currentExhaustion + 1;
      newExhaustion = newExhaustion <= 6 ? newExhaustion : 6;

      const updateData = {
        ["system.exhaustion"]: newExhaustion,
        ["system.rest.longRest.exhSaveDC"]: rollDC + 5
      };
      await actor.update(updateData);
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
  const rpMax = actor.system.rest.restPoints.max;
  await actor.update({["system.rest.restPoints.current"]: rpMax});
}