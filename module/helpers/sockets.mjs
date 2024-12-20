import { promptRoll, RollPromptDialog } from "../dialogs/roll-prompt.mjs";

export function registerSystemSockets() {

  // Roll Prompt
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "rollPrompt") {
      await rollPrompt(data.payload, emmiterId);
    }
  });

  // Create user for a player
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

  // Re-render Roll Menu Dialog
  game.socket.on("system.dc20rpg", (data) => {
    if (data.type === "rollPromptRerendered") {
      Object.values(ui.windows)
        .filter(window => window instanceof RollPromptDialog)
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
}

async function rollPrompt(payload, emmiterId) {
  const {actorId, details, isToken, tokenId} = payload;
  let actor = game.actors.get(actorId);
  // If we are rolling with unlinked actor we need to use token version
  if (isToken) actor = game.actors.tokens[tokenId]; 
  
  if (actor && actor.ownership[game.user.id] === 3) {
    const roll = await promptRoll(actor, details);
    game.socket.emit('system.dc20rpg', {
      payload: {...roll}, 
      emmiterId: emmiterId,
      actorId: actorId,
      type: "rollPromptResult"
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