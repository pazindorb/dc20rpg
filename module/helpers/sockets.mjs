import { promptRoll } from "../dialogs/roll-prompt.mjs";

export function registerSystemSockets() {

  // Roll Prompt
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    await rollPrompt(data, emmiterId);
  });
}

async function rollPrompt(data, emmiterId) {
  if (data.type !== "rollPrompt") return;

  const {actorId, details} = data.payload;
  const actor = game.actors.get(actorId);
  if (actor && actor.ownership[game.user.id] === 3) {
    const roll = await promptRoll(actor, details);
    game.socket.emit('system.dc20rpg', {
      payload: {...roll}, 
      emmiterId: emmiterId,
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
export async function responseListener(type, listenerId) {
  return new Promise((resolve) => {
    game.socket.once('system.dc20rpg', (response) => {
      if (response.type !== type) resolve(null);
      if (response.emmiterId !== listenerId) resolve(null);
      resolve(response.payload);
    });
  });
}

export function emitSystemEvent(type, payload) {
  game.socket.emit('system.dc20rpg', {
    type: type,
    payload: payload
  });
}