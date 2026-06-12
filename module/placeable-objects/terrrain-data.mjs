export class DC20TerrainData extends foundry.data.TerrainData {

  /** @override */
  static getMovementCostFunction(token, options) {
    return (from, to, distance, segment) => this.#diffcultTerrainResolver(from, to, distance, segment, token);
  }

  // In DC20 difficult terrain is always +1 and it does not stack
  static #diffcultTerrainResolver(from, to, distance, segment, token) {
    const actor = token.actor;
    if (!actor) return distance;

    // Not Difficult Terrain
    const isDifficult = segment.terrain?.difficulty > 1;
    if (!isDifficult) return distance;

    // Ignore Difficult Terrain
    const ignoreDT = game.settings.get("dc20rpg", "disableDifficultTerrain") || actor.system.globalModifier.ignore.difficultTerrain;
    if (ignoreDT) return distance;

    // Compare with token disposition (sometimes it should only apply to enemy/ally)
    const pointFrom = this.#toPoint(from);
    const pointTo = this.#toPoint(to);
    const regions = canvas.regions.placeables.filter(region => this.#isPointInRegion(pointFrom, region) || this.#isPointInRegion(pointTo, region));
    if (regions.length === 0) return distance;

    let matchingDisposition = false;
    for (const region of regions) {
      const applyFor = region.document.flags?.dc20rpg?.applyDtFor;
      if (!applyFor || applyFor === "all") matchingDisposition = true;
      else if (applyFor.includes(token.disposition)) matchingDisposition = true;
    }
    if (matchingDisposition) return distance * 2;
    else return distance;
  }

  static #toPoint(coords) {
    if ( coords.x !== undefined ) return coords;
    return canvas.grid.getCenterPoint(coords);
  }

  static #isPointInRegion(point, region) {
    return region.document.testPoint(point, 0.5);
  }
} 
