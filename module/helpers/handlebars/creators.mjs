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
    <div class="size" title="${tooltip}">
      <span>${short}</span>
    </div>
    `
    return component;
  });
}