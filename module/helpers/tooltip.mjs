import { itemDetailsToHtml } from "./items/itemDetails.mjs";
import { datasetOf } from "./listenerEvents.mjs";

export function effectTooltip(effect, event, html, options={}) {
  if (!effect) return _showTooltip(html, event, "-", "Effect not found", "");
  const header = _itemHeader(effect);
  const description = `<div class='description'> ${_enhanceDescription(effect.description)} </div>`;
  _showTooltip(html, event, header, description, null, options);
}

export function itemTooltip(item, event, html, options={}) {
  if (!item) return _showTooltip(html, event, "-", "Item not found", "");

  const header = _itemHeader(item);
  const description = _itemDescription(item);
  const details = _itemDetails(item);
  _showTooltip(html, event, header, description, details, options);
}

export function traitTooltip(trait, event, html, options={}) {
  if (!trait) return _showTooltip(html, event, "-", "Trait not found", "");

  const header = _itemHeader(trait.itemData);
  const description = _itemDescription(trait.itemData);
  const details = _itemDetails(trait.itemData);
  _showTooltip(html, event, header, description, details, options);
}

export function enhTooltip(item, enhKey, event, html, options={}) {
  if(!item) return _showTooltip(html, event, "-", "Item not found", "");
  const enhancement = item.allEnhancements.get(enhKey);
  if(!enhancement) return _showTooltip(html, event, "-", "Enhancement not found", "");

  const header = `<input disabled value="${enhancement.name}"/>`;
  const description = `<div class='description'> ${_enhanceDescription(enhancement.description)} </div>`;
  _showTooltip(html, event, header, description, null, options);
}

export function textTooltip(text, title, img, event, html, options={}) {
  const description = `<div class='description'> ${text} </div>`
  let tooltipHeader = ''
  if (title) {
    if (img) tooltipHeader += `<img src="${img}"/>`;
    tooltipHeader += `<input disabled value="${title}"/>`
  }
  _showTooltip(html, event, tooltipHeader, description, null, options);
}

export async function journalTooltip(uuid, header, img, event, html, options={}) {
  const page = await fromUuid(uuid);
  if (!page) return;

  const description = page.text.content;
  let imgHeader = ""
  if (img !== undefined) imgHeader = `<img src="${img}" style="background-color:black;"/>`
  const tooltipHeader = `${imgHeader}<input disabled value="${header}"/>`;
  _showTooltip(html, event, tooltipHeader, description, null, options);
}

export function hideTooltip(event, html) {
  event.preventDefault();
  if (event.altKey) return;

  const tooltip = html.find("#tooltip-container");
  tooltip[0].style.opacity = 0;
  tooltip[0].style.visibility = "hidden";
}

function _showTooltip(html, event, header, description, details, options) {
  const tooltip = html.find("#tooltip-container");

  // If tooltip is already visible we dont want other tooltips to appear
  if(tooltip[0].style.visibility === "visible") return;

  _showHidePartial(header, tooltip.find(".tooltip-header"));
  _showHidePartial(description, tooltip.find(".tooltip-description"));
  _showHidePartial(details, tooltip.find(".tooltip-details"));
  _setPosition(event, tooltip, options);
  _addEventListener(tooltip);

  tooltip.contextmenu(() => {
    if (tooltip.oldContent && tooltip.oldContent.length > 0) {
      const oldContent = tooltip.oldContent.pop();
      _swapTooltipContent(tooltip, oldContent.header, oldContent.description, oldContent.details);
    }
  })

  // Visibility
  tooltip[0].style.opacity = 1;
  tooltip[0].style.visibility = "visible";
}

