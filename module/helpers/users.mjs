export function getActiveActorOwners(actor) {
  const ownersIds = Object.entries(actor.ownership)
            .filter(([ownerId, ownType]) => ownerId !== game.user.id)
            .filter(([ownerId, ownType]) => ownerId !== "default")
            .filter(([ownerId, ownType]) => ownType === 3);

  const owners = [];
  ownersIds.forEach(ownership => {
    const ownerId = ownership[0];
    const owner = game.users.get(ownerId);
    if (owner && owner.active) owners.push(owner);
  })
  return owners;
}