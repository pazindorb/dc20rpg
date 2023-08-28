import { DC20RPG } from "../config.mjs";
import { getLabelFromKey } from "../utils.mjs";

export function generateContentForItem(item) {
  if (!item) return "Item not found";

  let content = "";
  content += _range(item);
  content += _target(item);
  content += _duration(item);
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
      content += `<div class='detail'> <b>Range:</b> ${normal}`;
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
    content += "<div class='detail'> <b>Target:</b>";
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
    content += "<div class='detail'> <b>Area:</b>";
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

    if (type) {
      content += "<div class='detail'> <b>Duration:</b>";
      if (value) content += ` ${value}`;
      content += ` ${getLabelFromKey(type, DC20RPG.durations)}`;
      content += "</div>";
    }
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
        if (key === "reload") content += ` (${prop.value})`;
        if (key === "requirement") {
          const number = prop.number ? `${prop.number} `  : "";
          if (prop.attribute) content += ` <br>[${number}${getLabelFromKey(prop.attribute, DC20RPG.attributes)}]`;
        }
        if (key === "damageReduction") content += ` (${prop.value})`;
        content += "</div>";
      }
    });
  }
  return content;
}

function _components(item) {
  const components =  item.system.components;
  let content = "";
  if (components) {
    Object.entries(components).forEach(([key, comp]) => {
      if (comp.active) {
        content += `<div class='detail box'> ${getLabelFromKey(key, DC20RPG.components)}`;
        if (key === "material") {
          if (comp.description) {
            const cost = comp.cost ? ` ${comp.cost}` : "";
            const consumed = comp.consumed ? "<br>[Consumed On Use]" : "";
            content += `: ${comp.description}${cost}${consumed}`;
          } 
        }
        content += "</div>";
      }
    });
  }
  return content;
}
