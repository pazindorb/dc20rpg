import { createRestDialog } from "../dialogs/rest.mjs";
import { promptItemRoll, promptRoll, RollDialog } from "../roll/rollDialog.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";
import { createItemOnActor, deleteItemFromActor, updateItemOnActor } from "./actors/itemsOnActor.mjs";
import { createToken, deleteToken } from "./actors/tokens.mjs";
import { createEffectOn, deleteEffectFrom, toggleEffectOn, updateEffectOn } from "./effects.mjs";

export function registerSystemSockets() {

  // Simple Popup
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "simplePopup") {
      const { popupType, popupData, popupOptions, userIds, signature } = data.payload;
      if (userIds.includes(game.user.id)) {
        const result = await SimplePopup.create(popupType, popupData, popupOptions);
        game.socket.emit('system.dc20rpg', {
          payload: result, 
          emmiterId: emmiterId,
          type: "simplePopupResult",
          signature: signature
        });
      }
    }
  });

  // Initative Roll
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "initative") {
      const {actorId} = data.payload;
      const actor = game.actors.get(actorId);

      if (actor && actor.ownership[game.user.id] === 3) {
        actor.rollInitiative({rerollInitiative: true});
      }
    }
  });

  // Roll Prompt
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "rollDialog") {
      await rollPrompt(data.payload, emmiterId);
    }
  });

  // Open Rest Dialog
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "startRest") {
      const {actorId, preselected} = data.payload;
      const actor = game.actors.get(actorId);

      if (actor && actor.ownership[game.user.id] === 3) {
        createRestDialog(actor, preselected);
      }
    }
  });

  // Create actor for a player
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "createActor") {
      if (game.user.id === data.gmUserId) {
        const actor = await Actor.create(data.actorData);
        game.socket.emit('system.dc20rpg', {
          payload: actor._id, 
          emmiterId: emmiterId,
          type: "actorCreated"
        });
      }
    }
  });

  // Update Chat Message
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "updateChatMessage") {
      const m = data.payload;
      if (game.user.id === m.gmUserId) {
        const message = game.messages.get(m.messageId);
        if (message) message.update(m.updateData);
      }
    }
  });

  // Add Document to Actor 
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "addDocument") {
      const { docType, docData, actorUuid, gmUserId } = data.payload;
      if (game.user.id === gmUserId) {
        const actor = await fromUuid(actorUuid);
        if (actorUuid && !actor) return;
        if (docType === "item") await createItemOnActor(actor, docData);
        if (docType === "effect") await createEffectOn(docData, actor);
        if (docType === "token") await createToken(docData);
      }
    }
  });

  // Update Document on Actor
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "updateDocument") {
      const { docType, docId, actorUuid, updateData, operation, gmUserId } = data.payload;
      if (game.user.id === gmUserId) {
        const actor = await fromUuid(actorUuid);
        if (!actor) return;
        if (docType === "item") await updateItemOnActor(docId, actor, updateData);
        if (docType === "effect") await updateEffectOn(docId, actor, updateData);
        if (docType === "actor") await actor.gmUpdate(updateData, operation);
      }
    }
  });

  // Remove Document from Actor
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "removeDocument") {
      const { docType, docId, actorUuid, gmUserId } = data.payload;
      if (game.user.id === gmUserId) {
        const actor = await fromUuid(actorUuid);
        if (actorUuid && !actor) return;
        if (docType === "item") await deleteItemFromActor(docId, actor);
        if (docType === "effect") await deleteEffectFrom(docId, actor);
        if (docType === "token") await deleteToken(docId);
      }
    }
  });

  // Disable/Enable Effect 
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "toggleEffectOn") {
      const { effectId, turnOn, ownerUuid, gmUserId } = data.payload;
      if (game.user.id === gmUserId) {
        const owner = await fromUuid(ownerUuid);
        if (ownerUuid && !owner) return;
        await toggleEffectOn(effectId, owner, turnOn);
      }
    }
  });
  
  // Re-render Roll Menu Dialog
  game.socket.on("system.dc20rpg", (data) => {
    if (data.type === "rollPromptRerendered") {
      Object.values(ui.windows)
        .filter(window => window instanceof RollDialog)
        .forEach(window => {
          if (window.itemRoll) {
            if (window.item.id === data.payload.itemId) {
              window.render(false, {dontEmit: true});
            }
          }
          else {
            if (window.actor.id === data.payload.actorId) {
              window.render(false, {dontEmit: true});
            }
          }
        });
    }
  });

  game.socket.on("system.dc20rpg", (data) => {
    if (data.type === "askGmForHelp") {
      const p = data.payload;
      if (game.user.id === p.gmUserId) {
        const actor = game.actors.get(p.actorId);
        if (!actor) return;

        const item = actor.items.get(p.itemId);
        if (!item) return;
        promptItemRoll(actor, item, false, true);
      }
    }
  })
}

async function rollPrompt(payload, emmiterId) {
  let actor = game.actors.get(payload.actorId);
  let data = payload.data;
  const options = payload.options;
  
  // If we are rolling with unlinked actor we need to use token version
  if (payload.isToken) actor = game.actors.tokens[payload.tokenId]; 
  if (payload.isItem) data = actor.items.get(payload.itemId);
  
  if (actor && actor.ownership[game.user.id] === 3) {
    const roll = await RollDialog.create(actor, data, options);
    game.socket.emit('system.dc20rpg', {
      payload: {...roll}, 
      emmiterId: emmiterId,
      actorId: payload.actorId,
      type: "rollDialogResult"
    });
  }
}

//================================
//    Socket helper functions    =
//================================
/**
 * Response listener. Will report only first recieved response
 */
export async function responseListener(type, validationData={}) {
  return new Promise((resolve) => {
    game.socket.once('system.dc20rpg', (response) => {
      if (response.type !== type) {
        resolve(responseListener(type, validationData));
      }
      else if (!_validateResponse(response, validationData)) {
        resolve(responseListener(type, validationData));
      }
      else {
        resolve(response.payload);
      }
    });
  });
}

function _validateResponse(response, validationData) {
  for (const [key, expectedValue] of Object.entries(validationData)) {
    if (response[key]) {
      if (response[key] !== expectedValue) return false;
    }
  }
  return true;
}

export function emitSystemEvent(type, payload) {
  game.socket.emit('system.dc20rpg', {
    type: type,
    payload: payload
  });
}

export function emitEventToGM(type, payload) {
  const activeGM = game.users.activeGM;
  if (!activeGM) {
    ui.notifications.error("There needs to be an active GM to proceed with that operation");
    return false;
  }
  emitSystemEvent(type, {
    gmUserId: activeGM.id,
    ...payload,
  })
}