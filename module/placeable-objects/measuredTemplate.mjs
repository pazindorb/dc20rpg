import { TokenSelector } from "../dialogs/token-selector.mjs";
import { DC20MeasuredTemplateDocument } from "../documents/measuredTemplate.mjs";
import { getActorFromIds, getTokenForActor } from "../helpers/actors/tokens.mjs";
import { getPointsOnLine, isPointInPolygon } from "../helpers/utils.mjs";

export default class DC20RpgMeasuredTemplate extends foundry.canvas.placeables.MeasuredTemplate {

  static getMovementCostFunction(token, options) {
    if (canvas.grid.isGridless) {
      return (from, to, distance, segment) => {
        if (options.ignoreDT) return 0;

        let finalCost = 0;
        const travelPoints = getPointsOnLine(from.j, from.i, to.j, to.i, canvas.grid.size);
        for (const point of travelPoints) {
          const templates = DC20RpgMeasuredTemplate.getAllTemplatesOnPosition(point.x, point.y);
          for (const template of templates) {
            if (DC20RpgMeasuredTemplate.isDifficultTerrainFor(template, token)) {
              finalCost += 1;
              break;
            }
          }
        }

        const distnaceLeft = distance - finalCost;
        if (distnaceLeft > 0.1) {
          const templates = DC20RpgMeasuredTemplate.getAllTemplatesOnPosition(to.j, to.i);
          for (const template of templates) {
            if (DC20RpgMeasuredTemplate.isDifficultTerrainFor(template, token)) {
              finalCost += distnaceLeft;
              break;
            }
          }
        }
        return finalCost;
      }
    }
    else {
      return (from, to, distance, segment) => {
        if (options.ignoreDT) return 0;
        const templates = DC20RpgMeasuredTemplate.getAllTemplatesOnCord(to.i, to.j);
        for (const template of templates) {
          if (DC20RpgMeasuredTemplate.isDifficultTerrainFor(template, token)) return 1;
        }
        return 0;
      };
    }
  }

  static isDifficultTerrainFor(template, token) {
    const difficult = template.document.flags?.dc20rpg?.difficult;
    if (!difficult) return false;

    let disposition = token.disposition;
    if (disposition === 0 && game.settings.get("dc20rpg", "neutralDispositionIdentity") === "ally") disposition = 1; // Decide what to do with neutral tokens

    switch (difficult) {
      case "all": return true;
      case "friendly": return disposition === 1;
      case "hostile": return disposition !== 1;
    }
    return false;
  }
  
  static getAllTemplatesOnCord(i, j) {
    const templates = new Set();
    canvas.templates.documentCollection.forEach(templateDoc => {
      const template = templateDoc.object;
      const cords = template._getGridHighlightCords();
      if (cords.find(cord => cord[0] === i && cord[1] === j)) templates.add(template);
    });
    return templates;
  }

  static getAllTemplatesOnPosition(x, y) {
    const templates = new Set();
    canvas.templates.documentCollection.forEach(templateDoc => {
      const template = templateDoc.object;
      if (template) {

        // Gridless
        if (canvas.grid.isGridless) {
          const shape = template._getGridHighlightShape();
          const startX = template.document.x;
          const startY = template.document.y;
          const pointX = x;
          const pointY = y;

          // Circle
          if (shape.type === 2) {
            const radius = shape.radius;
            const distanceSquared = (pointX - startX) ** 2 + (pointY - startY) ** 2;
            if (distanceSquared <= radius ** 2) templates.add(template);
          }

          // Ray
          if (shape.type === 0) {
            const shapePoints = shape.points;
            const polygon = [];
            for (let i = 0; i < shapePoints.length; i=i+2) {
              const x = shapePoints[i];
              const y = shapePoints[i+1];
              polygon.push({x: x, y: y});
            }
            if (isPointInPolygon(pointX, pointY, polygon)) templates.add(template);
          }
        }
        // Grid
        else {
          const highlightedSpaces = template.highlightedSpaces;
          highlightedSpaces.forEach(space => {
            if (space[0] === y && space[1] === x) {
              templates.add(template);
            }
          });
        }
      }
    })
    return templates;
  }

