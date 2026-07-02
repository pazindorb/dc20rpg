import { DC20RpgTokenDocument } from "../documents/token.mjs";

export class DC20TerrainData extends foundry.data.TerrainData {

  /** @override */
  static getMovementCostFunction(token, options) {
    return (from, to, distance, segment) => this.#diffcultTerrainResolver(from, to, distance, segment, token);
  }

  // In DC20 difficult terrain is always +1 and it does not stack
  static #diffcultTerrainResolver(from, to, distance, segment, token) {
    const actor = token.actor;
    if (!actor) return distance;

    // Difficult Terrain and Token Collision disabled
    if (game.settings.get("dc20rpg", "disableDifficultTerrain")) return distance;
    let multiplier = 1;
    
    // Difficult Terrrain 
    const isDifficult = segment.terrain?.difficulty > 1;
    if (isDifficult) {
      const ignoreDT = actor.system.globalModifier.ignore.difficultTerrain;
      if (!ignoreDT) {
        const dtFromRegions = this.#dtFromRegions(from, to, token);
        if (dtFromRegions) multiplier += 1;
      }
    }

    // Travel through Enemy Token
    if (this.#slowFromTokens(to, token)) multiplier += 1;

    return distance * multiplier;
  }

  static #dtFromRegions(from, to, token) {
    const pointFrom = this.#toPoint(from);
    const pointTo = this.#toPoint(to);
    const regions = canvas.regions.placeables.filter(region => this.#isPointInRegion(pointFrom, region) || this.#isPointInRegion(pointTo, region));
    if (regions.length === 0) return false;

    for (const region of regions) {
      const applyFor = region.document.flags?.dc20rpg?.applyDtFor;
      if (!applyFor || applyFor === "all") return true;
      else if (applyFor.includes(token.disposition)) return true;
    }

    return false;
  }

  static #slowFromTokens(to, traveler) {
    const enemyDisposition = DC20RpgTokenDocument.getEnemyTokenDispositionsFor(traveler.disposition);
    const pointTo = this.#toPoint(to);
    const token = canvas.tokens.placeables
                      .filter(token => enemyDisposition.includes(token?.document?.disposition))
                      .find(token =>  this.#isPointInToken(pointTo, token));
    return !!token;
  }

  static #toPoint(coords) {
    if ( coords.x !== undefined ) return coords;
    return canvas.grid.getCenterPoint(coords);
  }

  static #isPointInRegion(point, region) {
    return region.document.testPoint(point, 0.5);
  }

  static #isPointInToken(data, token) {
    const collisionTest = ({t: token}) => token.visible && token.renderable && token.interactive
      && token.hitArea?.contains(data.x - token.x, data.y - token.y);
    const target = Array.from(canvas.tokens.quadtree.getObjects(new PIXI.Rectangle(data.x, data.y, 0, 0), {collisionTest})).find(t => t.id === token.id)
    return !!target;
  }
} 
