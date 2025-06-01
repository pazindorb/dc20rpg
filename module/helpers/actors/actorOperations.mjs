import { emitEventToGM } from "../sockets.mjs";

export async function updateActor(actor, updateData) {
  if (!actor.canUserModify(game.user, "update")) {
    emitEventToGM("updateDocument", {
      docType: "actor",
      docId: actor.id, 
      actorUuid: actor.uuid,
      updateData: updateData
    });
    return;
  }
  return await actor.update(updateData);
}