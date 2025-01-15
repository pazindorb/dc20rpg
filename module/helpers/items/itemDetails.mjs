import { DC20RPG } from "../config.mjs";
import { getLabelFromKey } from "../utils.mjs";

export function itemDetailsToHtml(item) {
  if (!item) return "";
  let content = "";
  content += _range(item);
  content += _target(item);
  content += _duration(item);
  content += _armorBonus(item);
  content += _weaponStyle(item);
  content += _magicSchool(item);
  content += _props(item);
  content += _components(item);
  return content;
}

function _range(item) {
  const range = item.system?.range;
  let content = "";

  if (range) {
    const normal = range.normal;
    const max = range.max;
    const unit = range.unit ? range.unit : "Spaces";

    if (normal) {
      content += `<div class='detail'> ${normal}`;
      if (max) content += `/${max}`;
      content += ` ${unit} </div>`;
    }
  }
  return content;
}

function _target(item) {
  const target =  item.system?.target;
  let content = "";

  if (target) {
    if (target.invidual) content += _invidual(target);
    else content += _area(target);
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
    content += ` ${getLabelFromKey(type, DC20RPG.DROPDOWN_DATA.invidualTargets)}`;
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
      content += ` ${getLabelFromKey(area, DC20RPG.DROPDOWN_DATA.areaTypes)}`
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
      content += `${getLabelFromKey(type, DC20RPG.DROPDOWN_DATA.durations)} (`;
      if (value) content += `${value}`;
      content += ` ${getLabelFromKey(timeUnit, DC20RPG.DROPDOWN_DATA.timeUnits)}`;
      content += ")</div>";
    }
    else if (type) {
      content += "<div class='detail'>";
      content += `${getLabelFromKey(type, DC20RPG.DROPDOWN_DATA.durations)}`;
      content += "</div>";
    }
  }
  return content;
}

function _armorBonus(item) {
  const armorBonus = item.system?.armorBonus;
  let content = "";
  if (armorBonus) {
    content += "<div class='detail'>";
    content += `+ ${armorBonus} PD`;
    content += "</div>";
  }
  return content;
}

function _weaponStyle(item) {
  const weaponStyle = item.system?.weaponStyle;
  if (!weaponStyle) return "";

  return `<div class='detail red-box journal-tooltip box-style'
  data-uuid="${getLabelFromKey(weaponStyle, DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.weaponStylesJournal)}"
  data-header="${getLabelFromKey(weaponStyle, DC20RPG.DROPDOWN_DATA.weaponStyles)}"> 
  ${getLabelFromKey(weaponStyle, DC20RPG.DROPDOWN_DATA.weaponStyles)}
  </div>`;
}

function _magicSchool(item) {
  const magicSchool = item.system?.magicSchool;
  if (!magicSchool) return "";
  return `<div class='detail red-box'> 
    ${getLabelFromKey(magicSchool, DC20RPG.DROPDOWN_DATA.magicSchools)}
  </div>`;
}

function _props(item) {
  const properties =  item.system?.properties;
  let content = "";
  if (properties) {
    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.active) {
        content += `<div class='detail box journal-tooltip box-style'
        data-uuid="${getLabelFromKey(key, DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.propertiesJournal)}"
        data-header="${getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.properties)}"
        > 
        ${getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.properties)}`;
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
        content += `<div class='detail box'> ${getLabelFromKey(key, DC20RPG.DROPDOWN_DATA.components)}`;
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
