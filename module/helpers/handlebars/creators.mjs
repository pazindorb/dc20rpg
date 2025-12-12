import { itemDetailsToHtml } from "../items/itemDetails.mjs";
import { getLabelFromKey } from "../utils.mjs";
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

  Handlebars.registerHelper('icon-printer-empty', (current, max, limit, fullClass, emptyClass, recolorValue, color) => {
    if (!recolorValue) recolorValue = 0;
    const fullPoint = `<i class="${fullClass}"></i>`;
    const emptyPoint = `<i class="${emptyClass}"></i>`;
    const coloredPoint = `<i class="${fullClass}" style="color:${color}"></i>`;

    if (max > limit) return `<b>${current}/${max}</b> ${fullPoint}`;

    let icons = "";
    for(let i = 0; i < max; i++) {
      if (i < recolorValue) icons += coloredPoint;
      else if (i < current) icons += fullPoint;
      else icons += emptyPoint;
    }
    return icons;
  });

  Handlebars.registerHelper('unique-item', (item, itemType, defaultName, defaultImg, level, editMode) => {
    let buttons = "";
    let hasItem = "empty";
    let dataItemId = '';
    let showTooltip = '';
    let missing = '';
    if (item) {
      dataItemId = `data-item-id="${item._id}" data-inside="true"`;
      defaultName = item.name;
      defaultImg = item.img;
      hasItem = "item editable";
      showTooltip = 'item-tooltip';

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
    else {
      if (itemType === "subclass") missing = level >= 3 ? "missing" : "";
      else missing = "missing";
      const openCompendium = game.i18n.localize('dc20rpg.sheet.openCompendium');
      const mixAncestery = itemType === "ancestry" ? `
      <a class="mix-ancestry fa-solid fa-network-wired fa-lg" title="${game.i18n.localize('dc20rpg.sheet.mixAncestery')}"></a>
    ` : ""
      buttons = `
      <div class="item-buttons" style="border-left:0;">${mixAncestery}
        <a class="open-compendium fa-solid fa-book-atlas fa-lg" title="${openCompendium}" data-item-type="${itemType}"></a>
      </div>
      `;
    }

    const title = game.i18n.localize(`dc20rpg.sheet.${itemType}`);
    const component = `
    <div class="unique-item ${missing} ${itemType} ${hasItem} ${showTooltip}" title=${title} ${dataItemId}>
    <img class="item-image" src="${defaultImg}"/>
    <span class="item-name">${defaultName}</span>
    ${buttons}
    </div>
    `;
    return component;
  });

  Handlebars.registerHelper('unique-item-icon', (item, defaultName, defaultImg) => {
    let tooltip = "";
    if (item) {
      defaultName = `${defaultName}: ${item.name}`;
      defaultImg = item.img;
      tooltip = `class="item-tooltip" data-item-id="${item.id}"`;
    }

    const component = `
    <img src="${defaultImg}" title="${defaultName}" ${tooltip}/>
    `;
    return component;
  });

  Handlebars.registerHelper('show-hide-toggle', (flag, path, oneliner) => {
    let icon = flag ? "fa-eye-slash" : "fa-eye";
    if (oneliner === "true") icon = flag ? "fa-table" : "fa-table-list";
    return `<a class="activable fa-solid ${icon}" data-path="${path}"></a>`;
  });

  Handlebars.registerHelper('item-table', (table, options) => {
    const partialPath = allPartials()["Item Table"];
    const template = Handlebars.partials[partialPath];
    if (!template) return "";
    
    const data = options.hash;
    const columns = data.columns ? data.columns.split(" ") : ["name"];
    
    let gridTemplate = "";
    for (const column of columns) {
      switch (column) {
        case "name": 
          gridTemplate += " 1fr"; break;

        case "weight": case "quantity":
          gridTemplate += " 35px"; break;
          
        case "action": case "components":
          gridTemplate += " 90px"; break;

        case "cost": case "config":
          gridTemplate += " 70px"; break;

        case "charges":
          gridTemplate += " 50px"; break;
      }
    }

    if (template) {
      const context = {
        table: table,
        key: data.key,
        editMode: data.editMode,
        columns: columns,
        gridTemplate: gridTemplate,
        navTab: data.navTab,
        itemConfig: data.itemConfig,
        editModeConfig: data.editModeConfig
      }
      return new Handlebars.SafeString(template(context));
    }
    return '';
  });


  Handlebars.registerHelper('effects-table', (editMode, active, inactive, showInactiveEffects) => {
    const partialPath = allPartials()["Effects Table"];
    const template = Handlebars.partials[partialPath];
    if (template) {
      const context = {
        editMode: editMode,
        active: active,
        inactive: inactive,
        showInactiveEffects: showInactiveEffects,
      }
      return new Handlebars.SafeString(template(context));
    }
    return '';
  });

  Handlebars.registerHelper('traits-table', (editMode, active, inactive, type) => {
    const partialPath = allPartials()["Traits Table"];
    const template = Handlebars.partials[partialPath];
    if (template) {
      const context = {
        editMode: editMode,
        active: active,
        inactive: inactive,
        type: type,
      }
      return new Handlebars.SafeString(template(context));
    }
    return '';
  });

  Handlebars.registerHelper('item-label', (sheetData) => {
    if (sheetData.type) {
      return `
      <div class="item-label">
        <div class="item-type">
          <span>${sheetData.type}</span>
        </div>
        <div class="item-subtype">
          <span>${sheetData.subtype}</span>
        </div>
      </div>
      `;
    }
    else {
      return `
      <div class="item-label">
        <div class="item-type">
         <span>${sheetData.fallbackType}</span>
        </div>
      </div>
      `;
    }
  });

  Handlebars.registerHelper('item-roll-details', (item, sheetData) => {
    const actionType = item.system.actionType;
    if (!actionType) return '';

    let content = '';
    let attackIcon = 'fa-question';
    const attackCheck = item.system.attackFormula.checkType;
    const attackRange = item.system.attackFormula.rangeType;
    if (attackCheck === "attack" && attackRange === "melee") attackIcon = 'fa-gavel';
    if (attackCheck === "attack" && attackRange === "ranged") attackIcon = 'fa-crosshairs';
    if (attackCheck === "spell" && attackRange === "melee") attackIcon = 'fa-hand-sparkles';
    if (attackCheck === "spell" && attackRange === "ranged") attackIcon = 'fa-wand-magic-sparkles';
    const rollMod = item.system.attackFormula.rollModifier > 0 ? `+${item.system.attackFormula.rollModifier}` : item.system.attackFormula.rollModifier;
    const check = item.system.check;
    const checkDC = check.againstDC && check.checkDC ? ` (DC ${check.checkDC})` : ""; 
    const checkType = getLabelFromKey(item.system.check.checkKey, CONFIG.DC20RPG.ROLL_KEYS.allChecks);

    switch (actionType) {    
      case "attack": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.attackMod')}"><i class="fa-solid ${attackIcon}"></i><p> ${rollMod}</p></div>`;
        break;

      case "check": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.check')}"><i class="fa-solid fa-user-check"></i><p> ${checkType}${checkDC}</p></div>`;
        break;
    }

    if (sheetData.damageFormula !== "") content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.damage')}"><i class="fa-solid fa-droplet"></i><p> ${sheetData.damageFormula}</p></div>`;
    if (sheetData.healingFormula !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.healing')}"><i class="fa-solid fa-heart"></i><p> ${sheetData.healingFormula}</p></div>`;
    if (sheetData.otherFormula !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.other')}"><i class="fa-solid fa-gear"></i><p> ${sheetData.otherFormula}</p></div>`;
    if (sheetData.saves !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.save')}"><i class="fa-solid fa-shield"></i><p> ${sheetData.saves}</p></div>`;
    if (sheetData.contests !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.contest')}"><i class="fa-solid fa-hand-back-fist"></i><p> ${game.i18n.localize('dc20rpg.rollType.contest')} ${sheetData.contests}</p></div>`;
    return content;
  });

  Handlebars.registerHelper('item-properties', (item) => {
    return itemDetailsToHtml(item);
  });

  Handlebars.registerHelper('slot-printer', (slots, category, options) => {
    let content = "";
    if (!slots) return content;

    const sectionIcon = options.hash.sectionIcon;
    if (sectionIcon) {
      const section = `
      <div class="section-icon">
        <i class="${sectionIcon} fa-lg"></i>
      </div>`
      content += section;
    }

    for (const [key, slot] of Object.entries(slots)) {
      const img = slot.itemId ?
        `<img class="full" src="${slot.itemImg}" data-tooltip="${game.i18n.localize(slot.slotName)}: ${slot.itemName}"/>` :
        `<img class="empty" src="${slot.slotIcon}" data-tooltip="${game.i18n.localize(slot.slotName)}"/>`
      
      const deleteButton = !options.hash.editMode ? "" :
        `<a class="delete-slot fas fa-trash " data-tooltip="${game.i18n.localize("dc20rpg.sheet.slotDelete")}" data-key="${key}" data-category="${category}"></a>`;
      const defaultKeys = ["default", "mainHand", "offHand", "left", "right"]

      const itemClass = slot.itemId ? "item-edit editable" : "";
      const itemData = slot.itemId ? `data-item-id=${slot.itemId}` : "";

      content += ` 
      ${defaultKeys.includes(key) ? "" : deleteButton}
      <div class="slot ${itemClass}" ${itemData} data-key="${key}" data-category="${category}">
        ${img}
      </div>`;
    }

    if (!content) return content;
    return `
      <div class="slot-section ${sectionIcon ? "slot-bar" : ""}">
        ${content}
      </div>
    `;
  })

  Handlebars.registerHelper('cost-printer', (cost, resources=false, charges=false, quantity=false, showMinorAction=false) => costPrinter(cost, resources, charges, quantity, showMinorAction));

  Handlebars.registerHelper('item-config', (item, options) => {
    if (!item) return '';
    let component = '';

    const data = options.hash;
    const editModeConfig = data.editModeConfig ? data.editModeConfig.split(" ") : [];

    // Edit Mode
    if (data.editMode && editModeConfig.length > 0) {
      component += _addFavorite(editModeConfig, item);
      if (editModeConfig.includes("edit")) component += `<a class="item-edit fas fa-edit" data-tooltip="${game.i18n.localize('dc20rpg.sheet.items.editItem')}" data-item-id="${item._id}"></a>`;
      if (editModeConfig.includes("copy")) component += `<a class="item-copy fas fa-copy" data-tooltip="${game.i18n.localize('dc20rpg.sheet.items.copyItem')}" data-item-id="${item._id}"></a>`;
      if (editModeConfig.includes("delete")) component += `<a class="item-delete fas fa-trash" data-tooltip="${game.i18n.localize('dc20rpg.sheet.items.deleteItem')}" data-item-id="${item._id}"></a>`;
      return component;
    }

    const config = data.config ? data.config.split(" ") : [];

    // Macro
    if (config.includes("macro") && item.type !== "infusion") {
      const macros = item.system.macros;
      if (macros) {
        let onDemandTitle = "";
        let hasOnDemandMacro = false;
        for (const macro of Object.values(macros)) {
          if (macro.trigger === "onDemand" && !macro.disabled) {
            hasOnDemandMacro = true;
            if (onDemandTitle !== "") onDemandTitle += "<br>";
            onDemandTitle += macro.title;
          }
        }
        if (hasOnDemandMacro) {
          component +=  `<a class="run-on-demand-macro fas fa-code" data-tooltip="${onDemandTitle}" data-item-id="${item._id}"></a>`;
        }
      }
    }

    // Add/Remove Favorities
    component += _addFavorite(config, item);

    // Activable Effects
    if (config.includes("activable") && item.system.toggle?.toggleable) {
      const active = item.system.toggle.toggledOn ? 'fa-toggle-on' : 'fa-toggle-off';
      const title = item.system.toggle.toggledOn 
                  ? game.i18n.localize(`dc20rpg.sheet.itemTable.deactivateItem`)
                  : game.i18n.localize(`dc20rpg.sheet.itemTable.activateItem`);

      component += `<a class="item-toggle fa-lg fa-solid ${active}" data-tooltip="${title}" data-item-id="${item._id}" style="margin-top: 2px;"></a>`
    }

    // Can be equipped/attuned
    const statuses = item.system.statuses;
    if (config.includes("status") && statuses) {
      const equipped = statuses.equipped ? 'fa-solid' : 'fa-regular';
      const equippedTitle = statuses.equipped 
                          ? game.i18n.localize(`dc20rpg.sheet.itemTable.unequipItem`)
                          : game.i18n.localize(`dc20rpg.sheet.itemTable.equipItem`);
      
      component += `<a class="item-equip ${equipped} fa-suitcase-rolling" data-tooltip="${equippedTitle}" data-item-id="${item._id}" data-path="system.statuses.equipped"></a>`

      if (item.system.properties.attunement.active) {
        const attuned = statuses.attuned ? 'fa-solid' : 'fa-regular';
        const attunedTitle = statuses.attuned 
                            ? game.i18n.localize(`dc20rpg.sheet.itemTable.unattuneItem`)
                            : game.i18n.localize(`dc20rpg.sheet.itemTable.attuneItem`)
        
        component += `<a class="item-activable ${attuned} fa-hat-wizard" data-tooltip="${attunedTitle}" data-item-id="${item._id}" data-path="system.statuses.attuned"></a>`
      }
    }

    // Known Toggle
    if (config.includes("known")) {
      const knownLimit = item.system.knownLimit;
      const active = knownLimit ? 'fa-solid' : 'fa-regular';
      const title = data.navTab === "maneuvers" 
                    ? game.i18n.localize("dc20rpg.item.sheet.maneuver.countToLimitTitle")
                    : game.i18n.localize("dc20rpg.item.sheet.spell.countToLimitTitle")
      component += `<a class="item-activable ${active} fa-book" data-tooltip="${title}" data-item-id="${item._id}" data-path="system.knownLimit"></a>` 
    }

    return component;
  });
  function _addFavorite(config, item) {
    if (!config.includes("favorite")) return "";
    const isFavorite = item.flags.dc20rpg.favorite;
    const active = isFavorite ? 'fa-solid' : 'fa-regular';
    const title = isFavorite
                ? game.i18n.localize(`dc20rpg.sheet.itemTable.removeFavorite`)
                : game.i18n.localize(`dc20rpg.sheet.itemTable.addFavorite`);
    return `<a class="item-activable ${active} fa-star" data-tooltip="${title}" data-item-id="${item._id}" data-path="flags.dc20rpg.favorite"></a>`;
  }

  Handlebars.registerHelper('components', (item) => {
    let component = '';

    // Components
    const components = item.system.components || {};
    Object.entries(components).forEach(([key, cmp]) => {
      if (cmp.active) {
        let description = getLabelFromKey(key, CONFIG.DC20RPG.DROPDOWN_DATA.components);
        const letter = cmp.char;
        
        if (key === "material" && cmp.description) {
          const dsc = cmp.description ? `"${cmp.description}"` : "";
          const cost = cmp.cost ? ` (${cmp.cost} Gold)` : "";
          const consumes = cmp.consumed ? `<br>[${game.i18n.localize('dc20rpg.sheet.itemTable.consumeOnUse')}]` : "";
          description += `<br>${dsc}${cost}${consumes}`;
        }
        component += _descriptionChar(description, letter);
      }
    });

    const sustain = item.system.duration.type === "sustain";
    if (sustain) component += _descriptionIcon(getLabelFromKey("sustain", CONFIG.DC20RPG.DROPDOWN_DATA.durations), "fa-hand-holding-droplet");
    return component;
  });

  Handlebars.registerHelper('should-expand', (item, navTab) => {
    if (!["favorites", "main", "basic"].includes(navTab)) return 'expandable';

    let counter = 0;
    if (item.system.actionType === "dynamic") counter = 2;
    else counter = 1;

    const formulas = item.formulas;
    if (formulas) {
      let dmg = 0;
      let heal = 0;
      let other = 0;
      Object.values(formulas).forEach(formula => {
        switch(formula.category) {
          case "damage": dmg = 1; break;
          case "healing": heal = 1; break;
          case "other": other = 1; break;
        }
      });
      counter += (dmg + heal + other);
    }
    return counter > 2 ? 'expandable' : "";
  });

  Handlebars.registerHelper('action-type', (item) => {
    if (item.unidefined) return '';
    const system = item.system;
    switch (system.actionType) {
      case "attack": return _attack(system.attackFormula);
      case "check": return _check(system.check);
      default: return '';
    }
  });

  Handlebars.registerHelper('roll-requests', (item) => {
    if (item.unidefined) return '';
    const contests = [];
    const saves = [];

    const rollRequests = item.system.rollRequests;
    if (!rollRequests) return "";
    for (const request of Object.values(rollRequests)) {
      if (request.category === "save") saves.push(request);
      if (request.category === "contest") contests.push(request);
    }

    let component = "";
    if (saves.length > 0) component += _save(saves);
    if (contests.length > 0) component +=  _contest(contests);
    return component;
  });

  Handlebars.registerHelper('formula-rolls', (item) => {
    if (item.unidefined) return '';
    const formulas = item.formulas;
    if (!formulas) return '';

    const dmg = [];
    const heal = [];
    const other = [];
    Object.values(formulas).forEach(formula => {
      switch(formula.category) {
        case "damage": dmg.push(formula); break;
        case "healing": heal.push(formula); break;
        case "other": other.push(formula); break;
      }
    })
    let component = _formulas(dmg, "fa-droplet", CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes);
    component += _formulas(heal, "fa-heart", CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes);
    component += _formulas(other, "fa-gear", {});
    return component;
  });

  Handlebars.registerHelper('enhancement-mods', (enh) => {
    const mods = enh.modifications;
    let component = '';
    if (mods.addsNewRollRequest) {
      switch(mods.rollRequest.category) {
        case "save": component += _save([mods.rollRequest]); break;
        case "contest": component += _contest([mods.rollRequest]); break;
      }
    }
    if (mods.hasAdditionalFormula) {
      const description = `+${mods.additionalFormula} ${game.i18n.localize('dc20rpg.sheet.itemTable.additional')}`
      let char = mods.additionalFormula.replace(" ", "");
      if (!(char.includes("+") || char.includes("-"))) char = `+${char}`;
      component += _descriptionChar(description, `${char}`);
    }
    if (mods.modifiesCoreFormula) {
      const description = `${mods.coreFormulaModification} ${game.i18n.localize('dc20rpg.sheet.itemTable.coreFormulaModification')}`
      component += _descriptionIcon(description, "fa-dice");
    }
    if (mods.overrideTargetDefence) {
      const description = `${game.i18n.localize('dc20rpg.sheet.itemTable.overrideTargetDefence')}<br><b>${getLabelFromKey(mods.targetDefenceType, CONFIG.DC20RPG.DROPDOWN_DATA.defences)}</b>`;
      component += _descriptionIcon(description, "fa-share");
    }
    if (mods.overrideDamageType) {
      const description = `${game.i18n.localize('dc20rpg.sheet.itemTable.changeDamageType')} <b>${getLabelFromKey(mods.damageType, CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes)}</b>`
      component += _descriptionIcon(description, "fa-fire");
    }
    if (mods.addsNewFormula) {
      switch(mods.formula.category) {
        case "damage": component += _formulas([mods.formula], "fa-droplet", CONFIG.DC20RPG.DROPDOWN_DATA.damageTypes); break;
        case "healing": component += _formulas([mods.formula], "fa-heart", CONFIG.DC20RPG.DROPDOWN_DATA.healingTypes); break;
        case "other": component += _formulas([mods.formula], "fa-gear", {}); break;
      }
    }
    return component;
  });
}

function _attack(attack) {
  let icon = "fa-question";
  if (attack.checkType === "attack" && attack.rangeType === "melee") icon = 'fa-gavel';
  if (attack.checkType === "attack" && attack.rangeType === "ranged") icon = 'fa-crosshairs';
  if (attack.checkType === "spell" && attack.rangeType === "melee") icon = 'fa-hand-sparkles';
  if (attack.checkType === "spell" && attack.rangeType === "ranged") icon = 'fa-wand-magic-sparkles';
  const description = `${getLabelFromKey(attack.checkType + attack.rangeType, CONFIG.DC20RPG.DROPDOWN_DATA.checkRangeType)}<br>vs<br>${getLabelFromKey(attack.targetDefence, CONFIG.DC20RPG.DROPDOWN_DATA.defences)}`;
  return _descriptionIcon(`<p>${description}</p>`, icon);
}

function _save(saves) {
  let description = "";
  for(let i = 0; i < saves.length; i++) {
    description += `DC ${saves[i].dc} <b>${getLabelFromKey(saves[i].saveKey, CONFIG.DC20RPG.ROLL_KEYS.saveTypes)}</b>`;
    if (i !== saves.length - 1) description += "<br>or ";
  }
  return _descriptionIcon(`<p>${description}</p>`, 'fa-shield');
}

function _check(check) {
  const checkDC = (check.againstDC && check.checkDC) ? `DC ${check.checkDC} ` : "";
  const description = `${checkDC} <b>${getLabelFromKey(check.checkKey, CONFIG.DC20RPG.ROLL_KEYS.allChecks)}</b>`;
  return _descriptionIcon(`<p>${description}</p>`, 'fa-user-check');
}

function _contest(contests) {
  let description = "";
  for(let i = 0; i < contests.length; i++) {
    if (i === 0) description += game.i18n.localize('dc20rpg.rollType.contest') + ":<br>";
    description += `<b>${getLabelFromKey(contests[i].contestedKey, CONFIG.DC20RPG.ROLL_KEYS.contests)}</b>`;
    if (i !== contests.length - 1) description += "<br>or ";
  }
  return _descriptionIcon(`<p>${description}</p>`, 'fa-hand-back-fist');
}

function _formulas(formulas, icon, types) {
  if (formulas.length <= 0) return '';
  let description = '';
  for(let i = 0; i < formulas.length; i++) {
    if (i !== 0) description += '<br>+ ';
    const type = getLabelFromKey(formulas[i].type, types);
    const value = formulas[i].formula;
    description += `${value} ${type}`;
  }
  return _descriptionIcon(`<p>${description}</p>`, icon);
}

function _descriptionIcon(description, icon) {
  return `
  <div class="description-icon" title="">
    <div class="letter-circle-icon" data-tooltip="<span style='display:flex; text-align: center;'>${description}</span>">
      <i class="fa-solid ${icon}"></i>
    </div>
  </div>
  `
}

function _descriptionChar(description, char) {
  return `
  <div class="description-icon" title="">
    <div class="letter-circle-icon" data-tooltip="<span style='display:flex; text-align: center;'>${description}</span>">
      <span class="char">${char}</span>
    </div>
  </div>
  `
}

export function costPrinter(cost, resources=false, charges=false, quantity=false, showMinorAction=false) {
  let component = '';
  if (!cost) return "";
  if (resources) {
    for (const [key, resource] of Object.entries(cost.resources)) {
      const isMinor = key === "ap" && resource.amount === 0 && showMinorAction;
      if (resource.amount === 0 && !isMinor) continue;
      
      const weight = isMinor ? "fa-light" : "fa-solid";
      const icon = resource.custom ? `<img src=${resource.img} class="cost-img">` : `<i class="${resource.icon} ${weight}"></i>`;
      component += _toCost(key, icon, resource.amount, resource.label);
    }
  }

  if (charges) {
    for (const charge of Object.values(cost.charges)) {
      if (charge.amount === 0) continue;
      const icon = `<i class="${charge.icon} fa-solid"></i>`;
      const title = `Charges from: '${charge.itemName}'`;
      component += _toCost("charge", icon, charge.amount, title);
    }
  }

  if (quantity) {
    for (const quantity of Object.values(cost.quantity)) {
      if (quantity.amount === 0) continue;
      const icon = `<i class="${quantity.icon} fa-solid"></i>`;
      const title = `Quantity from: '${quantity.itemName}'`;
      component += _toCost("quantity", icon, quantity.amount, title);
    }
  }

  return component ? `<ul class="cost-printer">${component}</ul>` : "";
}

function _toCost(key, icon, amount, title) {
  const symbol = amount < 0 ? "<b class='symbol'>+</b>" : "";
  const number = Math.abs(amount) === 1 || Math.abs(amount) === 0 ? "" : `<b>${Math.abs(amount)}</b>`;
  return `<li class="cost ${key}" data-tooltip="${title}">${number}${icon}${symbol}</li>`;
}