export function getForActorType(type, value) {
  switch (value) {
    case "icon": return _getIconForActor(type);
    case "tabs": return _getTabsForActor(type);
  }
}
function _getIconForActor(type) {
  switch(type) {
    case "character": return "fa-solid fa-user";
    case "npc": return "fa-solid fa-dragon";
    case "storage": return "fa-solid fa-boxes-stacked";
    case "companion": return "fa-solid fa-paw";
    default: return "fa-solid fa-suitcase";
  }
}
function _getTabsForActor(type) {
  let allowed = [];
  switch(type) {
    case "npc": case "companion":
      allowed = ["header", "core", "effects", "config", "description"];
      // if (type === "npc")       allowed.push("loot");
      if (type === "companion") allowed.push("traits");
      break;

    case "character": 
      allowed = ["pcHeader", "pcCore", "inventory", "features", "known", "effects", "pcConfig", "journal"];
      break;

    case "storage":
      allowed = ["storageHeader", "content"];
      break;
  }
  return allowed;
}

export function collectWarning(actor) {
  const warnings = [];

  const details = actor.system.details;
  const points = actor.system.skillPoints;

  // Missing Class
  if (!actor.class) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.UNIQUE_MISSING", {name: game.i18n.localize("TYPES.Item.class")}));
  }
  // Missing Subclass
  if (details.level >= 3 && !actor.items.get(details?.subclass?.id)) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.UNIQUE_MISSING", {name: game.i18n.localize("TYPES.Item.subclass")}));
  }
  // Missing Ancestry
  if (!actor.items.get(details?.ancestry?.id)) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.UNIQUE_MISSING", {name: game.i18n.localize("TYPES.Item.ancestry")}));
  }
  // Missing Background
  if (!actor.items.get(details?.background?.id)) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.UNIQUE_MISSING", {name: game.i18n.localize("TYPES.Item.background")}));
  }

  // Attribute Points
  if (actor.system.attributePoints.left < 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_OVER", {
      points: Math.abs(actor.system.attributePoints.left), 
      name: game.i18n.localize("DC20RPG.ATTRIBUTE")
    }));
  }
  if (actor.system.attributePoints.left > 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_UNDER", {
      points: actor.system.attributePoints.left,
      name: game.i18n.localize("DC20RPG.ATTRIBUTE")
    }));
  }

  // Save Points
  if (actor.system.savePoints.left < 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_OVER", {
      points: Math.abs(actor.system.savePoints.left), 
      name: game.i18n.localize("DC20RPG.SAVE")
    }));
  }
  if (actor.system.savePoints.left > 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_UNDER", {
      points: actor.system.savePoints.left,
      name: game.i18n.localize("DC20RPG.SAVE")
    }));
  }
  
  // Skill Points
  if (points.skill.left < 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_OVER", {
      points: Math.abs(points.skill.left), 
      name: game.i18n.localize("DC20RPG.SKILL")
    }));
  }
  if (points.skill.left > 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_UNDER", {
      points: points.skill.left,
      name: game.i18n.localize("DC20RPG.SKILL")
    }));
  }
  // Trade Points
  if (points.trade.left < 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_OVER", {
      points: Math.abs(points.trade.left), 
      name: game.i18n.localize("DC20RPG.TRADE")
    }));
  }
  if (points.trade.left > 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_UNDER", {
      points: points.trade.left,
      name: game.i18n.localize("DC20RPG.TRADE")
    }));
  }

  // Language Points
  if (points.language.left < 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_OVER", {
      points: Math.abs(points.language.left), 
      name: game.i18n.localize("DC20RPG.LANGUAGE")
    }));
  }
  if (points.language.left > 0) {
    warnings.push(game.i18n.localize("DC20RPG.WARN.POINTS_UNDER", {
      points: points.language.left,
      name: game.i18n.localize("DC20RPG.LANGUAGE")
    }));
  }

  return warnings.join("<br>")
}