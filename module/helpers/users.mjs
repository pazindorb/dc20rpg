/**
 * Returns owners of specific Actor
 */
export function getActiveActorOwners(actor, allowGM) {
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

export function getActivePlayers(allowGM) {
  return game.users
      .filter(user => user.active)
      .filter(user => {
        if (user.isGM) return allowGM;
        else return true;
      })
}