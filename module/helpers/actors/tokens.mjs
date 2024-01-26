import { createHPChangeChatMessage } from "../../chat/chat.mjs";

export async function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

export function updateActorHp(actor, updateData) {
  if (updateData.system && updateData.system.resources && updateData.system.resources.health) {
    // When value (temporary + current hp) was changed
    if (updateData.system.resources.health.value !== undefined) {
      const actorsHealth = actor.system.resources.health;
      const newValue = updateData.system.resources.health.value;
      const currentHp = actorsHealth.current;
      const tempHp = actorsHealth.temp ? actorsHealth.temp : 0;
      const oldValue = actorsHealth.value;
      const maxHp = actorsHealth.max;
  
      if (newValue >= oldValue) {
        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        updateData.system.resources.health.current = newCurrentHp;
        updateData.system.resources.health.temp = newTempHp;
        createHPChangeChatMessage(actor, newValue - oldValue, "healing");
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
        createHPChangeChatMessage(actor, newValue - oldValue, "damage");
      }
    }

    // When only temporary HP was changed
    else if (updateData.system.resources.health.temp !== undefined) {
      const newTempHp = updateData.system.resources.health.temp;
      const tempHp = actor.system.resources.health.temp ? actor.system.resources.health.temp : 0;
      createHPChangeChatMessage(actor, newTempHp - tempHp, "temporary");
    }
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