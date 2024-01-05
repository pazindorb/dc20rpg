import { evaulateFormula } from "../rolls.mjs";
import { refreshAllActionPoints } from "./costManipulator.mjs";
import { rollFromFormula } from "./rollsFromActor.mjs";

export async function spendRestPoint(actor) {
  const rpCurrent = actor.system.rest.restPoints.current;
  const newRpAmount = rpCurrent - 1;

  if (newRpAmount < 0) {
    let errorMessage = `No more Rest Points to spend.`;
    ui.notifications.error(errorMessage);
    return;
  }

  const health = actor.system.resources.health;
  const hpCurrent = health.current;
  const hpMax = health.max;
  const mig = actor.system.attributes.mig.value;
  const agi = actor.system.attributes.agi.value;

  let newHP = hpCurrent + Math.max(mig, agi) + 2;
  newHP = newHP > hpMax ? hpMax : newHP;

  const updateData = {
    ["system.rest.restPoints.current"]: newRpAmount,
    ["system.resources.health.current"]: newHP
  };
  await actor.update(updateData);
}

export async function resetLongRest(actor) {
  const updateData = {
    ["system.rest.longRest.half"]: false,
    ["system.rest.longRest.noActivity"]: false
  };
  await actor.update(updateData);
}

export async function finishRest(actor, restType, noActivity) { 
  switch (restType) {
    case "quick":
      return await _finishQuickRest(actor);
    case "short":
      return await _finishShortRest(actor);
    case "long":
      return await _finishLongRest(actor, noActivity);
    case "full": 
      return await _finishFullRest(actor);
    default:
      ui.notifications.error("Choose correct rest type first.");
  }
}

export async function refreshOnRoundEnd(actor) {
  refreshAllActionPoints(actor);
  await _refreshItemsOn(actor, ["round"]);
  await _refreshCustomResourcesOn(actor, ["round"]);
}

export async function refreshOnCombatEnd(actor) {
  refreshAllActionPoints(actor);
  await _refreshItemsOn(actor, ["round", "combat"]);
  await _refreshCustomResourcesOn(actor, ["round", "combat"]);
}

async function _finishQuickRest(actor) {
  await _refreshItemsOn(actor, ["round", "combat", "quick"]);
  await _refreshCustomResourcesOn(actor, ["round", "combat", "quick"]);
  return true;
}

async function _finishShortRest(actor) {
  await _refreshItemsOn(actor, ["round", "combat", "quick", "short"]);
  await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short"]);
  return true;
}

async function _finishLongRest(actor, noActivity) {
  await _respectActivity(actor, noActivity);

  const halfFinished = actor.system.rest.longRest.half;
  if (halfFinished) {
    await _refreshMana(actor);
    await _refreshItemsOn(actor, ["round", "combat", "quick", "short", "long"]);
    await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short", "long"]);
    await _checkIfNoActivityPeriodAppeared(actor);
    await resetLongRest(actor);
    return true;
  } 
  else {
    await _refreshRestPoints(actor);
    await _refreshItemsOn(actor, ["round", "combat", "quick", "short"]);
    await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short"]);
    await actor.update({["system.rest.longRest.half"]: true});
    return false;
  }
}

async function _finishFullRest(actor) {
  await _refreshMana(actor);
  await _refreshRestPoints(actor);
  await _refreshHealth(actor);
  await _clearExhaustion(actor);
  await _refreshItemsOn(actor, ["round", "combat", "quick", "short", "long", "full", "day"]);
  await _refreshCustomResourcesOn(actor, ["round", "combat", "quick", "short", "long", "full"])
  return true;
}

async function _refreshItemsOn(actor, resetTypes) {
  const items = actor.items;

  for (let item of items) {
    if (item.system.costs) {
      const charges = item.system.costs.charges;
      if (resetTypes.includes(charges.reset)) {
        if (charges.overriden) {
          const rollData = await item.getRollData();
          const result = evaulateFormula(charges.rechargeFormula, rollData).total;

          let newCharges = charges.current + result;
          newCharges = newCharges <= charges.max ? newCharges : charges.max;
          item.update({[`system.costs.charges.current`]: newCharges});
        } 
        else {
          item.update({[`system.costs.charges.current`]: charges.max});
        }
      }
    }
  } 
}

async function _refreshCustomResourcesOn(actor, resetTypes) {
  const customResources = actor.system.resources.custom;
  const updateData = {}
  Object.entries(customResources).forEach(([key, resource]) => {
    if (resetTypes.includes(resource.reset)) {
      resource.value = resource.max;
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
    const formula = "1d20 + @attributes.mig.save";
    const label = `Exhaustion Save [Might] (DC ${rollDC})`;

    const result = rollFromFormula(formula, label, "save", actor, true).total;
    if (result < rollDC) {
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
  const manaMax = actor.system.resources.mana.max;
  await actor.update({["system.resources.mana.value"]: manaMax});
}

async function _refreshHealth(actor) {
  const hpMax = actor.system.resources.health.max;
  await actor.update({["system.resources.health.current"]: hpMax});
}

async function _refreshRestPoints(actor) {
  const rpMax = actor.system.rest.restPoints.max;
  await actor.update({["system.rest.restPoints.current"]: rpMax});
}