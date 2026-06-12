import { TokenSelector } from "../dialogs/token-selector.mjs";
import DC20RpgActiveEffect from "../documents/activeEffect.mjs";
import { DC20RpgItem } from "../documents/item.mjs";
import { DC20RpgTokenDocument } from "../documents/token.mjs";
import { getTokensForUser } from "../helpers/users.mjs";
import { getTokensInsideRegion } from "../helpers/utils.mjs";
import { Area } from "../subsystems/area/area.mjs";

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

  async getTokensInRange(range=1) {
    const scaner = new Area();
    scaner.distance = range;
    scaner.type = "aura";
    scaner.hideHighlight = true;
    scaner.blockByWalls = false;
    const region = await scaner.place({token: this, targetMode: true});
    const tokens = getTokensInsideRegion(region);
    region.delete();
    return tokens.map(token => token.object);
  }

  async isTokenInRange(tokenToCheck, range) {
    const tokens = await this.getTokensInRange(range);
    return !!tokens.find(token => token.id === tokenToCheck.id);
  }

  async isTokenFlanked(byToken) {
    const enemyDispositions = DC20RpgTokenDocument.getEnemyTokenDispositionsFor(this.document.disposition);
    const tokens = (await this.getTokensInRange(1))
                  .filter(token => enemyDispositions.includes(token.document.disposition))
                  .filter(token => !token.actor.hasAnyStatus(["incapacitated", "dead", "prone"]))
    if (tokens.length < 2) return false;

    // If specific token provided
    if (byToken) {
      if (!tokens.find(token => token.id === byToken.id)) return false;
      for (const token of tokens) {
        const isNeighbour = await byToken.isTokenInRange(token, 1);
        if (!isNeighbour) return true;
      }
      return false;
    }

    // If any flankers needed
    for (let i = 0; i < tokens.length - 1; i++) {
      const tokenA = tokens[i];
      for (let j = i + 1; j < tokens.length; j++) {
        const tokenB = tokens[j];
        const isNeighbour = await tokenA.isTokenInRange(tokenB, 1);
        if (!isNeighbour) return true;
      }
    }
    return false;
  }

  async _onClickLeft2(event) {
    if (this.document.itemToken) {
      const tokens = getTokensForUser();
      const selected = await TokenSelector.open(tokens, "Select Actor to pick up");
      if (selected.length === 0) return;

      for (const token of selected) {
        const actor = token?.actor;
        if (actor) {
          const itemData = this.document.flags.dc20rpg.itemData;
          if (itemData.system.properties?.cumbersome?.active) {
            if (!actor.resources.ap.checkAndSpend(1)) return;
          }
          await DC20RpgItem.gmCreate(itemData, {parent: actor});
        }
      }
      await this.gmDelete();
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

  //=================================
  //=        DRAWING METHODS        =
  //=================================
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
    //====== MODIFIED ======
    const SHOW_ICON = CONST.ACTIVE_EFFECT_SHOW_ICON;
    const activeEffects = this.actor?.allEffects
            .filter(effect => !effect.disabled)
            .filter(effect => (effect.showIcon === SHOW_ICON.ALWAYS) || ((effect.showIcon === SHOW_ICON.CONDITIONAL) && effect.isTemporary)) ?? [];
    const overlayEffect = activeEffects.findLast(e => e.flags.core?.overlay);
    //====== MODIFIED ======

    //====== INJECTED ====== 
    // Flatten the same active effect images
    const flattenedImages = new Map();
    activeEffects.forEach(effect => {
      if (flattenedImages.has(effect.img)) {
        const eff = flattenedImages.get(effect.img);
        eff.numberOfImages += 1;
        flattenedImages.set(effect.img, eff);
      }
      else {
        effect.numberOfImages = 1;
        flattenedImages.set(effect.img, effect);
      }
    });
    //====== INJECTED ====== 

    // Draw effects
    const promises = [];
    let index = 0;
    // for ( const [i, effect] of activeEffects.entries() ) { //NOTE: Replaced this line with the one bellow
    for (const effect of flattenedImages.values()) {
      if ( !effect.img ) continue;
      const promise = effect === overlayEffect
        ? this._drawOverlay(effect.img, effect.tint)
        : this._drawEffectStack(effect);
      promises.push(promise.then(e => {
        if ( e ) e.zIndex = index++;
      }));
    }
    await Promise.allSettled(promises);

    this.effects.sortChildren();
    this.effects.renderable = true;
    this.renderFlags.set({refreshEffects: true});
  }

  async _drawEffectStack(effect) {
    const e = await this._drawEffect(effect.img, effect.tint);
    if ( !e || (effect.numberOfImages <= 1) ) return e;

    const width = e.texture?.width ?? e.width;
    const height = e.texture?.height ?? e.height;
    const textureSize = Math.min(width, height);
    const badge = e.addChild(new PIXI.Container());
    badge.position.set(width / 2, height / 2);

    badge.addChild(new PIXI.Graphics()
      .beginFill(0x000000, 0.65)
      .lineStyle(Math.max(2, textureSize * 0.04), 0xffffff, 0.9)
      .endFill());

    const label = badge.addChild(new PIXI.Text(String(effect.numberOfImages), {
      fontFamily: CONFIG.canvasTextStyle.fontFamily,
      fontSize: Math.max(24, textureSize * 0.75),
      fontWeight: "bold",
      fill: 0xcc0a0a,
      stroke: 0x000000,
      strokeThickness: Math.max(2, textureSize * 0.04)
    }));
    label.anchor.set(0.5);
    return e;
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

  /** @override */
  _onCreate(data, options, userId) {
    if (userId === game.user.id && this.actor) {
      this.#passiveAreaCheck();
    }
    super._onCreate(data, options, userId);
  }

  //=================================
  //=         TOKEN REGIONS         =
  //=================================
  async toggleableAreaCheck(item) {
      if (!item.system.areas) return;
      const areas = Object.values(item.system.areas).filter(area => this.#isToggled(area, true));
      if (areas.length === 0) return;

      const [areaData, effects] = this.#prepareAreaDataAndCollectEffects(item);
      const area = Area.enrich(areas[0], {areaData: areaData, effects: effects, actor: this.actor});
      if (area) await area.place({token: this, flags: {toggledBy: item.id}});
  }

  async #passiveAreaCheck() {
    for (const item of this.actor.items) {
      if (!item.system.areas) continue;
      const areas = Object.values(item.system.areas).filter(area => this.#isPassiveArea(area)|| this.#isToggled(area, item.toggledOn));
      if (areas.length === 0) continue;

      const [areaData, effects] = this.#prepareAreaDataAndCollectEffects(item);
      const area = Area.enrich(areas[0], {areaData: areaData, effects: effects, actor: this.actor});
      if (!area) continue;

      const options = {token: this};
      if (this.#isToggled(area, item.toggledOn)) {
        options.flags = {toggledBy: item.id};
      }
      await area.place(options);
    }
  }

  #isPassiveArea(area) {
    return area.alwaysActive && area.selfOnly && area.attachToToken;
  }

  #isToggled(area, toggledOn) {
    return toggledOn && area.linkWithToggle && area.selfOnly && area.attachToToken;
  }

  #prepareAreaDataAndCollectEffects(item) {
    const areaData = {
      actorId: this.actor.id, 
      actorUuid: this.actor.uuid,
      tokenId: this.id,
      itemId: item.id, 
      itemImg: item.img,
      itemName: item.name
    };
    const effects = item.effects
                      .filter(effect => effect.system.applyToTemplate)
                      .map(effect => {
                        const effectData = effect.toObject();
                        DC20RpgActiveEffect.enhanceEffectData(effectData, {actor: this.actor});
                        effectData.flags.dc20rpg.templateCallTime = Date.now();
                        return effectData;
                      });
    return [areaData, effects]
  }

  //======================================
  //=           CRUD OPERATIONS          =
  //======================================
  async gmUpdate(data={}, operation={}) {
    return this.document.gmUpdate(data, operation);
  }

  async gmDelete(operation={}) {
    return this.document.gmDelete(operation);
  }
}