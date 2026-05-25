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

export async function removeResourceFromItem(item, key) {
  const enhUpdateData = {};
  if (item.system.enhancements) {
    Object.keys(item.system.enhancements)
            .forEach(enhKey=> enhUpdateData[`enhancements.${enhKey}.resources.custom.-=${key}`] = null); 
  }

  const updateData = {
    system: {
      [`costs.resources.custom.-=${key}`]: null,
      ...enhUpdateData
    }
  }
  await item.update(updateData);
}

export function rollTemplateSelect(selected, item) {
  const system = {};
  const saveRequest = {
    category: "save",
    saveKey: "phy",
    contestedKey: "",
    dcCalculation: "spell",
    dc: 0,
    addMasteryToDC: true,
  };
  const contestRequest = {
    category: "contest",
    saveKey: "phy",
    contestedKey: "",
    dcCalculation: "spell",
    dc: 0,
    addMasteryToDC: true,
  };

  // Set action type
  if (["dynamic", "attack"].includes(selected)) system.actionType = "attack";
  if (["check", "contest"].includes(selected)) system.actionType = "check";
  if (["save"].includes(selected)) system.actionType = "other";
  
  // Set save request
  if (["dynamic", "save"].includes(selected)) system.rollRequests = {rollRequestFromTemplate: saveRequest};
  if (["contest"].includes(selected)) system.rollRequests = {rollRequestFromTemplate: contestRequest};
  if (["check", "attack"].includes(selected)) system.rollRequests = {['-=rollRequestFromTemplate']: null};

  // Set check against DC or not
  if (selected === "contest") system.check = {againstDC: false};
  if (selected === "check") system.check = {againstDC: true};
  
  item.update({system: system});
}

export async function removeItemFromContainer(container, itemKey) {
  // We need to create that item on actor for the moment just to make sure all preDelete functions are called correctly
  if (container.actor) {
    const itemData = container.system.contents[itemKey];
    if (itemData) {
      const item = await DC20RpgItem.create(itemData, {parent: container.actor});
      item.delete();
    }
  }
  await container.update({[`system.contents.-=${itemKey}`]: null});
}