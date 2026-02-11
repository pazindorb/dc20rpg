import { RestDialog } from "../dialogs/rest.mjs";
import { RollDialog } from "../roll/rollDialog.mjs";
import { SimplePopup } from "../dialogs/simple-popup.mjs";

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
      const payload = data.payload;

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
  });

  // Open Rest Dialog
  game.socket.on('system.dc20rpg', async (data) => {
    if (data.type === "startRest") {
      const {actorId, options} = data.payload;
      const actor = game.actors.get(actorId);

      if (actor && actor.ownership[game.user.id] === 3) {
        RestDialog.create(actor, options);
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
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "CREATE_DOCUMENT") {
      const { createData, operation, documentClassName, signature, gmUserId } = data.payload;
      if (game.user.id !== gmUserId) return;

      const documentClass = getDocumentClass(documentClassName);
      if (!documentClass) {
        ui.notifications.error(`Document Class with name ${documentClassName} doesn't exist.`);
        return;
      }

      if (operation.parent) operation.parent = await fromUuid(operation.parent);
      const result = await documentClass.create(createData, operation);
      if (signature) {
        let uuids;
        if (Array.isArray(result)) uuids = result.map(r => r.uuid);
        else if (result) uuids = [result.uuid];

        game.socket.emit('system.dc20rpg', {
          payload: uuids, 
          emmiterId: emmiterId,
          type: "CREATE_DOCUMENT_RESPONSE",
          signature: signature
        });
      }
    }
  });

  // Update Document on Actor
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "UPDATE_DOCUMENT") {
      const { uuid, updateData, operation, signature, gmUserId } = data.payload;
      if (game.user.id !== gmUserId) return;

      const document = await fromUuid(uuid);
      if (!document) {
        ui.notifications.error(`Document with uuid ${uuid} doesn't exist.`);
        return;
      }

      const result = await document.update(updateData, operation);
      if (signature) {
        game.socket.emit('system.dc20rpg', {
          payload: result.uuid, 
          emmiterId: emmiterId,
          type: "UPDATE_DOCUMENT_RESPONSE",
          signature: signature
        });
      }
    }
  });

  // Remove Document from Actor
  game.socket.on('system.dc20rpg', async (data, emmiterId) => {
    if (data.type === "DELETE_DOCUMENT") {
      const { uuid, operation, signature, gmUserId } = data.payload;
      if (game.user.id !== gmUserId) return;

      const document = await fromUuid(uuid);
      if (!document) {
        ui.notifications.error(`Document with uuid ${uuid} doesn't exist.`);
        return;
      }

      const result = await document.delete(operation);
      if (signature) {
        game.socket.emit('system.dc20rpg', {
          payload: !!result, 
          emmiterId: emmiterId,
          type: "DELETE_DOCUMENT_RESPONSE",
          signature: signature
        });
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

  // FOR NOW REMOVED - Maybe I will bring it back
  game.socket.on("system.dc20rpg", (data) => {
    if (data.type === "askGmForHelp") {
      const p = data.payload;
      if (game.user.id === p.gmUserId) {
        const actor = game.actors.get(p.actorId);
        if (!actor) return;

        const item = actor.items.get(p.itemId);
        if (!item) return;
        RollDialog.open(actor, item);
      }
    }
  })
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

//================================
//         GM CRUD Methods       =
//================================
/**
 * Run CREATE opperation on Document. If user doesn't have permissions to do so request will be sent to active GM.
 * @param {object|Document|(object|Document)[]} [data={}] Initial data used to create this Document, or a Document
 *                                                        instance to persist.
 * @param {Partial<Omit<DatabaseCreateOperation, "data">>} [operation={}]  Parameters of the creation operation
 * @returns {Promise<Document[] | undefined>}        The created Document instance(s)
 */
export async function gmCreate(data={}, operation={}, DocumentClass) {
  const docPerm = operation.parent ? operation.parent.testUserPermission(game.user, "OWNER") : false;
  const globalPerm = DocumentClass.canUserCreate(game.user);
  const canCreate = docPerm || globalPerm;

  if (!canCreate) {
    if (operation.parent) operation.parent = operation.parent.uuid; // We cannot transfer full document via socket
    if (operation.ignoreResponse) {
      emitEventToGM("CREATE_DOCUMENT", {createData: data, operation: operation, documentClassName: DocumentClass.documentName});
    }
    else {
      const signature = foundry.utils.randomID();
      const validationData = {emmiterId: game.user.id, signature: signature}
      const response = responseListener("CREATE_DOCUMENT_RESPONSE", validationData);
      emitEventToGM("CREATE_DOCUMENT", {createData: data, operation: operation, documentClassName: DocumentClass.documentName, signature: signature});
      const result = await response;
      if (!result) return;

      const created = [];
      for (const uuid of result) {
        const doc = await fromUuid(uuid);
        created.push(doc);
      }
      return created;
    }
  }

  else {
    const result = await DocumentClass.create(data, operation);
    if (Array.isArray(result)) return result;
    else if (result) return [result];
  }
}

/**
 * Run UPDATE opperation on Document. If user doesn't have permissions to do so request will be sent to active GM.
 * @param {object} [data={}]          Differential update data which modifies the existing values of this document
 * @param {Partial<Omit<DatabaseUpdateOperation, "updates">>} [operation={}]  Parameters of the update operation
 * @returns {Promise<Document|undefined>}       The updated Document instance, or undefined not updated
 */
export async function gmUpdate(data={}, operation={}, object) {
  if (!object.canUserModify(game.user, "update")) {
    if (operation.ignoreResponse) {
      emitEventToGM("UPDATE_DOCUMENT", {uuid: object.uuid, updateData: data, operation: operation});
    }
    else {
      const signature = foundry.utils.randomID();;
      const validationData = {emmiterId: game.user.id, signature: signature}
      const response = responseListener("UPDATE_DOCUMENT_RESPONSE", validationData);
      emitEventToGM("UPDATE_DOCUMENT", {uuid: object.uuid, updateData: data, operation: operation, signature: signature});
      const result = await response;
      if (!result) return;
      return await fromUuid(result);
    }
  }

  else {
    return await object.update(data, operation);
  }
}

/**
 * Run DELETE opperation on Document. If user doesn't have permissions to do so request will be sent to active GM.
 * @see {@link Document.DELETE_DOCUMENTs}
 * @param {Partial<Omit<DatabaseDeleteOperation, "ids">>} [operation={}]  Parameters of the deletion operation
 * @returns {Promise<boolean|undefined>}       True if deleted, false if not
 */
export async function gmDelete(operation={}, object) {
  if (!object.canUserModify(game.user, "delete")) {
    if (operation.ignoreResponse) {
      emitEventToGM("DELETE_DOCUMENT", {uuid: object.uuid, operation: operation});
    }
    else {
      const signature = foundry.utils.randomID();;
      const validationData = {emmiterId: game.user.id, signature: signature}
      const response = responseListener("DELETE_DOCUMENT_RESPONSE", validationData);
      emitEventToGM("DELETE_DOCUMENT", {uuid: object.uuid, operation: operation, signature: signature});
      const result = await response;
      return result;
    }
  }
  
  else {
    const deleted = await object.delete(operation);
    return !!deleted;
  }
}