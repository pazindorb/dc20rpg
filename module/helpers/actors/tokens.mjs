import { DC20RPG } from "../config.mjs";
import { getLabelFromKey } from "../utils.mjs";
import { rollFromFormula } from "./rollsFromActor.mjs";

export async function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens)
      return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

/**
 * Calls rollFromFormula for selected tokens.
 */
export async function rollForTokens(event, type) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  const selectedTokens = await getSelectedTokens();
  if (selectedTokens.length === 0) return;

  selectedTokens.forEach(async (token) => {
    const actor = await token.actor;
    if (type === "save") _rollSave(actor, dataset);
    if (type === "check") _rollCheck(actor, dataset);
  })
}

function _rollSave(actor, dataset) {
  let attribute = actor.system.attributes[dataset.save];
  let modifier = attribute.save;

  let label = getLabelFromKey(dataset.save, DC20RPG.saveTypes) + " Save";
  const formula = `d20 + ${modifier}`;
  rollFromFormula(formula, label, actor, true);
}

function _rollCheck(actor, dataset) {
  const key = dataset.key;
  let modifier = "";
  let label = "";

  switch (key) {
    case "att":
      modifier = actor.system.attackMod.value.martial;
      label += getLabelFromKey(key, DC20RPG.checks);
      break;

    case "spe":
      modifier = actor.system.attackMod.value.spell;
      label += getLabelFromKey(key, DC20RPG.checks);
      break;

    case "mar": 
      const acrModifier = actor.system.skills.acr.modifier;
      const athModifier = actor.system.skills.ath.modifier;
      const isAcrHigher =  acrModifier >= athModifier;

      modifier = isAcrHigher ? acrModifier : athModifier;
      const labelKey = isAcrHigher ? "acr" : "ath";
      label += "Martial (" + getLabelFromKey(labelKey, DC20RPG.checks) + ")";
      break;

    default:
      modifier = actor.system.skills[key].modifier;
      label += getLabelFromKey(key, DC20RPG.checks);
      break;
  } 

  label += " Check";
  const formula = `d20 + ${modifier}`;
  rollFromFormula(formula, label, actor, true);
}

export function updateActorHp(actor, updateData) {
  if (updateData.system && updateData.system.resources && updateData.system.resources.health && updateData.system.resources.health.value !== undefined) {
    const newValue = updateData.system.resources.health.value;
    const currentHp = actor.system.resources.health.current;
    const tempHp = actor.system.resources.health.temp ? actor.system.resources.health.temp : 0;
    const oldValue = actor.system.resources.health.value;
    const maxHp = actor.system.resources.health.max;

    if (newValue >= oldValue) {
      const newCurrentHp = Math.min(newValue - tempHp, maxHp);
      const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
      updateData.system.resources.health.current = newCurrentHp;
      updateData.system.resources.health.temp = newTempHp;
    }

    else {
      const valueDif = oldValue - newValue;
      const remainingTempHp = tempHp - valueDif;
      if (remainingTempHp <= 0) {
        updateData.system.resources.health.temp = null;
        updateData.system.resources.health.current = currentHp + remainingTempHp;
      }
      else {
        updateData.system.resources.health.temp = remainingTempHp;
      }
    }
  }
  return updateData;
}

/**
 * Called when new actor is created, makes simple pre-configuration 
 * of actor's prototype token depending on actor type.
 */
export function preConfigurePrototype(actor) {
  let prototypeToken = actor.prototypeToken;
  prototypeToken.displayBars = 20;
  prototypeToken.displayName = 20;
  if (actor.type === "character") {
    prototypeToken.actorLink = true;
    prototypeToken.disposition = 1;
  }
  actor.update({['prototypeToken'] : prototypeToken});
}