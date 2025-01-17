import { isPointInPolygon } from "../helpers/utils.mjs";

export class DC20RpgToken extends Token {

  get isFlanked() {
    const flankingNeutral = game.settings.get("dc20rpg", "flankingNeutral");
    const coreDisposition = [this.document.disposition];
    if (flankingNeutral === "friendly" && coreDisposition[0] === 1) coreDisposition.push(0);
    if (flankingNeutral === "hostile" && coreDisposition[0] === -1) coreDisposition.push(0);

    const neighbours = this.neighbours;
    for (let [key, token] of neighbours) {
      // Prone/Incapacitated tokens cannot flank
      if (token.actor.hasAnyStatus(["incapacitated", "prone"])) neighbours.delete(key);
      if (coreDisposition.includes(token.document.disposition)) neighbours.delete(key);
    }
    if (neighbours.size <= 1) return false;

    for (const [id, neighbour] of neighbours) {
      // To check if token is flankig we need to see if at least one neighbour of
      // the core token is not also a neighbour of supposedly flanking token
      const coreNeighbours = new Map(neighbours);
      coreNeighbours.delete(id); // We want to skip ourself

      const tokenNeighbours = neighbour.neighbours;
      let mathingNeighbours = 0;
      for (let [key, token] of tokenNeighbours) {
        if (token.actor.hasAnyStatus(["incapacitated", "prone"])) continue; // Prone/Incapacitated tokens cannot help with flanking
        if (key === this.id) continue; // We want to skip core token
        if (coreDisposition.includes(token.document.disposition)) continue; // Tokens of the same disposition shouldn't flank themself - most likely allies
        if (coreNeighbours.has(key)) mathingNeighbours++;
      }
      if (mathingNeighbours !== coreNeighbours.size) {
        console.log(`${neighbour.name} flanks ${this.name}`);
        return true;
      }
    }
    return false;
  }

  get neighbours() {
    const neighbouringSpaces = this.getNeighbouringSpaces();
    const tokens = canvas.tokens.placeables;
    const neighbours = new Map();
    for (const token of tokens) {
      const tokenSpaces = token.getOccupiedGridSpacesMap();
      let isNeighbour = false;
      tokenSpaces.keys().forEach(key => {
        if(neighbouringSpaces.has(key)) isNeighbour = true;
      })
      if (isNeighbour) neighbours.set(token.id, token);
    }
    return neighbours;
  }

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

  async _draw(options) {
    await super._draw(options);

    // Add apDisplay bellow bars
    const bars = this.bars;
    bars.apDisplay = bars.addChild(new PIXI.Container());
    bars.apDisplay.width = this.getSize().width;
  }

  /** @override */
  drawBars() {
    super.drawBars()
    this._drawApDisplay();
  }

  async _drawApDisplay() {
    if ( !this.actor || (this.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE) ) return;
    const actionPoints = this.actor.system.resources.ap;
    if (!actionPoints) return;

    const max = actionPoints.max;
    const current = actionPoints.value;
    const full = await loadTexture('systems/dc20rpg/images/sheet/header/ap-full.svg');
    const empty = await loadTexture('systems/dc20rpg/images/sheet/header/ap-empty.svg');

    const {width, height} = this.getSize();
    const step = width / max;
    const shift = step/2;

    const tokenX = this.document.height;
    const gridX = canvas.grid.sizeX;
    const size = tokenX * (0.7 * gridX)/max;
    
    this.bars.apDisplay.removeChildren();
    for(let i = 0; i < max; i++) {
      if (i < current) this._addIcon(full, i, size, height, step, shift, max) 
      else this._addIcon(empty, i, size, height, step, shift, max) 
    }
  }

  _addIcon(texture, index, size, height, step, shift, max) {
    const bottomBarHeight = this.bars.bar1.height;

    let distanceFromTheMiddle = 0;
    if (max % 2 === 0) {
      const middleOver = Math.ceil(max/2);
      const middleUnder = Math.floor(max/2);
      if (index+1 < middleUnder) {
        distanceFromTheMiddle = Math.abs(middleUnder - index - 1);
      }
      else if (index+1 > middleOver) {
        distanceFromTheMiddle = Math.abs(middleOver - index);
      }
    }
    else {
      const middle = Math.ceil(max/2);
      distanceFromTheMiddle = Math.abs(middle - index - 1);
    }

    const icon = new PIXI.Sprite(texture);
    icon.width = size;
    icon.height = size;
    icon.x = (shift - (size/2)) + (step * index);
    icon.y = height - bottomBarHeight - size - (0.5 * distanceFromTheMiddle * size);
    this.bars.apDisplay.addChild(icon);
  }

  getNeighbouringSpaces() {
    const occupiedSpaces = this.getOccupiedGridSpacesMap();
    const adjacents = new Map();
    for (const space of occupiedSpaces.values()) {
      this.#adjacentSpacesFor(space).forEach(adjSpace => {
        const key = `i#${adjSpace.i}_j#${adjSpace.j}`; 
        if (!adjacents.has(key) && !occupiedSpaces.has(key)) {
          adjacents.set(key, adjSpace);
        }
      });
    }
    return adjacents;
  }

  #adjacentSpacesFor(space) {
    const grid = canvas.grid;
    if (grid.isSquare) return grid.getAdjacentOffsets(space);
    if (grid.isHexagonal) {
      if (grid.columns) {
        let d = 1;
        const spaceEven = (space.i % 2 === 0);
        if (grid.even) d = spaceEven ? 1 : -1;
        else d = spaceEven ? -1 : 1;
        return [
          {i: space.i, j: space.j + 1},
          {i: space.i, j: space.j - 1},
          {i: space.i + 1, j: space.j},
          {i: space.i - 1, j: space.j},
          {i: space.i + 1, j: space.j + d},
          {i: space.i - 1, j: space.j + d},
        ]
      }
      else {
        let d = 1;
        const spaceEven = (space.j % 2 === 0);
        if (grid.even) d = spaceEven ? 1 : -1;
        else d = spaceEven ? -1 : 1;
        return [
          {i: space.i + 1, j: space.j},
          {i: space.i - 1, j: space.j},
          {i: space.i, j: space.j + 1},
          {i: space.i, j: space.j - 1},
          {i: space.i + d, j: space.j + 1},
          {i: space.i + d, j: space.j - 1},
        ]
      }
    }
    return [];
  }

  getOccupiedGridSpacesMap() {
    return new Map(this.getOccupiedGridSpaces().map(occupied => [`i#${occupied[0]}_j#${occupied[1]}`, {i: occupied[0], j: occupied[1]}]));
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