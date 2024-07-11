export async function addStatusWithIdToActor(actor, id) {
  // v11 compatibility (TODO: REMOVE LATER)
  if (parseFloat(game.version) < 12.0) addStatusV11(actor, id);
  else actor.toggleStatusEffect(id, { active: true });
}

export async function removeStatusWithIdFromActor(actor, id) {
  // v11 compatibility (TODO: REMOVE LATER)
  if (parseFloat(game.version) < 12.0) removeStatusV11(actor, id);
  else actor.toggleStatusEffect(id, { active: false });
}

function getStatusById(id) {
  return CONFIG.statusEffects.find(status => status.id === id);
}

async function addStatusV11(actor, id) {
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

async function removeStatusV11(actor, id) {
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