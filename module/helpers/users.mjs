import { getSimplePopup } from "../dialogs/simple-popup.mjs";

/**
 * Returns array of owners of specific Actor
 */
export function getActiveActorOwners(actor, allowGM=false) {
  if (!actor) return [];
  const ownership = Object.entries(actor.ownership).filter(([userId, value]) => value === 3).map(([userId, value]) => userId);

  const owners = [];
  for (const ownerId of ownership) {
    if (ownerId === "default") continue;
    const user = game.users.get(ownerId);
    if (user.isGM && !allowGM) continue;
    if (user.active) owners.push(user);
  }
  return owners;
}

/**
 * Returns array of user its of owners of specific Actor
 */
export function getIdsOfActiveActorOwners(actor, allowGM) {
  const owners = getActiveActorOwners(actor, allowGM);
  return owners.map(owner => owner._id);
}

export function getActivePlayers(allowGM) {
  return game.users
      .filter(user => user.active)
      .filter(user => {
        if (user.isGM) return allowGM;
        else return true;
      })
}

export async function userSelector(skipGM) {
  const users = {};
  game.users
          .filter(user => !skipGM || !user.isGM)
          .filter(user => game.userId !== user.id)
          .forEach(user => users[user.id] = user.name);
  const userId = await getSimplePopup("select", {header: "Select User", selectOptions: users});
  return game.users.get(userId);
}

export function getActorsForUser(onlyPC=false, user=game.user) {
  return game.actors
              .filter(actor =>  actor.testUserPermission(user, "OWNER"))
              .filter(actor => !onlyPC || actor.type === "character");
}