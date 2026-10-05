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

    case "characher": 
      allowed = ["pcHeader", "pcCore", "inventory", "features", "spells", "effects", "pcConfig", "journal"];
      break;

    case "storage":
      allowed = ["storageHeader", "content"];
      break;
  }
  return allowed;
}