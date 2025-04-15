import { getLabelFromKey } from "../utils.mjs";

export function itemDetailsToHtml(item, includeCosts) {
  if (!item) return "";
  let content = "";
  if(includeCosts) content += _cost(item);
  content += _range(item);
  content += _target(item);
  content += _duration(item);
  content += _armorBonus(item);
  // content += _armorPdr(item); TODO: ARMOR REWORK
  content += _weaponStyle(item);
  content += _magicSchool(item);
  content += _props(item);
  content += _components(item);
  return content;
}

function _cost(item) {
  let content = "";
  const cost = item.system?.costs?.resources;
  if (!cost) return "";
  
  if (cost.actionPoint > 0)   content += `<div class='detail red-box'>${cost.actionPoint} AP</div>`;
  if (cost.stamina > 0)       content += `<div class='detail red-box'>${cost.stamina} SP</div>`;
  if (cost.mana > 0)          content += `<div class='detail red-box'>${cost.mana} MP</div>`;
  if (cost.health > 0)        content += `<div class='detail red-box'>${cost.health} HP</div>`;
  if (cost.grit > 0)          content += `<div class='detail red-box'>${cost.grit} GP</div>`;
  if (cost.restPoints > 0)    content += `<div class='detail red-box'>${cost.restPoints} RP</div>`;

  // Prepare Custom resource cost
  if (cost.custom) {
    for (const custom of Object.values(cost.custom)) {
      if (custom.value > 0)   content += `<div class='detail red-box'>${custom.value} ${custom.name}</div>`
    }
  }
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

function _armorBonus(item) {
  const armorBonus = item.system?.armorBonus ?? 0;
  const properties = item.system?.properties;
  let content = "";
  const sumOfBonus = armorBonus + properties?.reinforced?.active + properties?.sturdy?.active;
  if (sumOfBonus) {
    content += "<div class='detail'>";
    content += `+ ${sumOfBonus} PD`;
    content += "</div>";
  }
  return content;
}

function _armorPdr(item) {
  const armorPdr = item.system?.armorPdr ?? 0;
  const properties = item.system?.properties;
  let content = "";
  const sumOfBonus = armorPdr + properties?.dense?.active;
  if (sumOfBonus) {
    content += "<div class='detail'>";
    content += `+ ${sumOfBonus} PDR`;
    content += "</div>";
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
        data-uuid="${getLabelFromKey(key, CONFIG.DC20RPG.SYSTEM_CONSTANTS.JOURNAL_UUID.propertiesJournal)}"
        data-header="${getLabelFromKey(key, CONFIG.DC20RPG.DROPDOWN_DATA.properties)}"
        > 
        ${getLabelFromKey(key, CONFIG.DC20RPG.DROPDOWN_DATA.properties)}`;
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
    formulaString += " <em>" + getLabelFromKey(formula.type, types) + "</em>";
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
    if (category === "save") rollRequestString += " <em>" + getLabelFromKey(filtered[i].saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes) + "</em>";
    if (category === "contest") rollRequestString += " <em> " + getLabelFromKey(filtered[i].contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests) + "</em>";
    rollRequestString += " or ";
  }

  if (rollRequestString !== "") rollRequestString = rollRequestString.substring(0, rollRequestString.length - 4);
  return rollRequestString;
}