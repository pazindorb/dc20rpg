export function getForItemType(type, value) {
  switch (value) {
    case "icon": return _getIconForItem(type);
    case "tabs": return _getTabsForItem(type);
  }
}

function _getIconForItem(type) {
  switch(type) {
    case "basicAction": return "fa-solid fa-dice-d6";
    case "weapon": return "fa-solid fa-sword";
    case "equipment": return "fa-solid fa-helmet-battle";
    case "consumable": return "fa-solid fa-flask-round-potion";
    case "container": return "fa-solid fa-sack";
    case "loot": return "fa-solid fa-coins";
    case "spellFocus": return "fa-solid fa-wand-magic-sparkles";
    case "feature": return "fa-solid fa-note-sticky";
    case "infusion": return "fa-solid fa-crystal-ball";
    case "maneuver": return "fa-solid fa-swords";
    case "spell": return "fa-solid fa-hand-holding-magic";
    case "class": case "subclass": case "background": case "ancestry":
      return "fa-solid fa-splotch";
    default: return "fa-solid fa-suitcase";
  }
}

function _getTabsForItem(type) {
  let allowed = [];
  switch(type) {
    case "weapon": case "equipment": case "spellFocus": case "consumable": 
    case "feature": case "maneuver": case "spell": case "infusion": case "basicAction":
      allowed = ["core", "config", "action", "usage", "area", "enhancements", "targetModifiers", "effects", "advanced"];
      break;

    case "container": 
      allowed = ["core", "contents"];
      break;
    
    case "loot":
      allowed = ["core"];
      break;

    case "class": case "subclass": case "background": case "ancestry":
      allowed = ["core", "csabConfig", "advancement"];
      break;
  }

  if (["weapon", "equipment", "spellFocus", "consumable"].includes(type)) {
    allowed.push("magic");
  }
  if (type === "class") allowed.push("classTable");
  if (type === "infusion") allowed.push("infusion");
  allowed.push("header");
  return allowed;
}