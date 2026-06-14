import { getLabelFromKey } from "../../helpers/utils.mjs";

export function itemDetailsToHtml(item) {
  if (!item) return "";
  if (!item.identified) return "";

  const tier1 = [];
  const tier2 = [];
  const tier3 = [];
  
  _merge(tier1, _action(item));
  if (["attack", "check", "other"].includes(item.system.actionType)) {
    _merge(tier1, _rollRequest(item));
    _merge(tier1, _formulas(item));
  }
  _merge(tier2, _magicPower(item));
  _merge(tier2, _duration(item));
  _merge(tier2, _castTime(item));
  _merge(tier2, _range(item));
  _merge(tier2, _target(item));
  _merge(tier2, _area(item));
  _merge(tier3, _weaponStyle(item));
  _merge(tier3, _properties(item));
  if (item.type === "spell") {
    _merge(tier3, _spellDetails(item));
  }
  if (item.type === "infusion") {
    _merge(tier3, _infusionDetails(item));
  }

  let firstChild = " style='margin-top:0px'";
  let content = "";
  if (tier1.length > 0) {
    content += `<div class="info-box-wrapper"${firstChild}>${tier1.join("\n")}</div>`;
    firstChild = "";
  }
  if (tier2.length > 0) {
    content += `<div class="info-box-wrapper"${firstChild}>${tier2.join("\n")}</div>`;
    firstChild = "";
  }
  if (tier3.length > 0) {
    content += `<div class="info-box-wrapper"${firstChild}>${tier3.join("\n")}</div>`;
  }
  return content;
}

function _merge(array1, array2) {
  array2.forEach(elem => array1.push(elem));
}

function _infoBox(text, color="", tier="", tooltipData={cssClass: "", data: ""}) {
  return `<div class="info-box ${color} ${tier} ${tooltipData.cssClass}" ${tooltipData.data}>${text}</div>`
}

function _action(item) {
  const action = [];
  switch (item.system.actionType) {
    case "attack":
      const attack = item.system.attack;
      action.push(_infoBox(`${getLabelFromKey(attack.checkType + attack.rangeType, CONFIG.DC20RPG.DROPDOWN_DATA.checkRangeType)}`, "purple", "tier1"));
      action.push(_infoBox(`Targets ${attack.targetDefence === "area" ? "AD" : "PD"}`, "purple", "tier1"));
      break;

    case "check":
      const check = item.system.check;
      const checkDC = (check.againstDC && check.checkDC) ? `DC ${check.checkDC} ` : "";
      action.push(_infoBox(`${checkDC} ${getLabelFromKey(check.checkKey, CONFIG.DC20RPG.ROLL_KEYS.allChecks)}`, "purple", "tier1"));
      break;

    case "help":
      const help = item.system.help;
      let label = "Help";
      if (help.duration) label += ` (Duration: ${getLabelFromKey(help.duration, CONFIG.DC20RPG.DROPDOWN_DATA.helpDiceDuration)})`;
      if (help.subtract) label += ` [Subtracted]`;
      action.push(_infoBox(label, "purple", "tier1"))
  }
  return action;
}

function _rollRequest(item) {
  const rollRequest = [];
  if (item.system.rollRequests) {
    for (const request of Object.values(item.system.rollRequests)) {
      if (request?.category === "save") {
        rollRequest.push(_infoBox(`DC ${request.dc} ${getLabelFromKey(request.saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes)}`, "blue", "tier1"));
      }
      if (request?.category === "contest") {
        rollRequest.push(_infoBox(`Contested by ${getLabelFromKey(request.contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests)}`, "blue", "tier1"));
      }
    }
  }
  return rollRequest;
}

function _formulas(item) {
  const formulas = [];
  if (item.system.formulas) {
    for (const formula of Object.values(item.system.formulas)) {
      if (!formula.formula) continue;
      if (formula.category === "damage") {
        formulas.push(_infoBox(`${formula.formula} ${getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes)}`, "red", "tier1"));
      }
      if (formula.category === "healing") {
        formulas.push(_infoBox(`${formula.formula} ${getLabelFromKey(formula.type, CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes)}`, "green", "tier1"));
      }
      if (formula.category === "other") {
        formulas.push(_infoBox(`${formula.formula} ${formula.label}`, "gold", "tier1"));
      }
    }
  }
  return formulas;
}

function _range(item) {
  const range = item.system?.range;
  const content = [];

  if (range) {
    const melee = range.melee;
    const normal = range.normal;
    const max = range.max;
    const unit = range.unit ? range.unit : "Spaces";

    if (normal) {
      let label = normal;
      if (max) label += `/${max}`;
      content.push(_infoBox(`${label} ${unit} Range`, "", "tier2"));
    }
    if (melee && melee > 1) {
      content.push(_infoBox(`${melee} ${unit} Melee Range`, "", "tier2"));
    }
  }
  return content;
}

function _target(item) {
  const content = [];
  const target =  item.system.target;
  const type = target?.type;
  if (type) {
    let label = getLabelFromKey(type, CONFIG.DC20RPG.DROPDOWN_DATA.invidualTargets);
    const count = target?.count;
    if (count) label = count + " " + label;
    content.push(_infoBox(label, "", "tier2"));
  }
  return content;
}
  
function _area(item) {
  const areas =  item.system?.areas;
  const content = [];
  if (!areas) return content;

  Object.values(areas).forEach(area => {
    const areaType = area.type;
    const areaUnit = area.unit;
    const distance = area.distance;
    const width = area.width;
  
    if (areaType) {
      let size = "";
      let unit = "";
      if (distance) {
        size = areaType === "line" ? `${distance}/${width}` : `${distance}`;
        unit = areaUnit ? ` ${areaUnit} ` : " Spaces ";
      }
      content.push(_infoBox(`${size}${unit}${getLabelFromKey(areaType, CONFIG.DC20RPG.DROPDOWN_DATA.areaTypes)}`, "blue", "tier2"));
    }
  });
  return content;
}