  static mapItemAreasToMeasuredTemplates(areas) {
    if (!areas) return {};

    const toSystemTemplate = (type) => {
      switch (type) {
        case "cone": case "arc":
          return CONST.MEASURED_TEMPLATE_TYPES.CONE;
        case "sphere": case "cylinder": case "aura":  case "radius":
          return CONST.MEASURED_TEMPLATE_TYPES.CIRCLE;
        case "line": case "wall": 
          return CONST.MEASURED_TEMPLATE_TYPES.RAY;
        case "cube":
          return CONST.MEASURED_TEMPLATE_TYPES.RECTANGLE; 
      }
    }

    const measurementTemplates = {};
    for (let [key, area] of Object.entries(areas)) {
      const type = area.area;
      const distance = area.distance;
      if (!type || !distance) continue;  // We need those values to be present for templates 

      const width = area.width;
      const angle = type === "arc" ? 180 : 53.13;

      if (type === "area") {
        measurementTemplates[key] = {
          type: type,
          distance: 0.5,
          width: 1,
          systemType: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE,
          label: _createLabelForTemplate(type, distance),
          numberOfFields: distance,
          difficult: area.difficult,
          hideHighlight: area.hideHighlight,
        }
      }
      else {
        measurementTemplates[key] = {
          type: type,
          distance: distance,
          angle: angle,
          width: width,
          systemType: toSystemTemplate(type),
          label: _createLabelForTemplate(type, distance, width),
          difficult: area.difficult,
          hideHighlight: area.hideHighlight,
          passiveAura: area.passiveAura,
          linkWithToggle: area.linkWithToggle
        }
      }
    }
    return measurementTemplates;
  }
  
  static async createMeasuredTemplates(template, refreshMethod, itemData) {
    if (!template) return [];

    const measuredTemplates = [];
    // Custom Area
    if (template.type === "area") {
      const label = template.label;
      let left = template.numberOfFields;
      template.label = label + ` <${left} Left>`;
      template.selected = true; 
      await refreshMethod();
  
      for(let i = 1; i <= template.numberOfFields; i++) {
        const mT = await DC20RpgMeasuredTemplate.pleacePreview(template.systemType, template, itemData);
        measuredTemplates.push(mT);
        left--;
        if (left) template.label = label + ` <${left} Left>`;
        else template.label = label;
        await refreshMethod();
      }
  
      template.selected = false; 
      await refreshMethod();
    }
    // Aura type
    else if (template.type === "aura") {
      let item = null;
      const actor = getActorFromIds(itemData.actorId, itemData.tokenId);
      if (actor) item = actor.items.get(itemData.itemId);
      if (item.system?.target?.type === "self" || template.passiveAura || (template.linkWithToggle && item.toggledOn)) {
        const token = getTokenForActor(actor);
        if (token) {
          await DC20RpgMeasuredTemplate.addAuraToToken(template.systemType, token, template, itemData);
        }
      }
      else {
        const selected = await TokenSelector.open(canvas.tokens.placeables, "Apply Aura to Tokens");
        for (const token of selected) {
          await DC20RpgMeasuredTemplate.addAuraToToken(template.systemType, token, template, itemData);
        }
      }
    }
    // Predefined type
    else {
      template.selected = true; 
      await refreshMethod();
      const mT = await DC20RpgMeasuredTemplate.pleacePreview(template.systemType, template, itemData);
      measuredTemplates.push(mT);
      template.selected = false; 
      await refreshMethod();
    }
    return measuredTemplates;
  }

  static changeTemplateSpaces(template, numericChange) {
    if (!template) return;

    // Custom Area
    if (template.type === "area") {
      if (template.numberOfFields + numericChange < 0) template.numberOfFields = 0;
      else template.numberOfFields += numericChange;
      template.label = _createLabelForTemplate(template.type, template.numberOfFields);
    }
    // Standard options
    else {
      if (template.distance + numericChange < 0) template.distance = 0;
      else template.distance += numericChange;
      template.label = _createLabelForTemplate(template.type, template.distance, template.width);
    }
  }

