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
  const key = dataset.save;
  let save = "";

  switch (key) {
    case "phi": 
      const migSave = actor.system.attributes.mig.save;
      const agiSave = actor.system.attributes.agi.save;
      save = migSave >= agiSave ? migSave : agiSave;
      break;
    
    case "men": 
      const intSave = actor.system.attributes.int.save;
      const chaSave = actor.system.attributes.cha.save;
      save = intSave >= chaSave ? intSave : chaSave;
      break;

    default:
      save = actor.system.attributes[key].save;
      break;
  }

  let label = getLabelFromKey(dataset.save, DC20RPG.saveTypes) + " Save";
  const formula = `d20 + ${save}`;
  rollFromFormula(formula, label, actor, true);
}

function _rollCheck(actor, dataset) {
  const key = dataset.key;
  let modifier = "";

  switch (key) {
    case "att":
      modifier = actor.system.attackMod.value.martial;
      break;

    case "spe":
      modifier = actor.system.attackMod.value.spell;
      break;

    case "mar": 
      const acrModifier = actor.system.skills.acr.modifier;
      const athModifier = actor.system.skills.ath.modifier;
      modifier = acrModifier >= athModifier ? acrModifier : athModifier;
      break;

    default:
      modifier = actor.system.skills[key].modifier;
      break;
  } 

  let label = getLabelFromKey(key, DC20RPG.checks) + " Check";
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