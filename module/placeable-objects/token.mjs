import { TokenSelector } from "../dialogs/token-selector.mjs";
import { createItemOnActor } from "../helpers/actors/itemsOnActor.mjs";
import { deleteToken, getGridlessTokenPoints, getRangeAreaAroundGridlessToken } from "../helpers/actors/tokens.mjs";
import { getMesuredTemplateEffects } from "../helpers/effects.mjs";
import { getTokensForUser } from "../helpers/users.mjs";
import { isPointInPolygon, isPointInSquare } from "../helpers/utils.mjs";
import DC20RpgMeasuredTemplate from "./measuredTemplate.mjs";

export class DC20RpgToken extends foundry.canvas.placeables.Token {

  static tokenCostFunction(document, options) {
    return (cost) => {
      const slowed = document.actor?.slowed || 0;
      return cost + slowed;
    }
  }

  static movementActions() {
    return {
      ground: {
        label: "TOKEN.MOVEMENT.ACTIONS.walk.label",
        icon: "fa-solid fa-person-walking",
        order: 0,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      glide: {
        label: "TOKEN.MOVEMENT.ACTIONS.glid.label",
        icon: "fa-solid fa-angel",
        order: 1,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      flying: {
        label: "TOKEN.MOVEMENT.ACTIONS.fly.label",
        icon: "fa-solid fa-person-fairy",
        order: 1,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      swimming: {
        label: "TOKEN.MOVEMENT.ACTIONS.swim.label",
        icon: "fa-solid fa-person-swimming",
        order: 2,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      burrow: {
        label: "TOKEN.MOVEMENT.ACTIONS.burrow.label",
        icon: "fa-solid fa-person-digging",
        order: 3,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      climbing: {
        label: "TOKEN.MOVEMENT.ACTIONS.climb.label",
        icon: "fa-solid fa-person-through-window",
        order: 4,
        teleport: false,
        measure: true,
        walls: "move",
        visualize: true,
        deriveTerrainDifficulty: null,
        getCostFunction: DC20RpgToken.tokenCostFunction
      },
      displace: {
        label: "TOKEN.MOVEMENT.ACTIONS.displace.label",
        icon: "fa-solid fa-transporter-1",
        order: 8,
        teleport: true,
        measure: false,
        walls: null,
        visualize: false,
        getAnimationOptions: () => ({duration: 0}),
        canSelect: () => false,
        deriveTerrainDifficulty: () => 1,
        getCostFunction: () => () => 0
      }
    }
  }

  get isFlanked() {
    if (this.actor.system.globalModifier.ignore.flanking) return;
    if (!game.settings.get("dc20rpg", "enablePositionCheck")) return;
    const neutralDispositionIdentity = game.settings.get("dc20rpg", "neutralDispositionIdentity");
    const coreDisposition = [this.document.disposition];
    if (neutralDispositionIdentity === "friendly" && coreDisposition[0] === 1) coreDisposition.push(0);
    if (neutralDispositionIdentity === "hostile" && coreDisposition[0] === -1) coreDisposition.push(0);

    const neighbours = this.neighbours;
    for (let [key, token] of neighbours) {
      // Prone/Incapacitated tokens cannot flank
      if (token.actor.hasAnyStatus(["incapacitated", "prone", "dead"])) neighbours.delete(key);
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
        if (token.actor.hasAnyStatus(["incapacitated", "prone", "dead"])) continue; // Prone/Incapacitated tokens cannot help with flanking
        if (key === this.id) continue; // We want to skip core token
        if (coreDisposition.includes(token.document.disposition)) continue; // Tokens of the same disposition shouldn't flank themself - most likely allies
        if (coreNeighbours.has(key)) mathingNeighbours++;
      }
      if (mathingNeighbours !== coreNeighbours.size) {
        return true;
      }
    }
    return false;
  }

  get enemyNeighbours() {
    const neutralDispositionIdentity = game.settings.get("dc20rpg", "neutralDispositionIdentity");
    const coreDisposition = [this.document.disposition];
    if (neutralDispositionIdentity === "friendly" && coreDisposition[0] === 1) coreDisposition.push(0);
    if (neutralDispositionIdentity === "hostile" && coreDisposition[0] === -1) coreDisposition.push(0);

    const neighbours = this.neighbours;
    for (let [key, token] of neighbours) {
      if (coreDisposition.includes(token.document.disposition)) neighbours.delete(key);
    }
    return neighbours;
  }

  get neighbours() {
    const tokens = canvas.tokens.placeables;
    const neighbours = new Map();
    if (canvas.grid.isGridless) {
      const rangeArea = getRangeAreaAroundGridlessToken(this, 0.5);
      for (const token of tokens) {
        const pointsToContain = getGridlessTokenPoints(token);
        let isNeighbour = false;
        for (const point of pointsToContain) {
          if (isPointInSquare(point.x, point.y, rangeArea)) isNeighbour = true;
        }
        if (isNeighbour) neighbours.set(token.id, token);
      }
    }
    else {
      const neighbouringSpaces = this.getNeighbouringSpaces();
      for (const token of tokens) {
        const tokenSpaces = token.getOccupiedGridSpacesMap();
        let isNeighbour = false;
        tokenSpaces.keys().forEach(key => {
          if(neighbouringSpaces.has(key)) isNeighbour = true;
        })
        if (isNeighbour) neighbours.set(token.id, token);
      }
    }
    return neighbours;
  }

  get adjustedHitArea() {
    const hitArea = this.hitArea;
    let points = [];
    // Hex grid
    if (hitArea.type === 0) points = hitArea.points;
    // Square grid
    if (hitArea.type === 1) {
      points = [
        0, 0,
        hitArea.width, 0,
        0, hitArea.height,
        hitArea.width, hitArea.height
      ]
    }

    const area = [];
    for(let i = 0; i < points.length; i += 2) {
      const p = {
        x: this.x + points[i],
        y: this.y + points[i+1]
      }
      area.push(p)
    }
    return area;
  }

  async _onClickLeft2(event) {
    if (this.document.itemToken) {
      const tokens = getTokensForUser();
      const selected = await TokenSelector.open(tokens, "Select Actor to pick up");
      if (selected.length === 0) return;

      for (const token of selected) {
        const actor = token?.actor;
        if (actor) await createItemOnActor(actor, this.document.flags.dc20rpg.itemData);
      }
      await deleteToken(this.id);
    }
    else await super._onClickLeft2(event);
  }

  /** @override */
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  _canView(user, event) {
    if ( this.layer._draggedToken ) return false;
    if ( !this.layer.active || this.isPreview ) return false;
    if ( canvas.controls.ruler.active || (CONFIG.Canvas.rulerClass.canMeasure && (event?.type === "pointerdown")) ) return false;
    //====== INJECTED ====== 
    if ( !this.actor ) {
      if (this.document.itemToken) return true;
      else ui.notifications.warn("TOKEN.WarningNoActor", {localize: true});
    }
    //====== INJECTED ====== 
    return this.actor?.testUserPermission(user, "LIMITED");
  }


  /** @override */
  //NEW UPDATE CHECK: We need to make sure it works fine with future foundry updates
  async _drawEffects() {
    this.effects.renderable = false;

    // Clear Effects Container
    this.effects.removeChildren().forEach(c => c.destroy());
    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
    this.effects.bg.zIndex = -1;
    this.effects.overlay = null;

    // Categorize effects
    const activeEffects = this.actor?.temporaryEffects || [];
    const overlayEffect = activeEffects.findLast(e => e.img && e.getFlag("core", "overlay"));

    // Flatten the same active effect images
    const flattenedImages = [];
    const uniqueImages = [];
    activeEffects.forEach(effect => {
      if (uniqueImages.indexOf(effect.img) === -1) {
        flattenedImages.push(effect);
        uniqueImages.push(effect.img);
      }
    });

    // Draw effects
    const promises = [];
    for (let i = 0; i < flattenedImages.length; i++) {
      const effect = flattenedImages[i];
    // for ( const [i, effect] of activeEffects.entries() ) {
      if ( !effect.img ) continue;
      const promise = effect === overlayEffect
        ? this._drawOverlay(effect.img, effect.tint)
        : this._drawEffect(effect.img, effect.tint);
      promises.push(promise.then(e => {
        if ( e ) e.zIndex = i;
      }));
    }
    await Promise.allSettled(promises);

    this.effects.sortChildren();
    this.effects.renderable = true;
    this.renderFlags.set({refreshEffects: true});
  }

  async _draw(options) {
    await super._draw(options);

    // Add apDisplay bellow bars
    const bars = this.bars;
    bars.apDisplay = bars.addChild(new PIXI.Container());
    bars.apDisplay.width = this.document.getSize().width;
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
    const full = await foundry.canvas.loadTexture('systems/dc20rpg/images/sheet/header/ap-full.svg');
    const empty = await foundry.canvas.loadTexture('systems/dc20rpg/images/sheet/header/ap-empty.svg');

    const {width, height} = this.document.getSize();
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

  isTokenInRange(tokenToCheck, range) {
    if (canvas.grid.isGridless) return this._isTokenInRangeGridless(tokenToCheck, range);
    return this._isTokenInRangeGrid(tokenToCheck, range);
  }

  _isTokenInRangeGridless(tokenToCheck, range) {
    const rangeArea = getRangeAreaAroundGridlessToken(this, range);
    const pointsToContain = getGridlessTokenPoints(tokenToCheck);
    for (const point of pointsToContain) {
      if (isPointInSquare(point.x, point.y, rangeArea)) return true;
    }
    return false;
  }

  _isTokenInRangeGrid(tokenToCheck, range) {
    const fromArea = this.adjustedHitArea;
    const toArea = tokenToCheck.adjustedHitArea;

    let shortestDistance = 999;
    for (let from of fromArea) {
      for (let to of toArea) {
        const distance = Math.round(canvas.grid.measurePath([from, to]).distance); 
        if (shortestDistance > distance) shortestDistance = distance;
      }
    }
    return shortestDistance < range;
  }

  /** @override */
  _getMovementCostFunction(options={}) {
    if (!this.document.actor) return 1;
    options.ignoreDT = game.settings.get("dc20rpg", "disableDifficultTerrain") || this.document.actor.system.globalModifier.ignore.difficultTerrain;
    const calculateTerrainCost = CONFIG.Token.movement.TerrainData.getMovementCostFunction(this.document, options);
    const calculateTemplateCost = DC20RpgMeasuredTemplate.getMovementCostFunction(this.document, options);

    const actionCostFunctions = {};
    return (from, to, distance, segment) => {
      const terrainCost = calculateTerrainCost(from, to, distance, segment);
      const templateCost = calculateTemplateCost(from, to, distance, segment);
      const finalCost = terrainCost + templateCost;

      const calculateActionCost = actionCostFunctions[segment.action]
        ??= segment.actionConfig.getCostFunction(this.document, options);
      return calculateActionCost(finalCost, from, to, distance, segment);
    };
  }

  /** @override */
  _onCreate(data, options, userId) {
    if (userId === game.user.id && this.actor) {
      this._passiveAuraCheck();
    }
    super._onCreate(data, options, userId);
  }

  _passiveAuraCheck() {
    for (const item of this.actor.items) {
      const templates = DC20RpgMeasuredTemplate.mapItemAreasToMeasuredTemplates(item.system?.target?.areas);
      for (const template of Object.values(templates)) {
        if (template.passiveAura || (template.linkWithToggle && item.toggledOn)) {
          const applyEffects = getMesuredTemplateEffects(item);
          const itemData = {
            itemId: item.id, 
            actorId: this.actor.id, 
            tokenId: this.id, 
            applyEffects: applyEffects, 
            itemImg: item.img, 
            itemName: item.name
          };
          DC20RpgMeasuredTemplate.createMeasuredTemplates(template, () => {}, itemData);
        }
      }
    }
  }
}