  static async pleacePreview(type, config={}, itemData) {
    const angle = config.angle || CONFIG.MeasuredTemplate.defaults.angle;
    let width = config.width || 1;
    let distance = config.distance || 1;

    // We want to replace rectangle with cube shapded ray as it suits better preview purposes
    if (type === "rect") {
      type = CONST.MEASURED_TEMPLATE_TYPES.RAY
      width = distance;
    }

    const templateData = {
      t: type,
      user: game.user.id,
      x: 0,
      y: 0,
      distance: distance,
      angle: angle,
      width: width,
      direction: 0,
      fillColor: game.user.color,
      flags: {
        dc20rpg: {
          difficult: config.difficult,
          itemData: itemData,
          effectAppliedTokens: [],
          hideHighlight: config.hideHighlight
        },
      }
    }

    const templateDocument = new MeasuredTemplateDocument(templateData, {parent: canvas.scene});
    const preview = new this(templateDocument);
    const initialLayer = canvas.activeLayer;
    preview.draw();
    preview.layer.activate();
    preview.layer.preview.addChild(preview);

    const SNAP = CONST.GRID_SNAPPING_MODES;
    const grid = canvas.grid;

    // Place preview and return created template
    return await new Promise((resolve) => {
      // Moving template preview
      canvas.stage.on("mousemove", (event) => {
        event.stopPropagation();
        const now = Date.now(); // Apply a 30ms throttle
        if ( now - preview.timeFromLastMove <= 30 ) return;

        let mode = grid.isHexagonal 
                        ? SNAP.CENTER | SNAP.VERTEX 
                        : SNAP.CENTER | SNAP.VERTEX | SNAP.CORNER | SNAP.SIDE_MIDPOINT;
        if (event.shiftKey || canvas.grid.type === CONST.GRID_TYPES.GRIDLESS) {
          mode = 0;
        }

        const point = event.data.getLocalPosition(preview.layer);
        const finalPosition = event.shiftKey 
          ? grid.getSnappedPoint(point, {mode: 0})
          : grid.getSnappedPoint(point, {mode: mode});
    
        // Update the template's position
        preview.document.updateSource(finalPosition);
        preview.refresh();
        preview.timeFromLastMove = now;
      });

      // Rotating template preview
      canvas.app.view.onwheel = (event) => {
        event.stopPropagation();
        const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        const snap = event.shiftKey ? delta : 5;
        const update = {direction: preview.document.direction + (snap * Math.sign(event.deltaY))};
        preview.document.updateSource(update);
        preview.refresh();
      }

      // Creating or canceling template creation
      canvas.stage.on("pointerup", async (event) => {
        event.stopPropagation();
        canvas.stage.off("mousemove");
        canvas.stage.off("pointerup");
        canvas.app.view.onwheel = null

        // Place template
        if (event.data.button === 0) {
          const templateData = preview.document.toObject();
          const shape = preview.shape;
          preview.destroy();

          const templateDocument = await DC20MeasuredTemplateDocument.create(templateData, {parent: canvas.scene});
          const template = templateDocument.object;
          template.shape = shape;
          await templateDocument.applyEffectsToTokensInTemplate();

          initialLayer.activate();
          resolve(template);
        }
        
        // Cancel template pleacement
        if (event.data.button === 2) {
          preview.destroy();
          initialLayer.activate();
          resolve(null);
        }
      });
    });
  }

  static async addAuraToToken(type, token, config={}, itemData) {
    const tokenWidth = token.document.width;
    const tokenSizeMod = tokenWidth > 1 ? tokenWidth/2 : 0;

    const templateData = {
      t: type,
      user: game.user.id,
      x: token.center.x,
      y: token.center.y,
      distance: config.distance + tokenSizeMod,
      direction: 0,
      fillColor: game.user.color,
      flags: {
        dc20rpg: {
          difficult: config.difficult,
          itemData: itemData,
          effectAppliedTokens: [],
          hideHighlight: config.hideHighlight
        },
      }
    }

    const templateDocument = await DC20MeasuredTemplateDocument.create(templateData, {parent: canvas.scene});
    await templateDocument.update({["flags.dc20rpg.linkedToken"]: token.id});
    const template = templateDocument.object;

    // Link Template with token
    const linkedTemplates = token.document.flags.dc20rpg?.linkedTemplates || [];
    linkedTemplates.push(templateDocument.id);
    await token.document.update({["flags.dc20rpg.linkedTemplates"]: linkedTemplates});

    await templateDocument.applyEffectsToTokensInTemplate();
    return template;
  }

  // TODO: Remove and replace with _getGridHighlightCords()
  get highlightedSpaces() {
    return this._getGridHighlightPositions().map(position => {
      const range = canvas.grid.getOffsetRange(position);
      // All those positions are 1x1 so startX === endX, we dont need both;
      return [range[1], range[0]];
    });
  }

  _getGridHighlightCords() {
    return this._getGridHighlightPositions().map(position => {
      const range = canvas.grid.getOffsetRange({x: position.x + (canvas.grid.sizeX/2), y: position.y + (canvas.grid.sizeY/2)}); 
      return [range[0], range[1]];
    });
  }
}

function _createLabelForTemplate(type, distance, width, unit) {
  const widthLabel = width && type === "line" ? ` x ${width}` : "";
  const unitLabel = unit ||  game.i18n.localize("dc20rpg.measurement.spaces");
  
  let label = game.i18n.localize(`dc20rpg.measurement.${type}`);
  label += ` [${distance}${widthLabel} ${unitLabel}]`;
  return label;
}