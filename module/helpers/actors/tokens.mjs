import { isPointInPolygon } from "../utils.mjs";

export function getTokenForActor(actor) {
  if (actor.isToken) return actor.token.object;
  else {
    const tokens = canvas.tokens.placeables.filter(token => token.actor?.id === actor.id);
    return tokens[0];
  }
}

export function getAllTokensForActor(actor) {
  if (actor.isToken) return [actor.token.object];
  else {
    const tokens = canvas.tokens.placeables.filter(token => token.actor?.id === actor.id);
    return tokens;
  }
}

/**
 * Returns an array of currently selected tokens by user.
 */
export function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

export function getTokensInsideMeasurementTemplate(template, dispositions=[]) {
  if (!template) return {};
  const tokens = canvas.tokens.placeables;
  if (!tokens) return {};
  
  const tokensInTemplate = {};
  for (const token of tokens) {
    if (_isTokenInsideTemplate(token, template)) {
      if (dispositions.length > 0) {
        if (dispositions.includes(token.document.disposition)) {
          tokensInTemplate[token.id] = token;
        }
      }
      else {
        tokensInTemplate[token.id] = token;
      }
    }
  }
  return tokensInTemplate;
}

function _isTokenInsideTemplate(token, template) {
  // Gridless Mode
  if (canvas.grid.isGridless) {
    const shape = template._getGridHighlightShape();
    const points = getGridlessTokenPoints(token);

    // Circle
    if (shape.type === 2) {
      const startX = template.document.x;
      const startY = template.document.y;
      const radius = shape.radius;

      for (let i = 0; i < points.length; i++) {
        const x = points[i].x;
        const y = points[i].y;
        const distanceSquared = (x - startX) ** 2 + (y - startY) ** 2;
        if (distanceSquared <= radius ** 2) return true;
      }
      return false;
    }
    // Ray
    if (shape.type === 0) {
      const shapePoints = shape.points;
      const startX = template.document.x;
      const startY = template.document.y;

      // Collect points related to starting position
      const polygon = [];
      for (let i = 0; i < shapePoints.length; i=i+2) {
        const x = startX + shapePoints[i];
        const y = startY + shapePoints[i+1];
        polygon.push({x: x, y: y});
      }

      for (let i = 0; i < points.length; i++) {
        const x = points[i].x;
        const y = points[i].y;
        if (isPointInPolygon(x, y, polygon)) return true;
      }
      return false;
    }
  }
  // Grid Mode
  else {
    const highlightedSpaces = template.highlightedSpaces;
    const tokenSpaces = token.getOccupiedGridSpaces();
    // If at least one token space equal highlighted one we have a match 
    // Should we change it to some % of all token occupied spaces?
    for (let i = 0; i < highlightedSpaces.length; i++) {
      for (let j = 0; j < tokenSpaces.length; j++) {
        const horizontal = highlightedSpaces[i][0] === tokenSpaces[j][0];
        const vertical = highlightedSpaces[i][1] === tokenSpaces[j][1];
        if (horizontal && vertical) return true;
      }
    }
    return false;
  }
}

export function getGridlessTokenPoints(token) {
  // We want to collect some points inside a token so we can 
  // check later if any of those fit our measurement template
  const startX = token.x;
  const startY = token.y;
  const endX = startX + token.w;
  const endY = startY + token.h;

  // We assume quarter of the grid size should be enough to match most our cases
  const step = canvas.grid.size/4;
  const tokenPoints = [];
  for (let x = startX; x < endX; x=x+step) {
    for (let y = startY; y < endY; y=y+step) {
      tokenPoints.push({x: x, y: y});
    }
  }
  return tokenPoints;
}

export function getGridlessTokenCorners(token) {
  const height = token.document.getSize().height;
  const width = token.document.getSize().width;

  return {
    x1y1: {x: token.x, y: token.y},
    x2y1: {x: token.x + width, y: token.y},
    x1y2: {x: token.x, y: token.y + height},
    x2y2: {x: token.x + width, y: token.y + height},
  }
}

