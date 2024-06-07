export async function addStatusWithIdToActor(actor, id) {
  actor.toggleStatusEffect(id, { active: true });
}

export async function removeStatusWithIdFromActor(actor, id) {
  actor.toggleStatusEffect(id, { active: false });
}