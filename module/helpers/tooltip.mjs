import { DC20RPG } from "./config.mjs";
import { getLabelFromKey } from "./utils.mjs";

export function generateItemName(item) {
  let itemName = item.name ? item.name : "Item Details";
  if (item.type === "spell") {
    const spellType = item.system.spellType;
    itemName += ` (${getLabelFromKey(spellType, DC20RPG.spellTypes)})`;
  } 
  return itemName;
}

export function generateDescriptionForItem(item) {
  if (!item) return "Item not found";

  let content = "";
  // content += _rollResults(item);
  content += _description(item);
  return content;
}

export function itemTooltip(item, event, html) {
  if (!item) return _showTooltip(html, event, "-", "Item not found", "");

  const header = _itemHeader(item);
  const description = _itemDescription(item);
  const details = _itemDetails(item);
  _showTooltip(html, event, header, description, details)
}

export function textTooltip(text, event, html) {
  const description = `<div class='description'> ${text} </div>`
  _showTooltip(html, event, null, description, null);
}

export async function journalTooltip(uuid, header, event, html) {
  const page = await fromUuid(uuid);
  if (!page) return;
  const mainHeader = page.toc[header];
  if (!mainHeader) return;

  let description = ""
  mainHeader.children.forEach(child => {
    const childHeader = page.toc[child];
    if (childHeader.level === 4) description += `<p>${childHeader.text}</p>`;
  });
  
  const tooltipHeader = `<input disabled value="${mainHeader.text}"/>`;
  _showTooltip(html, event, tooltipHeader, description, null);
}

export function hideTooltip(event, html) {
  event.preventDefault();
  if (event.altKey) return;

  const tooltip = html.find(".tooltip-container");
  tooltip[0].style.opacity = 0;
  tooltip[0].style.visibility = "hidden";
}

function _showTooltip(html, event, header, description, details) {
  const tooltip = html.find(".tooltip-container");
  _showHidePartial(header, tooltip.find(".tooltip-header"));
  _showHidePartial(description, tooltip.find(".tooltip-description"));
  _showHidePartial(details, tooltip.find(".tooltip-details"));
  _setPosition(event, tooltip);

  // Visibility
  tooltip[0].style.opacity = 1;
  tooltip[0].style.visibility = "visible";
}

function _showHidePartial(value, partial) {
  if (value) {
    partial.html(value);
    partial.removeClass("invisible");
  }
  else {
    partial.addClass("invisible");
  }
}

function _setPosition(event, tooltip) {
    // Horizontal position
    const height = tooltip[0].getBoundingClientRect().height;
    tooltip[0].style.top = (event.pageY - (height/2)) + "px";
    const bottom = tooltip[0].getBoundingClientRect().bottom;
    const viewportHeight = window.innerHeight;
    if (bottom > viewportHeight) {
      tooltip[0].style.top = (viewportHeight - height) + "px";
    }
    // Vertical position
    tooltip[0].style.left = "";
    const left = tooltip[0].getBoundingClientRect().left;
    const width = tooltip[0].getBoundingClientRect().width;
    tooltip[0].style.left = (left - width) + "px"
}

function _journalDescription(page, mainHeader) {
  let content = ""
  mainHeader.children.forEach(child => {
    const childHeader = page.toc[child];
    if (childHeader.level === 4) {
      content += `<h${childHeader.level}> ${childHeader.text} </h${childHeader.level}>`;
    }
  })
  return content;
}

function _itemHeader(item) {
  return `
    <img src="${item.img}"/>
    <input disabled value="${item.name}"/>
  `
}

function _itemDescription(item) {
  const identified = item.system.statuses ? item.system.statuses.identified : true;
  const description = item.system.description;
  if (identified) return `<div class='description'> ${_simplyfyDescription(description)} </div>`;
  else return `<div class='description'> <b>UNIDENTIFIED</b> </div>`;
}

function _simplyfyDescription(description) {
  let dsc = description;
  const regex = /@UUID\[[^\]]*]\{[^}]*}/g;
  const front = /@UUID\[[^\]]*]\{/;
  
  const parts = [...dsc.matchAll(regex)];
  parts.forEach(part => {
    let match = part[0];
    match = match.split(front); // extract item name
    match = match[1].slice(0, match[1].length -1); // remove closing '}'
    match = `<b>${match}</b>`; // make it bold

    dsc = dsc.replace(part[0], match);
  });
  return dsc;
}

function _itemDetails(item) {
  let content = "";
  content += _range(item);
  content += _target(item);
  content += _duration(item);
  content += _armorBonus(item);
  content += _props(item);
  content += _components(item);
  return content;
}

function _range(item) {
  const range = item.system.range;
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
  const target =  item.system.target;
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
    content += ` ${getLabelFromKey(type, DC20RPG.invidualTargets)}`;
    content += "</div>";
  }
  return content;
}
  
function _area(target) {
  let content = "";
  const area = target.area;
  const unit = target.unit;
  const distance = target.distance;
  const width = target.width;

  if (area) {
    content += "<div class='detail'>";
    if (distance) {
      content += area === "line" ? ` ${distance}/${width}` : ` ${distance}`;
      content += unit ? ` ${unit}` : " Spaces";
    }
    content += ` ${getLabelFromKey(area, DC20RPG.areaTypes)}`
    content += "</div>";
  }
  return content;
}

function _duration(item) {
  const duration =  item.system.duration;
  let content = "";

  if (duration) {
    const type = duration.type;
    const value = duration.value;
    const timeUnit = duration.timeUnit;

    if (type && timeUnit) {
      content += "<div class='detail'>";
      content += `${getLabelFromKey(type, DC20RPG.durations)} (`;
      if (value) content += `${value}`;
      content += ` ${getLabelFromKey(timeUnit, DC20RPG.timeUnits)}`;
      content += ")</div>";
    }
    else if (type) {
      content += "<div class='detail'>";
      content += `${getLabelFromKey(type, DC20RPG.durations)}`;
      content += "</div>";
    }
  }
  return content;
}

function _armorBonus(item) {
  const armorBonus = item.system.armorBonus;
  let content = "";
  if (armorBonus) {
    content += "<div class='detail'>";
    content += `+ ${armorBonus} PD`;
    content += "</div>";
  }
  return content;
}

function _props(item) {
  const properties =  item.system.properties;
  let content = "";
  if (properties) {
    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.active) {
        content += `<div class='detail box'> ${getLabelFromKey(key, DC20RPG.properties)}`;
        if (prop.value) content += ` (${prop.value})`;
        content += "</div>";
      }
    });
  }
  return content;
}

function _components(item) {
  const components = item.system.components;
  let content = "";
  if (components) {
    Object.entries(components).forEach(([key, comp]) => {
      if (comp.active) {
        content += `<div class='detail box'> ${getLabelFromKey(key, DC20RPG.components)}`;
        if (key === "material") {
          if (comp.description) {
            const cost = comp.cost ? ` ${comp.cost}` : "";
            const consumed = comp.consumed ? "[Consumed On Use]" : "";
            content += `: ${comp.description}${cost}${consumed}`;
          } 
        }
        content += "</div>";
      }
    });
  }
  return content;
}