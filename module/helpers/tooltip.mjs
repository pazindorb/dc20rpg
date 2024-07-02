import { DC20RPG } from "./config.mjs";
import { itemDetailsToHtml } from "./items/itemDetails.mjs";
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

export function effectTooltip(effect, event, html) {
  if (!effect) return _showTooltip(html, event, "-", "Effect not found", "");
  const header = _itemHeader(effect);
  const description = `<div class='description'> ${_simplyfyDescription(effect.description)} </div>`;
  _showTooltip(html, event, header, description, null);
}

export function itemTooltip(item, inside, event, html) {
  if (!item) return _showTooltip(html, event, "-", "Item not found", "");

  const header = _itemHeader(item);
  const description = _itemDescription(item);
  const details = _itemDetails(item);
  inside = inside === "true";
  _showTooltip(html, event, header, description, details, inside);
}

export function enhTooltip(item, enhKey, event, html) {
  if(!item) return _showTooltip(html, event, "-", "Item not found", "");
  const enhancement = item.system.enhancements[enhKey];
  if(!enhancement) return _showTooltip(html, event, "-", "Enhancement not found", "");

  const header = `<input disabled value="${enhancement.name}"/>`;
  const description = `<div class='description'> ${_simplyfyDescription(enhancement.description)} </div>`;
  _showTooltip(html, event, header, description, null);
}

export function textTooltip(text, title, img, event, html) {
  const description = `<div class='description'> ${text} </div>`
  let tooltipHeader = ''
  if (title) {
    if (img) tooltipHeader += `<img src="${img}"/>`;
    tooltipHeader += `<input disabled value="${title}"/>`
  }
  _showTooltip(html, event, tooltipHeader, description, null);
}

export async function journalTooltip(uuid, header, img, inside, event, html) {
  const page = await fromUuid(uuid);
  if (!page) return;

  inside = inside === "true";
  const description = page.text.content;
  const tooltipHeader = ` <img src="${img}" style="background-color:black;"/>
                          <input disabled value="${header}"/>`;
  _showTooltip(html, event, tooltipHeader, description, null, inside);
}

export function hideTooltip(event, html) {
  event.preventDefault();
  if (event.altKey) return;

  const tooltip = html.find(".tooltip-container");
  tooltip[0].style.opacity = 0;
  tooltip[0].style.visibility = "hidden";
}

function _showTooltip(html, event, header, description, details, inside) {
  const tooltip = html.find(".tooltip-container");
  _showHidePartial(header, tooltip.find(".tooltip-header"));
  _showHidePartial(description, tooltip.find(".tooltip-description"));
  _showHidePartial(details, tooltip.find(".tooltip-details"));
  _setPosition(event, tooltip, inside);

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

function _setPosition(event, tooltip, inside) {
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
    if (!inside) tooltip[0].style.left = (left - width) + "px"
}

function _itemHeader(item) {
  return `
    <img src="${item.img}"/>
    <input disabled value="${item.name}"/>
  `
}

function _itemDescription(item) {
  if (!item.system) return `<div class='description'> <b>Item not found</b> </div>`
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
  return itemDetailsToHtml(item);
}