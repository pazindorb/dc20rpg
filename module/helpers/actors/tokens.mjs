import { isPointInPolygon } from "../utils.mjs";
import { runEventsFor } from "./events.mjs";
import { runConcentrationCheck, runHealthThresholdsCheck } from "./resources.mjs";

export function getSelectedTokens() {
  if (canvas.activeLayer === canvas.tokens) return canvas.activeLayer.placeables.filter(p => p.controlled === true);
}

export function getTokensInsideMeasurementTemplate(template) {
  if (!template) return {};
  const tokens = canvas.tokens.placeables;
  if (!tokens) return {};
  
  const tokensInTemplate = {};
  for (const token of tokens) {
    if (_isTokenInsideTemplate(token, template)) {
      tokensInTemplate[token.id] = token;
    }
  }
  return tokensInTemplate;
}

function _isTokenInsideTemplate(token, template) {
  // Gridless Mode
  if (canvas.grid.isGridless) {
    const shape = template._getGridHighlightShape();
    const points = _getTokenPoints(token);

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

function _getTokenPoints(token) {
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

/**
 * If token is linked, returns linked actor.
 * If not returns token specific actor.
 */
export function getActorFromToken(token) {
  let actor = token.actor;
  if (actor.isToken) return game.actors.tokens[token.id];
  else return actor;
}

export function getActorFromId(id) {
  let actor = game.actors.get(id);            // Try to find linked actor
  if (!actor) actor = game.actors.tokens[id]; // If linked does not exist try to find token actor
  return actor;
}

export function updateActorHp(actor, updateData) {
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
  
      if (newValue >= oldValue) {
        const newCurrentHp = Math.min(newValue - tempHp, maxHp);
        const newTempHp = newValue - newCurrentHp > 0 ? newValue - newCurrentHp : null;
        newHealth.current = newCurrentHp;
        newHealth.temp = newTempHp;
        newHealth.value = newCurrentHp + newTempHp;
      }
  
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
      newHealth.value = newHealth.temp + currentHp;
    }

    // When only current HP was changed
    else if (newHealth.current !== undefined) {
      newHealth.current = newHealth.current >= maxHp ? maxHp : newHealth.current;
      newHealth.value = newHealth.current + tempHp;
    }

    if (newHealth.current !== undefined) {
      const tresholdData = runHealthThresholdsCheck(currentHp, newHealth.current, maxHp, actor);
      const hpDif = currentHp - newHealth.current;
      if (hpDif < 0) runEventsFor("healingTaken", actor, {amount: Math.abs(hpDif)});
      else if (hpDif > 0) runEventsFor("damageTaken", actor, {amount: Math.abs(hpDif)});
      runConcentrationCheck(currentHp, newHealth.current, actor);
      foundry.utils.mergeObject(updateData, tresholdData)
    }
    updateData.system.resources.health = newHealth;
  }
  return updateData;
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

/**
 * Converts tokens to targets used by chat messages
 */
export function tokenToTarget(token) {
  const actor = token.actor;
  const conditions = actor.statuses.size > 0 ? Array.from(actor.statuses) : [];
  const rollData = actor?.getRollData();
  const target = {
    name: actor.name,
    img: actor.img,
    id: token.id,
    isOwner: actor.isOwner,
    system: actor.system,
    conditions: conditions,
    effects: actor.allApplicableEffects(),
    rollData: {
      target: {
        system: rollData
      }
    }
  };
  return target;
}

export function targetToToken(target) {
  return canvas.tokens.documentCollection.get(target.id);
}