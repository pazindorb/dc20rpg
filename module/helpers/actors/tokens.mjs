import { runEventsFor } from "./events.mjs";
import { runConcentrationCheck, runHealthThresholdsCheck } from "./resources.mjs";

export function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

/**
 * If token is linked, returns linked actor.
 * If not returns token specific actor.
 */
export function getActorFromToken(token) {
  let actor = token.actor;
  if (actor.isToken) return game.actors.tokens[token.id];
  else return actor;
}

export function getActorFromId(id) {
  let actor = game.actors.get(id);            // Try to find linked actor
  if (!actor) actor = game.actors.tokens[id]; // If linked does not exist try to find token actor
  return actor;
}

export function updateActorHp(actor, updateData) {
  if (updateData.system && updateData.system.resources && updateData.system.resources.health) {
    const newHealth = updateData.system.resources.health;
    const actorsHealth = actor.system.resources.health;
    const maxHp = actorsHealth.max;
    const currentHp = actorsHealth.current;
    const tempHp = actorsHealth.temp || 0;

    // When value (temporary + current hp) was changed
    if (newHealth.value !== undefined) {
      const newValue = newHealth.value;
      const oldValue = actorsHealth.value;
  
      if (newValue >= oldValue) {
        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        newHealth.current = newCurrentHp;
        newHealth.temp = newTempHp;
        newHealth.value = newCurrentHp + newTempHp;
      }
  
      else {
        const valueDif = oldValue - newValue;
        const remainingTempHp = tempHp - valueDif;
        if (remainingTempHp <= 0) { // It is a negative value we want to subtract from currentHp
          newHealth.temp = null;
          newHealth.current = currentHp + remainingTempHp; 
          newHealth.value = currentHp + remainingTempHp;
        }
        else {
          newHealth.temp = remainingTempHp;
          newHealth.value = currentHp + remainingTempHp;
        }
      }
    }

    // When only temporary HP was changed
    else if (newHealth.temp !== undefined) {
      newHealth.value = newHealth.temp + currentHp;
    }

    // When only current HP was changed
    else if (newHealth.current !== undefined) {
      newHealth.current = newHealth.current >= maxHp ? maxHp : newHealth.current;
      newHealth.value = newHealth.current + tempHp;
    }

    if (newHealth.current !== undefined) {
      const tresholdData = runHealthThresholdsCheck(currentHp, newHealth.current, maxHp, actor);
      const hpDif = currentHp - newHealth.current;
      if (hpDif < 0) runEventsFor("healingTaken", actor);
      else if (hpDif > 0) runEventsFor("damageTaken", actor);
      runConcentrationCheck(currentHp, newHealth.current, actor);
      foundry.utils.mergeObject(updateData, tresholdData)
    }
    updateData.system.resources.health = newHealth;
  }
  return updateData;
}

/**
 * Called when new actor is being created, makes simple pre-configuration on actor's prototype token depending on its type.
 */
export function preConfigurePrototype(actor) {
  const prototypeToken = actor.prototypeToken;
  prototypeToken.displayBars = 20;
  prototypeToken.displayName = 20;
  if (actor.type === "character") {
    prototypeToken.actorLink = true;
    prototypeToken.disposition = 1;
  }
  actor.update({['prototypeToken'] : prototypeToken});
}

/**
 * Converts tokens to targets used by chat messages
 */
export function tokenToTarget(token) {
  const actor = token.actor;
  const conditions = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
  const target = {
    name: actor.name,
    img: actor.img,
    id: token.id,
    isOwner: actor.isOwner,
    system: actor.system,
    conditions: conditions
  };
  return target;
}