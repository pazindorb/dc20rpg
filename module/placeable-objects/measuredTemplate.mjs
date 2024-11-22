export default class DC20RpgMeasuredTemplate extends MeasuredTemplate {

  static async pleacePreview(type, config={}) {
    const angle = config.angle || CONFIG.MeasuredTemplate.defaults.angle;
    let width = config.width || 1;
    let distance = config.distance || 1;

    // Distance for cicle means it radius not diameter, but in the system config we use diameter
    if (type === "circle") {
      distance = distance/2;
    }
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
      canvas.stage.on("pointerdown", async (event) => {
        event.stopPropagation();
        canvas.stage.off("mousemove");
        canvas.stage.off("pointerdown");
        canvas.app.view.onwheel = null

        // Place template
        if (event.data.button === 0) {
          const templateData = preview.document.toObject();
          const shape = preview.shape;
          preview.destroy();

          const templateDocument = await MeasuredTemplateDocument.create(templateData, {parent: canvas.scene});
          const template = templateDocument.object;
          template.shape = shape;

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
}

export function getSystemMesuredTemplateTypeFromDC20Areas(area) {
  switch (area) {
    case "cone": case "arc":
      return CONST.MEASURED_TEMPLATE_TYPES.CONE;
    case "sphere": case "cylinder": case "aura":
      return CONST.MEASURED_TEMPLATE_TYPES.CIRCLE;
    case "line": case "wall": 
      return CONST.MEASURED_TEMPLATE_TYPES.RAY;
    case "cube":
      return CONST.MEASURED_TEMPLATE_TYPES.RECTANGLE; 
  }
}