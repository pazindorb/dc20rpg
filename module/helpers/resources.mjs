export function getResourceDisplayData(key, amount, item, actor) {
  if (actor) {
    const resource = actor.resources[key];
    if (resource.isCustom) return _customResource(resource, amount);
    else return _basicResource(key, amount);
  }
  else if (item) {
    const resources = {...item.system.costs.resources};
    if (resources.custom[key] != null) return _customResource(resources.custom[key], amount);
    else if (resources[key] != null) return _basicResource(key, amount);
  }
  return "";
}

function _customResource(resource, amount) {
  return {
    img: resource.img,
    label: resource.label,
    amount: amount,
    short: resource.label,
    custom: true
  }
}

function _basicResource(key, amount) {
  return {
    icon: _icon(key),
    label: game.i18n.localize(`dc20rpg.resources.${key}`),
    amount: amount,
    short: _short(key),
    custom: false
  }
}

export function chargeDisplayData(self, amount, itemName) {
  const icon = self ? _icon("charge-self") : _icon("charge-other");
  return {
    self: self,
    icon: icon,
    amount: amount,
    itemName: itemName
  };
}

function _short(key) {
  switch(key) {
    case "ap": return "AP";
    case "stamina": return "SP";
    case "mana": return "MP";
    case "grit": return "GP";
    case "restPoints": return "RP";
    case "health": return "HP";
  }
}

function _icon(key) {
  switch(key) {
    case "ap": return "ap fa-dice-d6 cost-icon";
    case "stamina": return "sp fa-hand-fist cost-icon";
    case "mana": return "mp fa-star cost-icon";
    case "grit": return "grit fa-clover cost-icon";
    case "restPoints": return "restPoints fa-campground cost-icon";
    case "health": return "hp fa-heart cost-icon";
    case "charge-self": return "fa-bolt cost-icon";
    case "charge-other": return "fa-right-from-bracket cost-icon";
  }
}

export function extractResourceCost(value, multiplier=1, altCost=0) {
  if (value == null) return null;

  if (typeof value === "string") {
    if (value.includes("/")) {
      const alternatives = value.split("/");
      if (alternatives[altCost]) value = alternatives[altCost];
      else value = alternatives[0]
    }

    if (value.includes("!")) multiplier = 1;
    value = parseInt(value);
    if (isNaN(value)) return null;
  }

  return value * multiplier;
}