export function getRangeAreaAroundGridlessToken(token, distance) {
  const rangeArea = getGridlessTokenCorners(token);
  const sizeX = canvas.grid.sizeX;
  const sizeY = canvas.grid.sizeY;

  rangeArea.x1y1.x -= distance * sizeX + (0.1 * sizeX);
  rangeArea.x1y1.y -= distance * sizeY + (0.1 * sizeY);
  rangeArea.x1y2.x -= distance * sizeX + (0.1 * sizeX);
  rangeArea.x1y2.y += distance * sizeY + (0.1 * sizeY);
  rangeArea.x2y1.x += distance * sizeX + (0.1 * sizeX);
  rangeArea.x2y1.y -= distance * sizeY + (0.1 * sizeY);
  rangeArea.x2y2.x += distance * sizeX + (0.1 * sizeX);
  rangeArea.x2y2.y += distance * sizeY + (0.1 * sizeY);
  
  return rangeArea;
}

export function getActorFromIds(actorId, tokenId) {
  let actor = game.actors.tokens[tokenId];        // Try to find unlinked actors first
  if (!actor) actor = game.actors.get(actorId);   // Try to find linked actor next
  return actor;
}

export async function updateActorHp(actor, updateData) {
  if (updateData.system?.resources?.health) {
    const newHealth = updateData.system.resources.health;
    const actorsHealth = actor.system.resources.health;
    const maxHp = actorsHealth.max;
    const currentHp = actorsHealth.current;
    const tempHp = actorsHealth.temp || 0;

    // When value (temporary + current hp) was changed
    if (newHealth.value !== undefined) {
      const newValue = newHealth.value;
      const oldValue = actorsHealth.value;
  
      // Heal
      if (newValue >= oldValue) {
        const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
        if (preventHpRegen) {
          ui.notifications.error('You cannot regain any HP');
          delete updateData.system.resources.health;
          return updateData;
        }

        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        newHealth.current = newCurrentHp;
        newHealth.temp = newTempHp;
        newHealth.value = newCurrentHp + newTempHp;
      }
      // Damage
      else {
        const valueDif = oldValue - newValue;
        const remainingTempHp = tempHp - valueDif;
        if (remainingTempHp <= 0) { // It is a negative value we want to subtract from currentHp
          newHealth.temp = null;
          newHealth.current = currentHp + remainingTempHp; 
          newHealth.value = currentHp + remainingTempHp;
        }
        else {
          newHealth.temp = remainingTempHp;
          newHealth.value = currentHp + remainingTempHp;
        }
      }
    }

    // When only temporary HP was changed
    else if (newHealth.temp !== undefined) {
      const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
      if (preventHpRegen) {
        ui.notifications.error('You cannot regain any HP');
        delete updateData.system.resources.health;
        return updateData;
      }
      newHealth.value = newHealth.temp + currentHp;
    }

    // When only current HP was changed
    else if (newHealth.current !== undefined) {
      const preventHpRegen = actor.system.globalModifier.prevent.hpRegeneration;
      if (preventHpRegen) {
        ui.notifications.error('You cannot regain any HP');
        delete updateData.system.resources.health;
        return updateData;
      }
      newHealth.current = newHealth.current >= maxHp ? maxHp : newHealth.current;
      newHealth.value = newHealth.current + tempHp;
    }
    updateData.system.resources.health = newHealth;
  }
  return updateData;
}

export function displayScrollingTextOnToken(token, text, color) {
  canvas.interface.createScrollingText(token.center, text, {
    anchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
    fontSize: 32,
    fill: color,
    stroke: "#000000",
    strokeThickness: 4,
    jitter: 0.25
  });
}

/**
 * Called when new actor is being created, makes simple pre-configuration on actor's prototype token depending on its type.
 */
export function preConfigurePrototype(actor) {
  const prototypeToken = actor.prototypeToken;
  prototypeToken.displayBars = 20;
  prototypeToken.displayName = 20;
  if (actor.type === "character" || actor.type === "companion") {
    prototypeToken.actorLink = true;
    prototypeToken.disposition = 1;
  }
  actor.update({['prototypeToken'] : prototypeToken});
}