function _magicPower(item) {
  const content = [];
  if (item.system.magicPower != null) {
    content.push(_infoBox(`${game.i18n.localize("dc20rpg.item.sheet.infusions.power")}: ${item.system.magicPower}`, "gold", "tier2"));
  }
  return content;
}

function _duration(item) {
  const content = [];
  const duration =  item.system?.duration;

  if (duration) {
    const type = duration.type;
    const value = duration.value;
    const timeUnit = duration.timeUnit;

    if (type) {
      let label = getLabelFromKey(type, CONFIG.DC20RPG.DROPDOWN_DATA.durations);
      if (value && timeUnit) label += ` (${value} ${getLabelFromKey(timeUnit, CONFIG.DC20RPG.DROPDOWN_DATA.timeUnits)})`
      content.push(_infoBox(`${label}`, "", "tier2"));
    }
  }
  return content;
}

function _castTime(item) {
  const content = [];
  const castTime =  item.system?.castTime;

  if (castTime) {
    const value = castTime.value;
    const timeUnit = castTime.timeUnit;

    if (value && timeUnit) {
      content.push(_infoBox(`Cast Time: ${value} ${getLabelFromKey(timeUnit, CONFIG.DC20RPG.DROPDOWN_DATA.timeUnits)}`, "", "tier2"));
    }
  }

  return content;
}

function _weaponStyle(item) {
  const content = [];
  const weaponStyle = item.system?.weaponStyle;
  if (weaponStyle) {
    const label = getLabelFromKey(weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)
    content.push(_infoBox(label, "green", "tier3", {
      cssClass: "journal-tooltip", 
      data: `
      data-hover="tooltip"
      data-tooltip-type="journal"
      data-uuid="${getLabelFromKey(weaponStyle, CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal)}" 
      data-header="${label}"`
    }));
  }
  return content;
}

function _properties(item) {
  const content = [];
  const properties =  item.system?.properties;
  if (!properties) return content;

  Object.values(properties).forEach((property) => {
    if (property.active) {
      let label = property.label;
      if (property.value) label += ` (${property.value})`;
      content.push(_infoBox(label, "gray", "tier3", {
        cssClass: "journal-tooltip", 
        data: `
        data-hover="tooltip"
        data-tooltip-type="journal"
        data-uuid="${property.journalUuid}" 
        data-header="${property.label}"`
      }));
    }
  });
  return content;
}

function _spellDetails(item) {
  const content = [];
  const components = item.system.components;
  const spellType = item.system.spellType;
  const spellSource = item.system.spellSource;
  const spellSchool = item.system.spellSchool;
  const spellTags = item.system.spellTags;


  // Ritual
  if (spellType === "ritual") {
    content.push(_infoBox("Ritual", "blue", "tier3", {data: "data-tooltip='Can be casted as Ritual'"}));
  }

  // Spell School 
  if (spellSchool) {
    content.push(_infoBox(getLabelFromKey(spellSchool, CONFIG.DC20RPG.DROPDOWN_DATA.spellSchools), "purple", "tier3", {data: "data-tooltip='Spell School'"}));
  }

  // Spell Sources
  Object.entries(spellSource).forEach(([key, source]) => {
    if (source.active) {
      content.push(_infoBox(getLabelFromKey(key, CONFIG.DC20RPG.DROPDOWN_DATA.spellSources), "green", "tier3", {data: "data-tooltip='Spell Source'"}));
    }
  });

  // Spell Tags
  Object.values(spellTags).forEach(spellTag => content.push(_infoBox(spellTag, "gray", "tier3", {data: "data-tooltip='Spell Tag'"})))
  
  // Components
  if (!components.verbal.active) content.push(_infoBox('<i class="fa-solid fa-square-xmark" style="margin-right: 3px;"></i> Verbal', "red", "tier3", {data: "data-tooltip='Do not require Verbal Component'"}));
  if (!components.somatic.active) content.push(_infoBox('<i class="fa-solid fa-square-xmark" style="margin-right: 3px;"></i> Somatic', "red", "tier3", {data: "data-tooltip='Do not require Somatic Component'"}));
  if (components.material.active) {
    let label = "Material";
    if (components.material.description) {
      label += `: ${components.material.description}`;
      const cost = components.material.cost;
      const consumed = components.material.consumed;
      if (cost) label += ` (${cost} GP)`;
      if (consumed) label += ` [Consumed]`;
    }
    content.push(_infoBox(label, "gold", "tier3", {data: "data-tooltip='Require Material Component'"}));
  }
  
  return content;
}

function _infusionDetails(item) {
  const content = [];
  const infusion = item.system.infusion;
  const power = infusion.variablePower ? "?" : infusion.power;
  content.push(_infoBox(`${game.i18n.localize("dc20rpg.item.sheet.infusions.power")}: ${power}`, "gold", "tier3"));

  Object.values(infusion.tags).forEach(tag => {
    if (!tag.active) return;
    let label = tag.label;
    if (tag.melee && !tag.ranged) label = game.i18n.localize("dc20rpg.item.sheet.infusion.melee");
    if (!tag.melee && tag.ranged) label = game.i18n.localize("dc20rpg.item.sheet.infusion.ranged");
    if (tag.ammo) label += ` or ${game.i18n.localize("dc20rpg.item.sheet.infusion.ammo")}`;

    if (tag.max && !tag.max.includes("@magicPower")) label += ` (${tag.max})`;
    content.push(_infoBox(label, "", "tier3"));
  });

  return content;
}