import { isPointInPolygon } from "../helpers/utils.mjs";

export class DC20RpgToken extends Token {

  /** @override */
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  async _drawEffects() {
    this.effects.renderable = false;

    // Clear Effects Container
    this.effects.removeChildren().forEach(c => c.destroy());
    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
    this.effects.overlay = null;

    // Categorize effects
    const activeEffects = this.actor?.temporaryEffects || [];
    let hasOverlay = false;

    // Collect from active statuses 
    const statuses = this.actor?.statuses;
    if (statuses) {
      statuses.forEach(st => {
        const status = CONFIG.statusEffects.find(e => e.id === st.id)
        if (status) {
          status.tint = new Number(16777215);
          activeEffects.push(status);
        }
      })
    }

    // Flatten the same active effect images
    const flattenedImages = [];
    const uniqueImages = [];
    activeEffects.forEach(effect => {
      const flattened = {img: effect.img, tint: effect.tint};
      if (uniqueImages.indexOf(effect.img) === -1) {
        flattenedImages.push(flattened);
        uniqueImages.push(effect.img);
      }
    });

    // Draw effects
    const promises = [];
    for ( const effect of flattenedImages ) {
      if ( !effect.img ) continue;
      if ( effect.flags && effect.getFlag("core", "overlay") && !hasOverlay ) {
        promises.push(this._drawOverlay(effect.img, effect.tint));
        hasOverlay = true;
      }
      else promises.push(this._drawEffect(effect.img, effect.tint));
    }
    await Promise.allSettled(promises);

    this.effects.renderable = true;
    this.renderFlags.set({refreshEffects: true});
  }

  getOccupiedGridSpaces() {
    // Gridless - no spaces to occupy
    if (canvas.grid.isGridless) return [];

    // Square
    if (canvas.grid.isSquare) {
      const tokenWidth = this.document.width;   // Width in spaces
      const tokenHeight = this.document.height; // Height in spaces
      const range = canvas.grid.getOffsetRange(this);
      const startX = range[1];
      const startY = range[0];

      // We need to move the layout to the starting position of the token
      const occupiedSpaces = [];
      for (let i = 0; i < tokenWidth; i++) {
        for (let j = 0; j < tokenHeight; j++) {
          const x = startX + i;
          const y = startY + j;
          occupiedSpaces.push([x, y]);
        }
      }
      return occupiedSpaces;
    }
    // Hex
    else if (canvas.grid.isHexagonal) {
      // For Hex we want to collect more spaces and then check which
      // belong to token hitArea, we do that because hex tokens have
      // more irregular shapes
     
      const startCordX = this.document.x; // X cord of token
      const startCordY = this.document.y; // Y cord of token

      // We convert hit area to polygon so we will be able to check which spaces belong to it
      const points = this.hitArea.points;
      const polygon = [];
      const borderPoints = new Map();
      const rowOriented = canvas.grid.type === CONST.GRID_TYPES.HEXEVENR || canvas.grid.type === CONST.GRID_TYPES.HEXODDR;
      for (let i = 0; i < points.length; i=i+2) {
        const x = startCordX + points[i];
        const y = startCordY + points[i+1];
        polygon.push({x: x, y: y});

        // We also want to collect center points from nereby hexes
        const center = canvas.grid.getCenterPoint({x: x, y: y});
        this.#prepareBorderPoints(center, borderPoints, rowOriented);
      }
      const layout = this.#prepareHexLayout(borderPoints, rowOriented);

      // We check if center points belong to 
      const occupiedSpaces = [];
      for (let i = 0; i < layout.length; i++) {
        const centerX = layout[i].x;
        const centerY = layout[i].y;

        const topLeft = canvas.grid.getTopLeftPoint(layout[i])
        const [y, x] = canvas.grid.getOffsetRange(topLeft);
        if (isPointInPolygon(centerX, centerY, polygon)) {
          occupiedSpaces.push([x, y]);
        }
      }
      return occupiedSpaces;
    }
    // Unsupported grid type
    else {
      ui.notifications.error("Unsupported grid type");
      return [];
    }
  }

  #prepareBorderPoints(center, borderPoints, rowOriented) {
    const mainCord = rowOriented ? "x" : "y";
    const otherCord = rowOriented ? "y" : "x";

    const key = Math.floor(center[otherCord]); // Get rid of rounding issues
    const borderPoint = borderPoints.get(key);
    if (borderPoint) {
      const first = borderPoint.first > center[mainCord] ? center[mainCord] : borderPoint.first;
      const last = borderPoint.last < center[mainCord] ?  center[mainCord] : borderPoint.last;
      borderPoints.set(key, {
        first: first,
        last: last,
        otherPoint: center[otherCord]
      })
    }
    else {
      borderPoints.set(key, {
        first: center[mainCord],
        last: center[mainCord],
        otherPoint: center[otherCord]
      })
    }
  }

  #prepareHexLayout(borderPoints, rowOriented) {
    const sizeKey = rowOriented ? "sizeX" : "sizeY";
    const mainCord = rowOriented ? "x" : "y";
    const otherCord = rowOriented ? "y" : "x";

    const layout = [];
    const gridSize = canvas.grid[sizeKey];
    borderPoints.forEach(point => {
      const otherPoint = point.otherPoint;
      const first = point.first;
      const last = point.last;

      let nextCenter = first; // We start with first center point
      while(last - nextCenter > gridSize/4) {
        layout.push({[mainCord]: nextCenter, [otherCord]: otherPoint});
        nextCenter += gridSize;
      }
      layout.push({[mainCord]: last, [otherCord]: otherPoint});
    })
    return layout;
  }
}