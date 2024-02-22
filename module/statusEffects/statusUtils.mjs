export function getStatusById(id) {
  return CONFIG.statusEffects.find(status => status.id === id);
}

export async function addStatusWithIdToActor(actor, id) {
  const status = getStatusById(id);
  if (actor.isToken) {
    const tokens = actor.getActiveTokens();
    tokens.forEach(token => token.toggleEffect(status, { active: true }));
  }
  else {
    const tokenDoc = await actor.getTokenDocument();
    tokenDoc.toggleActiveEffect(status, { active: true });
  }
}

export async function removeStatusWithIdFromActor(actor, id) {
  const status = getStatusById(id);
  if (actor.isToken) {
    const tokens = actor.getActiveTokens();
    tokens.forEach(token => token.toggleEffect(status, { active: false }));
  }
  else {
    const tokenDoc = await actor.getTokenDocument();
    tokenDoc.toggleActiveEffect(status, { active: false });
  }
}