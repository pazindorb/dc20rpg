export async function addStatusWithIdToActor(actor, id) {
  actor.toggleStatusEffect(id, { active: true });
}

export async function removeStatusWithIdFromActor(actor, id) {
  actor.toggleStatusEffect(id, { active: false });
}

export function hasStatusWithId(actor, statusId) {
  for ( const status of actor.statuses) {
    if (status.id === statusId) return true;
  }
  return false;
}

export function getStatusWithId(actor, statusId) {
  for ( const status of actor.statuses) {
    if (status.id === statusId) return status;
  }
  return null;
}