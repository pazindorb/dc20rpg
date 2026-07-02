import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { DC20RpgActor } from "../../documents/actor.mjs";
import { DC20RpgTokenDocument } from "../../documents/token.mjs";

/** @deprecated since v0.10.0 until 0.10.5 */
export async function createToken(tokenData) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.createToken' method is deprecated, and will be removed in the later system version. Use 'DC20.DC20RpgTokenDocument.gmCreate' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  return await DC20RpgTokenDocument.gmCreate(tokenData, {parent: canvas.scene});
}

/** @deprecated since v0.10.0 until 0.10.5 */
export async function deleteToken(tokenId) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.deleteToken' method is deprecated, and will be removed in the later system version. Use 'token.gmDelete' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  const token = canvas.tokens.get(tokenId);
  if (!token) return;
  await token.gmDelete();
}

/** @deprecated since v0.10.0 until 0.10.5 */
export function getTokenForActor(actor) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.getTokenForActor' method is deprecated, and will be removed in the later system version. Use 'actor.getActiveTokens' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  return actor.getActiveTokens()[0];
}

/** @deprecated since v0.10.0 until 0.10.5 */
export function getAllTokensForActor(actor) {
  foundry.utils.logCompatibilityWarning("The 'game.dc20rpg.tools.getAllTokensForActor' method is deprecated, and will be removed in the later system version. Use 'actor.getActiveTokens' instead.", { since: " 0.10.0", until: "0.10.5", once: true });
  return actor.getActiveTokens();
}

/**
 * Returns an array of currently selected tokens by user.
 */
export function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}


export function getActorFromIds(actorId, tokenId) {
  let actor = game.actors.tokens[tokenId];        // Try to find unlinked actors first
  if (!actor) actor = game.actors.get(actorId);   // Try to find linked actor next
  return actor;
}

export async function updateActorHp(actor, updateData) {
  if (updateData.system?.resources?.health) {
    const newHealth = updateData.system.resources.health;
    if (newHealth.value) newHealth.value = parseInt(newHealth.value);
    if (newHealth.current) newHealth.current = parseInt(newHealth.current);
    if (newHealth.temp) newHealth.temp = parseInt(newHealth.temp);

    const actorsHealth = actor.system.resources.health;
    const maxHp = actorsHealth.max;
    const currentHp = actorsHealth.current;
    const tempHp = actorsHealth.temp || 0;

    // When value (temporary + current hp) was changed
    if (newHealth.value !== undefined) {
      const newValue = newHealth.value;
      const oldValue = actorsHealth.value;
  
      // Heal
      if (newValue >= oldValue) {
        const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
        if (preventHpRegen) {
          ui.notifications.error('You cannot regain any HP');
          delete updateData.system.resources.health;
          return updateData;
        }

        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        newHealth.current = newCurrentHp;
        newHealth.temp = newTempHp;
        newHealth.value = newCurrentHp + newTempHp;
      }
      // Damage
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
      const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
      if (preventHpRegen) {
        ui.notifications.error('You cannot regain any HP');
        delete updateData.system.resources.health;
        return updateData;
      }
      newHealth.value = newHealth.temp + currentHp;
    }

    // When only current HP was changed
    else if (newHealth.current !== undefined) {
      const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
      if (preventHpRegen) {
        ui.notifications.error('You cannot regain any HP');
        delete updateData.system.resources.health;
        return updateData;
      }
      newHealth.current = newHealth.current >= maxHp ? maxHp : newHealth.current;
      newHealth.value = newHealth.current + tempHp;
    }
    updateData.system.resources.health = newHealth;
  }
  return updateData;
}

export function displayScrollingTextOnToken(token, text, color) {
  canvas.interface.createScrollingText(token.center, text, {
    anchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
    fontSize: 32,
    fill: color,
    stroke: "#000000",
    strokeThickness: 4,
    jitter: 0.25
  });
}

/**
 * Called when new actor is being created, makes simple pre-configuration on actor's prototype token depending on its type.
 */
export function preConfigurePrototype(actor) {
  const updateData = {prototypeToken: {}}
  updateData.prototypeToken.displayBars = 20;
  updateData.prototypeToken.displayName = 20;
  if (actor.type === "character" || actor.type === "companion") {
    updateData.prototypeToken.actorLink = true;
    updateData.prototypeToken.disposition = 1;
  }
  if (actor.type === "storage") {
    updateData.prototypeToken.disposition = 1;
  }
  actor.update(updateData);
}

export function canvasDrop(canvas, data, event) {
  if (data.type === "Item") {
    _canvasItemDrop(canvas, data, event);
    return false;
  }
  if (data.type === "Actor") {
    _canvasActorDrop(canvas, data, event);
    return false;
  }
}

async function _canvasItemDrop(canvas, data, event) {
  const item = await fromUuid(data.uuid);
  if (!item) return;

  // Not only inventory items are droppable
  if (!item.system.inventory) return;

  const confirmed = await SimplePopup.confirm("Do you want to drop that item?");
  if (!confirmed) return;

  // Change item token size
  let size = {};
  switch (game.settings.get("dc20rpg","dropCanvasItemSize")) {
    case "tiny":
      size = {width: 0.40, height: 0.40};
      break;

    case "small":
      size = {width: 0.65, height: 0.65};
      break;
  }

  const itemData = item.toObject();
  item.gmDelete({transfer: true});

  const tempActor = new DC20RpgActor({
    type: "storage",
    name: itemData.name,
    img: itemData.img,
  })
  const tokenData = await tempActor.getTokenDocument();
  tokenData.updateSource({
    x: data.x, 
    y: data.y,
    name: itemData.name,
    img: itemData.img,
    flags: {
      dc20rpg: {itemData: itemData}
    },
    texture: {src: itemData.img},
    disposition: -2,
    displayName: 0,
    ...size
  });
  await DC20RpgTokenDocument.gmCreate(tokenData.toObject(), {parent: canvas.scene});
}

async function _canvasActorDrop(canvas, data, event) {
  const token = canvas.tokens.placeables.find(token => token.bounds.contains(data.x, data.y));
  if (token && token.actor) {
    const actor = await fromUuid(data.uuid);  
    const confirmed = await SimplePopup.confirm(`Do you want to transform '${token.actor.name}' into '${actor.name}'`); // TODO: Change it to fully configurable window? Ask about transfering effects/conditons + templates? (only temporary ones?) - if false we need to remove those from actor data
    if (confirmed) return token.document.transformation(actor);
  }
  return canvas.tokens._onDropActorData(event, data);
}