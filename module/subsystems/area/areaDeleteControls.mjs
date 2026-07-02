import { gmDelete } from "../../helpers/sockets.mjs";


class AreaDeleteControls {
  #altDown = false;
  #element = null;
  #frame = null;

  activate() {
    window.addEventListener("keydown", this.#onKeyDown);
    window.addEventListener("keyup", this.#onKeyUp);
    window.addEventListener("blur", this.#hide);

    Hooks.on("canvasPan", this.#refreshSoon);
    Hooks.on("activateTokenLayer", this.#refreshSoon);
    Hooks.on("deactivateTokenLayer", this.#hide);
    Hooks.on("createRegion", this.#refreshSoon);
    Hooks.on("updateRegion", this.#refreshSoon);
    Hooks.on("deleteRegion", this.#refreshSoon);
  }

  #onKeyDown = (event) => {
    if ((event.key !== "Alt") && !event.altKey) return;
    this.#altDown = true;
    this.#refreshSoon();
  };

  #onKeyUp = (event) => {
    if ((event.key !== "Alt") && event.altKey) return;
    this.#altDown = false;
    this.#hide();
  };

  #refreshSoon = () => {
    if (!this.#altDown) return;
    if (this.#frame) return;

    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      this.#refresh();
    });
  };

  #refresh() {
    if (!this.#shouldShow()) {
      this.#hide();
      return;
    }

    const regions = canvas.regions.placeables.filter(region => this.#isVisible(region));
    if (!regions.length) {
      this.#hide();
      return;
    }

    const rendered = new Set();
    for (const region of regions) {
      const center = this.#regionCenter(region);
      if (!center) continue;

      const point = this.#canvasToScreen(center);
      if (!point) continue;

      const button = this.#getButton(region);
      button.style.left = `${Math.round(point.x)}px`;
      button.style.top = `${Math.round(point.y)}px`;
      rendered.add(region.id);
    }

    if (!this.#element) return;

    for (const button of this.#element.querySelectorAll("[data-region-id]")) {
      if (!rendered.has(button.dataset.regionId)) button.remove();
    }
    if (!this.#element.children.length) this.#hide();
  }

  #shouldShow() {
    if (!canvas?.ready || !canvas.regions || !canvas.tokens) return false;
    return canvas.activeLayer === canvas.tokens || canvas.tokens.active;
  }

  #isVisible(region) {
    if (!region || region.destroyed) return false;
    if (region.visible === false || region.renderable === false) return false;
    if (region.document?.hidden) return false;
    return region.document?.testUserPermission(game.user, "OWNER");
  }

  #getButton(region) {
    this.#element ??= this.#createElement();

    let button = this.#element.querySelector(`[data-region-id="${region.id}"]`);
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.classList.add("dc20-area-delete-control");
    button.dataset.regionId = region.id;
    button.dataset.tooltip = `${region.document.name} - ${game.i18n.localize("HUD.DeleteRegion")}`;
    button.setAttribute("aria-label", button.dataset.tooltip);
    button.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    button.addEventListener("pointerdown", this.#stopEvent);
    button.addEventListener("click", this.#deleteRegion);
    this.#element.appendChild(button);
    return button;
  }

  #createElement() {
    const element = document.createElement("div");
    element.id = "dc20-area-delete-controls";
    document.body.appendChild(element);
    return element;
  }

  #stopEvent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  #deleteRegion = async (event) => {
    this.#stopEvent(event);

    const regionId = event.currentTarget.dataset.regionId;
    const region = canvas.regions.placeables.find(region => region.id === regionId);
    if (region?.document?.testUserPermission(game.user, "OWNER")) await gmDelete({}, region.document);
    this.#refreshSoon();
  };

  #hide = () => {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = null;
    this.#element?.remove();
    this.#element = null;
  };

  #regionCenter(region) {
    const bounds = region.bounds ?? region.document?.bounds;
    if (!bounds) return null;

    const x = Number(bounds.x ?? bounds.left);
    const y = Number(bounds.y ?? bounds.top);
    const width = Number(bounds.width ?? ((bounds.right ?? x) - x));
    const height = Number(bounds.height ?? ((bounds.bottom ?? y) - y));
    if (![x, y, width, height].every(Number.isFinite)) return null;

    return {x: x + (width / 2), y: y + (height / 2)};
  }

  #canvasToScreen(point) {
    const view = canvas.app?.view ?? canvas.app?.canvas;
    const rect = view?.getBoundingClientRect?.();
    const transform = canvas.stage?.worldTransform;
    if (!rect || !transform) return null;

    const canvasPoint = transform.apply(new PIXI.Point(point.x, point.y));
    return {
      x: rect.left + canvasPoint.x,
      y: rect.top + canvasPoint.y
    };
  }
}

export function registerAreaDeleteControls() {
  game.dc20rpg ??= {};
  game.dc20rpg.areaDeleteControls = new AreaDeleteControls();
  game.dc20rpg.areaDeleteControls.activate();
}
