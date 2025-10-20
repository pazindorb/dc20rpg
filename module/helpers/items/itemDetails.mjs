import { getLabelFromKey } from "../utils.mjs";

export function itemDetailsToHtml(item) {
  if (!item) return "";
  let content = "";
  content += _range(item);
  content += _target(item);
  content += _duration(item);
  content += _weaponStyle(item);
  content += _magicSchool(item);
  content += _props(item);
  content += _components(item);
  content += _infusionDetails(item);
  return content;
}


function _range(item) {
  const range = item.system?.range;
  let content = "";

  if (range) {
    const melee = range.melee;
    const normal = range.normal;
    const max = range.max;
    const unit = range.unit ? range.unit : "Spaces";

    if (normal) {
      content += `<div class='detail'> ${normal}`;
      if (max) content += `/${max}`;
      content += ` ${unit} Range </div>`;
    }
    if (melee && melee > 1) {
      content += `<div class='detail'> ${melee}`;
      content += ` ${unit} Melee Range </div>`;
    }
  }
  return content;
}

function _target(item) {
  const target =  item.system?.target;
  let content = "";

  if (target) {
    content += _invidual(target);
    content += _area(target);
  }
  return content;
}
  
function _invidual(target) {
  let content = "";
  const type = target.type;
  const count = target.count;

  if (type) {
    content += "<div class='detail'>";
    if (count) content += ` ${count}`;
    content += ` ${getLabelFromKey(type, CONFIG.DC20RPG.DROPDOWN_DATA.invidualTargets)}`;
    content += "</div>";
  }
  return content;
}
  
function _area(target) {
  let content = "";

  Object.values(target.areas).forEach(ar => {
    const area = ar.area;
    const unit = ar.unit;
    const distance = ar.distance;
    const width = ar.width;
  
    if (area) {
      content += "<div class='detail'>";
      if (distance) {
        content += area === "line" ? ` ${distance}/${width}` : ` ${distance}`;
        content += unit ? ` ${unit}` : " Spaces";
      }
      content += ` ${getLabelFromKey(area, CONFIG.DC20RPG.DROPDOWN_DATA.areaTypes)}`
      content += "</div>";
    }
  });
  return content;
}

function _duration(item) {
  const duration =  item.system?.duration;
  let content = "";

  if (duration) {
    const type = duration.type;
    const value = duration.value;
    const timeUnit = duration.timeUnit;

    if (type && timeUnit) {
      content += "<div class='detail'>";
      content += `${getLabelFromKey(type, CONFIG.DC20RPG.DROPDOWN_DATA.durations)} (`;
      if (value) content += `${value}`;
      content += ` ${getLabelFromKey(timeUnit, CONFIG.DC20RPG.DROPDOWN_DATA.timeUnits)}`;
      content += ")</div>";
    }
    else if (type) {
      content += "<div class='detail'>";
      content += `${getLabelFromKey(type, CONFIG.DC20RPG.DROPDOWN_DATA.durations)}`;
      content += "</div>";
    }
  }
  return content;
}

function _weaponStyle(item) {
  const weaponStyle = item.system?.weaponStyle;
  if (!weaponStyle) return "";

  return `<div class='detail green-box box journal-tooltip box-style'
  data-uuid="${getLabelFromKey(weaponStyle, CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal)}"
  data-header="${getLabelFromKey(weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)}"> 
  ${getLabelFromKey(weaponStyle, CONFIG.DC20RPG.DROPDOWN_DATA.weaponStyles)}
  </div>`;
}

function _magicSchool(item) {
  const magicSchool = item.system?.magicSchool;
  if (!magicSchool) return "";
  return `<div class='detail green-box box'> 
    ${getLabelFromKey(magicSchool, CONFIG.DC20RPG.DROPDOWN_DATA.magicSchools)}
  </div>`;
}

function _props(item) {
  const properties =  item.system?.properties;
  let content = "";
  if (properties) {
    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.active) {
        content += `<div class='detail box journal-tooltip box-style'
        data-uuid="${prop.journalUuid}"
        data-header="${prop.label}"
        > 
        ${prop.label}`;
        if (prop.value) content += ` (${prop.value})`;
        content += "</div>";
      }
    });
  }
  return content;
}

function _components(item) {
  const components = item.system?.components;
  let content = "";
  if (components) {
    Object.entries(components).forEach(([key, comp]) => {
      if (comp.active) {
        content += `<div class='detail box'> ${getLabelFromKey(key, CONFIG.DC20RPG.DROPDOWN_DATA.components)}`;
        if (key === "material") {
          if (comp.description) {
            const cost = comp.cost ? ` (${comp.cost} GP)` : "";
            const consumed = comp.consumed ? " [Consumed]" : "";
            content += `: ${comp.description}${cost}${consumed}`;
          } 
        }
        content += "</div>";
      }
    });
  }
  return content;
}

function _infusionDetails(item) {
  if (item.type !== "infusion") return "";

  let content = "";
  const infusion = item.system.infusion;
  content += `<div class='detail'> ${game.i18n.localize("dc20rpg.item.sheet.infusions.power")}: ${infusion.variablePower ? "?" : infusion.power} </div>`;

  Object.entries(infusion.tags).forEach(([key, tag]) => {
    if (tag.active) {
        content += `<div class='detail box journal-tooltip box-style'
        data-uuid="${tag.journalUuid}"
        data-header="${tag.label}"
        > 
        ${tag.label}`;
        content += "</div>";
    }
  });
  return content;
}

export function getFormulaHtmlForCategory(category, item) {
  const types = { ...CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes, ...CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes }
  let formulas = item.system.formulas;
  let formulaString = "";

  let filteredFormulas = Object.values(formulas)
    .filter(formula => formula.category === category);

  for (let i = 0; i < filteredFormulas.length; i++) {
    let formula = filteredFormulas[i];
    if (formula.formula === "") continue;
    formulaString += formula.formula;
    formulaString += category !== "other" ? ` ${getLabelFromKey(formula.type, types)}` : ` ${formula.label}`;
    formulaString += " + ";
  }

  if (formulaString !== "") formulaString = formulaString.substring(0, formulaString.length - 3);
  return formulaString;
}

export function getRollRequestHtmlForCategory(category, item) {
  const rollRequests = item.system.rollRequests;
  if (!rollRequests) return "";

  const filtered = Object.values(rollRequests).filter(request => request.category === category);

  let rollRequestString = "";
  for (let i = 0; i < filtered.length; i++) {
    if (category === "save") rollRequestString += " " + getLabelFromKey(filtered[i].saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes) + "";
    if (category === "contest") rollRequestString += "  " + getLabelFromKey(filtered[i].contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests) + "";
    rollRequestString += " or ";
  }

  if (rollRequestString !== "") rollRequestString = rollRequestString.substring(0, rollRequestString.length - 4);
  return rollRequestString;
}