function _addEventListener(tooltip) {
  // Repleace Content
  tooltip.find('.journal-tooltip').click(async ev => {
    const data = datasetOf(ev);
    if (tooltip.oldContent === undefined) tooltip.oldContent = [];

    const page = await fromUuid(data.uuid);
    if (!page) return;

    // We need to store old tooltips so we could go back
    tooltip.oldContent.push({
      header: tooltip.find(".tooltip-header").html(),
      description: tooltip.find(".tooltip-description").html(),
      details: tooltip.find(".tooltip-details").html()
    });

    const description = page.text.content;
    let imgHeader = ""
    if (data.img !== undefined) imgHeader = `<img src="${data.img}" style="background-color:black;"/>`
    const tooltipHeader = `${imgHeader}<input disabled value="${data.header}"/>`;
    _swapTooltipContent(tooltip, tooltipHeader, description, null);
  });

  tooltip.find('.item-tooltip').click(async ev => {
    const data = datasetOf(ev);
    if (tooltip.oldContent === undefined) tooltip.oldContent = [];

    const item = await fromUuid(data.uuid);
    if (!item) return;

    // We need to store old tooltips so we could go back
    tooltip.oldContent.push({
      header: tooltip.find(".tooltip-header").html(),
      description: tooltip.find(".tooltip-description").html(),
      details: tooltip.find(".tooltip-details").html()
    });

    const header = _itemHeader(item);
    const description = _itemDescription(item);
    const details = _itemDetails(item);
    _swapTooltipContent(tooltip, header, description, details);
  });
}

function _swapTooltipContent(tooltip, header, description, details) {
  _showHidePartial(header, tooltip.find(".tooltip-header"));
  _showHidePartial(description, tooltip.find(".tooltip-description"));
  _showHidePartial(details, tooltip.find(".tooltip-details"));
  _addEventListener(tooltip);
}

function _showHidePartial(value, partial) {
  if (value) {
    partial.html(value);
    partial.removeClass("invisible");
  }
  else {
    partial.html(null);
    partial.addClass("invisible");
  }
}

function _setPosition(event, tooltip, options) {
    // Force height and width if provided
    if (options.position) {
      const pos = options.position; 

      if (pos.height) tooltip.height(pos.height);
      if (pos.width) tooltip.width(pos.width);
    }
    else {
      tooltip[0].style.maxHeight = "500px";
      tooltip[0].style.minWidth = "300px";

      // Horizontal position
      const height = tooltip[0].getBoundingClientRect().height;
      tooltip[0].style.top = (event.pageY - (height/2)) + "px";
      const bottom = tooltip[0].getBoundingClientRect().bottom;
      const top = tooltip[0].getBoundingClientRect().top;
      const viewportHeight = window.innerHeight;
      
      // We dont want our tooltip to exit top nor bottom borders
      if (bottom > viewportHeight) {
        tooltip[0].style.top = (viewportHeight - height) + "px";
      }
      if (top < 0) tooltip[0].style.top = "0px";
      // Vertical position
      tooltip[0].style.left = "";
      const left = tooltip[0].getBoundingClientRect().left;
      const width = tooltip[0].getBoundingClientRect().width;
      if (!options.inside) tooltip[0].style.left = (left - width) + "px";
      if (tooltip[0].getBoundingClientRect().left < 0) {
        // In the case that tooltip exits window areas we want to put it next to the cursor
        const cursorPosition = event.pageX;
        tooltip[0].style.left = (cursorPosition + 50) + "px";
      }
    } 
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
  const enhDescription = _enhanceDescription(description);
  if (identified) return `<div class='description'> ${enhDescription} </div>`;
  else return `<div class='description'> <b>UNIDENTIFIED</b> </div>`;
}

function _enhanceDescription(description) {
  const uuidRegex = /@UUID\[[^\]]*]\{[^}]*}/g;
  const itemLinks = [...description.matchAll(uuidRegex)];
  itemLinks.forEach(link => {
    link = link[0];
    let [uuid, name] = link.split("]{");    
    // Remove "trash"
    uuid = uuid.slice(6);
    name = name.slice(0, name.length- 1);

    let tooltipLink = ""; 
    if (uuid.includes(".Item.")) tooltipLink = `<span class="item-tooltip hyperlink-style" data-uuid="${uuid}">${name}</span>`;
    else if (uuid.includes(".JournalEntryPage.")) tooltipLink = `<span class="journal-tooltip hyperlink-style" data-uuid="${uuid}" data-header="${name}">${name}</span>`;
    else tooltipLink = `<span><b>${name}</b></span>`;
    description = description.replace(link, tooltipLink);
  });
  return description;
}

function _itemDetails(item) {
  const identified = item?.system?.statuses ? item.system.statuses.identified : true;
  if (identified) return itemDetailsToHtml(item, true);
  else return null;
}