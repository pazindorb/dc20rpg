import { allPartials } from "./templates.mjs";

export function registerHandlebarsCreators() {

  Handlebars.registerHelper('data', (...params) => {
    const size = params.length - 1;
    let dataBindings = "";
    for(let i = 0; i < size; i=i+2) {
      dataBindings += `data-${params[i]}=${params[i+1]} `; 
    }
    return dataBindings;
  });
  
  Handlebars.registerHelper('small-button', (listener, icon, title, data) => {
    title = title ? `title="${title}"` : "";
    data = data || "";
    const component = `
    <a class="small-button ${listener}" ${title} ${data}>
      <i class="${icon}"></i>
    </a> 
    `;
    return component;
  });

  Handlebars.registerHelper('small-button-activable', (isActive, icon, title, data) => {
    title = title ? `title="${title}"` : "";
    data = data || "";
    const activeClass = isActive ? "active" : "";
    const component = `
    <a class="small-button activable ${activeClass}" ${title} ${data}>
      <i class="${icon}"></i>
    </a> 
    `;
    return component;
  });

  Handlebars.registerHelper('icon-printer-empty', (current, max, limit, fullClass, emptyClass) => {
    const fullPoint = `<i class="${fullClass}"></i>`;
    const emptyPoint = `<i class="${emptyClass}"></i>`;

    if (max > limit) return `<b>${current}/${max}</b> ${fullPoint}`;

    let icons = "";
    for(let i = 0; i < max; i++) {
      if (i < current) icons += fullPoint;
      else icons += emptyPoint;
    }
    return icons;
  });

  Handlebars.registerHelper('unique-item', (item, itemType, defaultName, defaultImg, editMode) => {
    let buttons = "";
    let empty = "empty";
    let dataItemId = '';
    if (item) {
      dataItemId = `data-item-id="${item._id}"`;
      defaultName = item.name;
      defaultImg = item.img;
      empty = "";

      if (editMode) {
        const editTooltip = game.i18n.localize('dc20rpg.sheet.editItem');
        const deleteTooltip = game.i18n.localize('dc20rpg.sheet.deleteItem');

        buttons = `
        <div class="item-buttons">
          <a class="item-edit fa-solid fa-edit" title="${editTooltip}" ${dataItemId}></a>
          <a class="item-delete fa-solid fa-trash" title="${deleteTooltip}" ${dataItemId}></a>
        </div>
        `;
      }
    }

    const itemTooltip = game.i18n.localize(`dc20rpg.sheet.${itemType}`);
    const component = `
    <div class="item ${itemType} ${empty}" title=${itemTooltip} ${dataItemId}>
    <img class="item-image" src="${defaultImg}"/>
    <span class="item-name">${defaultName}</span>
    ${buttons}
    </div>
    `;
    return component;
  });

  Handlebars.registerHelper('unique-item-icon', (item, defaultName, defaultImg) => {
    if (item) {
      defaultName = `${defaultName}: ${item.name}`;
      defaultImg = item.img;
    }

    const component = `
    <img src="${defaultImg}" title="${defaultName}"/>
    `;
    return component;
  });

  Handlebars.registerHelper('size', (sizeType) => {
    let short = "";
    switch (sizeType) {
      case "tiny": short = "T"; break;
      case "small": short = "S"; break;
      case "medium": short = "M"; break;
      case "large": short = "L"; break;
      case "huge": short = "H"; break;
      case "gargantuan": short = "G"; break;
    }

    const tooltip = game.i18n.localize(`dc20rpg.size.${sizeType}`);
    const component = `
    <div class="size letter-circle-icon" title="${tooltip}">
      <span>${short}</span>
    </div>
    `
    return component;
  });

  Handlebars.registerHelper('vision', (visions) => {
    let tooltip = "";
    Object.values(visions).forEach(vision => {
      tooltip += `${vision.label}: [${vision.value}]`
      tooltip += "\n"
    });
    const component = `
    <div class="vision letter-circle-icon" title="${tooltip}">
      <i class="fa-solid fa-eye fa-2x"></i>
    </div>
    `
    return component;
  });

  Handlebars.registerHelper('show-hide-toggle', (flag, path) => {
    const icon = flag ? "fa-eye-slash" : "fa-eye";
    return `<a class="activable fa-solid ${icon}" data-path="${path}"></a>`;
  });
  
  Handlebars.registerHelper('expertise-button', (expertise, key, editMode) => {
    if (editMode || expertise) {
      const tooltip = game.i18n.localize('dc20rpg.sheet.skills.expertise');
      const component = `
      <div class="letter-circle-icon small clickable expertise" title="${tooltip}">
        <a class="skill-expertise-toggle" data-path="system.skills.${key}.expertise">${expertise}</a>
      </div>
      `
      return component;
    }
    return '';
  });

  Handlebars.registerHelper('item-table', (editMode, items, navTab) => {
    const partialPath = allPartials()["Item Table"];
    // const partialPath = "systems/dc20rpg/templates/actor_v2/parts/shared/item-table.hbs";
    const template = Handlebars.partials[partialPath];
    if (template) {
      const context = {
        editMode: editMode,
        navTab: navTab,
        items: items
      }
      return new Handlebars.SafeString(template(context));
    }
    return '';
  });

  Handlebars.registerHelper('grid-template', (navTab, isHeader) => {
    const headerOrder = isHeader  ? "35px" : '';
    const inventoryTab = navTab === "inventory" ? "35px 40px" : '';
    const spellTab = navTab === "spells" ? "70px" : '';
    
    return `grid-template-columns: ${headerOrder} 1fr 70px 70px 50px ${spellTab}${inventoryTab} 70px;`;
  });

  Handlebars.registerHelper('cost-printer', (costs, mergeAmount) => {
    if (!costs) return '';

    let component = '';
    const icons = {
      actionPoint: "ap fa-dice-d6",
      stamina: "sp fa-hand-fist",
      mana: "mp fa-star",
      health: "hp fa-heart"
    }

    // Print core resources
    Object.entries(costs).forEach(([key, resCost]) => {
      switch (key) {
        case "custom": break;
        case "actionPoint":
          component += _printWithZero(resCost.cost, mergeAmount, icons[key]);
          break;
        default: 
          component += _printNonZero(resCost.cost, mergeAmount, icons[key]);
          break;
      }
    });

    if (!costs.custom) return component;
    // Print custom resources
    Object.values(costs.custom).forEach(resource => {
      component += _printImg(resource.cost, mergeAmount, resource.imgSrc);
    });
    return component;
  });

  Handlebars.registerHelper('item-config', (item, editMode) => {
    if (!item) return '';
    let component = '';

    // Activable Effects
    const activable = item.system.activableEffect;
    if (activable?.hasEffects) {
      const active = activable.active ? 'fa-toggle-on' : 'fa-toggle-off';
      const title = activable.active 
                  ? game.i18n.localize(`dc20rpg.itemTable.deactivateEffects`)
                  : game.i18n.localize(`dc20rpg.itemTable.activateEffects`)

      component += `<a class="item-activable fa-lg fa-solid ${active}" title="${title}" data-item-id="${item._id}" data-path="system.activableEffect.active"></a>`
    }

    // Can be equippoed/attuned
    const statuses = item.system.statuses;
    if (statuses) {
      const equipped = statuses.equipped ? 'fa-solid' : 'fa-regular';
      const equippedTitle = statuses.equipped 
                          ? game.i18n.localize(`dc20rpg.itemTable.uneqiupItem`)
                          : game.i18n.localize(`dc20rpg.itemTable.eqiupItem`)
      
      component += `<a class="item-activable ${equipped} fa-suitcase-rolling" title="${equippedTitle}" data-item-id="${item._id}" data-path="system.statuses.equipped"></a>`

      if (item.system.properties.attunement.active) {
        const attuned = statuses.attuned ? 'fa-solid' : 'fa-regular';
        const attunedTitle = statuses.attuned 
                            ? game.i18n.localize(`dc20rpg.itemTable.unattuneItem`)
                            : game.i18n.localize(`dc20rpg.itemTable.attuneItem`)
        
        component += `<a class="item-activable ${attuned} fa-hat-wizard" title="${attunedTitle}" data-item-id="${item._id}" data-path="system.statuses.attuned"></a>`
      }
    }

    // Configuration
    if (editMode) {
      component += `<a class="item-edit fas fa-edit" title="${game.i18n.localize('dc20rpg.itemTable.editItem')}" data-item-id="${item._id}"></a>`;
      component += `<a class="item-delete fas fa-trash" title="${game.i18n.localize('dc20rpg.itemTable.deleteItem')}" data-item-id="${item._id}"></a>`;
    }
    return component;
  });
}

function _printWithZero(cost, mergeAmount, icon) {
  if (cost === undefined) return '';
  if (cost === 0) return `<i class="${icon} fa-light cost-icon"></i>`;
  const costIconHtml = `<i class="${icon} fa-solid cost-icon"></i>`;
  return _print(cost, mergeAmount, costIconHtml);
}

function _printNonZero(cost, mergeAmount, icon) {
  if (!cost) return '';
  const costIconHtml = `<i class="${icon} fa-solid cost-icon"></i>`;
  return _print(cost, mergeAmount, costIconHtml);
}

function _printImg(cost, mergeAmount, iconPath) {
  if (!cost) return '';
  const costImg = `<img src=${iconPath} class="cost-img">`;
  return _print(cost, mergeAmount, costImg);
}

function _print(cost, mergeAmount, costIconHtml) {
  if (mergeAmount > 4 && cost > 1) return `<b>${cost}x</b>${costIconHtml}`;
  let pointsPrinter = "";
  for (let i = 1; i <= cost; i ++) pointsPrinter += costIconHtml;
  return pointsPrinter;
}