import { getActionsAsTables } from "../actors/actions.mjs";
import { DC20RPG } from "../config.mjs";
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
    let hasItem = "empty";
    let dataItemId = '';
    let showTooltip = '';
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
    <div class="unique-item ${itemType} ${hasItem} ${showTooltip}" title=${title} ${dataItemId}>
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

  Handlebars.registerHelper('size', (sizeType) => {
    let short = "";
    switch (sizeType) {
      case "tiny": short = "T"; break;
      case "small": short = "S"; break;
      case "medium": short = "M"; break;
      case "mediumLarge": short = "L"; break;
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

  Handlebars.registerHelper('show-hide-toggle', (flag, path, oneliner) => {
    let icon = flag ? "fa-eye-slash" : "fa-eye";
    if (oneliner === "true") icon = flag ? "fa-table" : "fa-table-list";
    return `<a class="activable fa-solid ${icon}" data-path="${path}"></a>`;
  });

  Handlebars.registerHelper('action-table', () => {
    const partialPath = allPartials()["Action Table"];
    const template = Handlebars.partials[partialPath];
    if (template) {
      const actions = getActionsAsTables();
      const context = {
        actions: actions
      }
      return new Handlebars.SafeString(template(context));
    }
    return '';
  });

  Handlebars.registerHelper('item-table', (editMode, items, navTab, weaponsOnActor) => {
    const partialPath = allPartials()["Item Table"];
    const template = Handlebars.partials[partialPath];
    if (template) {
      const context = {
        editMode: editMode,
        navTab: navTab,
        items: items,
        weaponsOnActor: weaponsOnActor
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

  Handlebars.registerHelper('grid-template', (navTab, isHeader, rollMenuRow) => {
    const headerOrder = isHeader  ? "35px" : '';

    if (navTab === "favorites" || navTab === "main") {
      const rollMenuPart1 = rollMenuRow ? '' : "50px";
      const rollMenuPart2 = rollMenuRow ? "30px" : "40px";
      const enhNumber = rollMenuRow ? "35px" : "";
      return `grid-template-columns: ${headerOrder}${enhNumber} 1fr ${rollMenuPart1} 70px 70px ${rollMenuPart2};`;
    }
    if (rollMenuRow) {
      return `grid-template-columns: 35px 1fr 70px 120px 60px;`;
    }
    const inventoryTab = navTab === "inventory" ? "35px 40px" : '';
    const spellTab = navTab === "spells" ? "120px" : '';
    return `grid-template-columns: ${headerOrder} 1fr ${spellTab}${inventoryTab} 50px 70px 70px 120px 70px;`;
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
    if (actionType === "tradeSkill") {
      const tradeSkill = getLabelFromKey(item.system.tradeSkillKey, DC20RPG.tradeSkills);
      const rollBonus = item.system.rollBonus > 0 ? `+${item.system.rollBonus}` : item.system.rollBonus;
      return `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.tradeSkill')}"><i class="fa-solid fa-toolbox"></i><p> ${tradeSkill} ${rollBonus}</p></div>`;
    }

    let content = '';
    let attackIcon = 'fa-question';
    const attackCheck = item.system.attackFormula.checkType;
    const attackRange = item.system.attackFormula.rangeType;
    if (attackCheck === "attack" && attackRange === "melee") attackIcon = 'fa-gavel';
    if (attackCheck === "attack" && attackRange === "ranged") attackIcon = 'fa-crosshairs';
    if (attackCheck === "spell" && attackRange === "melee") attackIcon = 'fa-hand-sparkles';
    if (attackCheck === "spell" && attackRange === "ranged") attackIcon = 'fa-wand-magic-sparkles';
    const rollMod = item.system.attackFormula.rollModifier > 0 ? `+${item.system.attackFormula.rollModifier}` : item.system.attackFormula.rollModifier;
    const saveType = getLabelFromKey(item.system.save.type, DC20RPG.saveTypes);
    const saveDC = item.system.save.dc;
    const failSaveEffect = item.system.save.failEffect ? ` vs ${getLabelFromKey(item.system.save.failEffect, DC20RPG.failedSaveEffects)}` : "";
    const checkDC = item.system.check.checkDC;
    const checkType = getLabelFromKey(item.system.check.checkKey, DC20RPG.contests);
    const contested = getLabelFromKey(item.system.check.contestedKey, DC20RPG.contests);

    switch (actionType) {
      case "dynamic": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.attackMod')}"><i class="fa-solid ${attackIcon}"></i><p> ${rollMod}</p></div>`;
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.save')}"><i class="fa-solid fa-shield"></i><p> ${saveType} (DC ${saveDC})${failSaveEffect}</p></div>`;
        break;
      
      case "attack": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.attackMod')}"><i class="fa-solid ${attackIcon}"></i><p> ${rollMod}</p></div>`;
        break;

      case "save": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.save')}"><i class="fa-solid fa-shield"></i><p> ${saveType} (DC ${saveDC})${failSaveEffect}</p></div>`;
        break;

      case "check": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.check')}"><i class="fa-solid fa-user-check"></i><p> ${checkType} (DC ${checkDC})</p></div>`;
        break;

      case "contest": 
        content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.contest')}"><i class="fa-solid fa-hand-back-fist"></i><p> ${checkType} vs ${contested}</p></div>`;
        break;
    }

    if (sheetData.damageFormula !== "") content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.damage')}"><i class="fa-solid fa-droplet"></i><p> ${sheetData.damageFormula}</p></div>`;
    if (sheetData.healingFormula !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.healing')}"><i class="fa-solid fa-heart"></i><p> ${sheetData.healingFormula}</p></div>`;
    if (sheetData.otherFormula !== "")content += `<div class="wrapper" title="${game.i18n.localize('dc20rpg.item.sheet.header.other')}"><i class="fa-solid fa-gear"></i><p> ${sheetData.otherFormula}</p></div>`;
    return content;
  });

  Handlebars.registerHelper('item-properties', (item) => {
    return itemDetailsToHtml(item);
  });

  Handlebars.registerHelper('cost-printer', (costs, mergeAmount, enh) => {
    if (!costs) return '';

    let component = '';
    const icons = {
      actionPoint: "ap fa-dice-d6",
      stamina: "sp fa-hand-fist",
      mana: "mp fa-star",
      health: "hp fa-heart"
    }
    if (typeof costs === 'number') return _printNonZero(costs, mergeAmount, icons["actionPoint"]);

    // Print core resources
    Object.entries(costs).forEach(([key, resCost]) => {
      const cost = resCost?.cost || resCost;
      switch (key) {
        case "custom": break;
        case "actionPoint":
          component += _printWithZero(cost, mergeAmount, icons[key]);
          break;
        default: 
          component += _printNonZero(cost, mergeAmount, icons[key]);
          break;
      }
    });

    if (!costs.custom) return component;
    // Print custom resources
    Object.values(costs.custom).forEach(resource => {
      component += _printImg(resource.value, mergeAmount, resource.img);
    });
    return component;
  });

  Handlebars.registerHelper('item-config', (item, editMode, tab) => {
    if (!item) return '';
    let component = '';

    // Configuration 
    if (editMode && tab !== "favorites") {
      component += `<a class="item-edit fas fa-edit" title="${game.i18n.localize('dc20rpg.sheet.items.editItem')}" data-item-id="${item._id}"></a>`;
      component += `<a class="item-copy fas fa-copy" title="${game.i18n.localize('dc20rpg.sheet.items.copyItem')}" data-item-id="${item._id}"></a>`;
      component += `<a class="item-delete fas fa-trash" title="${game.i18n.localize('dc20rpg.sheet.items.deleteItem')}" data-item-id="${item._id}"></a>`;
      return component;
    }

    // On Demand Item Macro
    if (item.system.macros?.onDemand) {
      component +=  `<a class="run-on-demand-macro fas fa-code" title="${item.system.macros.onDemandMacroTitle}" data-item-id="${item._id}"></a>`;
    }

    // Activable Effects
    if (item.system.toggleable) {
      const active = item.system.toggledOn ? 'fa-toggle-on' : 'fa-toggle-off';
      const title = item.system.toggledOn 
                  ? game.i18n.localize(`dc20rpg.sheet.itemTable.deactivateItem`)
                  : game.i18n.localize(`dc20rpg.sheet.itemTable.activateItem`);

      component += `<a class="item-activable fa-lg fa-solid ${active}" title="${title}" data-item-id="${item._id}" data-path="system.toggledOn" style="margin-top: 2px;"></a>`
    }

    // Can be equipped/attuned
    const statuses = item.system.statuses;
    if (statuses) {
      const equipped = statuses.equipped ? 'fa-solid' : 'fa-regular';
      const equippedTitle = statuses.equipped 
                          ? game.i18n.localize(`dc20rpg.sheet.itemTable.unequipItem`)
                          : game.i18n.localize(`dc20rpg.sheet.itemTable.equipItem`);
      
      component += `<a class="item-activable ${equipped} fa-suitcase-rolling" title="${equippedTitle}" data-item-id="${item._id}" data-path="system.statuses.equipped"></a>`

      if (item.system.properties.attunement.active) {
        const attuned = statuses.attuned ? 'fa-solid' : 'fa-regular';
        const attunedTitle = statuses.attuned 
                            ? game.i18n.localize(`dc20rpg.sheet.itemTable.unattuneItem`)
                            : game.i18n.localize(`dc20rpg.sheet.itemTable.attuneItem`)
        
        component += `<a class="item-activable ${attuned} fa-hat-wizard" title="${attunedTitle}" data-item-id="${item._id}" data-path="system.statuses.attuned"></a>`
      }
    }
    if (tab === "favorites" || tab === "main") return component;

    const isFavorite = item.flags.dc20rpg.favorite;
    const active = isFavorite ? 'fa-solid' : 'fa-regular';
    const title = isFavorite
                ? game.i18n.localize(`dc20rpg.sheet.itemTable.removeFavorite`)
                : game.i18n.localize(`dc20rpg.sheet.itemTable.addFavorite`);

    component += `<a class="item-activable ${active} fa-star" title="${title}" data-item-id="${item._id}" data-path="flags.dc20rpg.favorite"></a>`
    return component;
  });

  Handlebars.registerHelper('components', (item) => {
    let component = '';

    // Components
    Object.entries(item.system.components).forEach(([key, cmp]) => {
      if (cmp.active) {
        let description = getLabelFromKey(key, DC20RPG.components);
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

    // Concentration
    const concentration = item.system.duration.type === "concentration";
    if (concentration) component += _descriptionChar(getLabelFromKey("concentration", DC20RPG.durations), "C");
    return component;
  });

  Handlebars.registerHelper('should-expand', (item, navTab) => {
    if (!["favorites"].includes(navTab)) return 'expandable';

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
      case "dynamic": return _dynamicAttackSave(system.attackFormula, system.save);
      case "attack": return _attack(system.attackFormula);
      case "save": return _save(system.save);
      case "check": return _check(system.check);
      case "contest": return _contest(system.check);
      default: return '';
    }
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
    let component = _formulas(dmg, "fa-droplet", DC20RPG.damageTypes);
    component += _formulas(heal, "fa-heart", DC20RPG.healingTypes);
    component += _formulas(other, "fa-gear", {});
    return component;
  });

  Handlebars.registerHelper('enhancement-mods', (enh, actionType) => {
    const mods = enh.modifications;
    let component = '';
    if (mods.overrideSave && ["dynamic", "attack", "save"].includes(actionType)) component += _save(mods.save);
    if (mods.hasAdditionalFormula) {
      const description = `+${mods.additionalFormula} ${game.i18n.localize('dc20rpg.sheet.itemTable.additional')}`
      component += _descriptionChar(description, `+${mods.additionalFormula}`);
    }
    if (mods.overrideDamageType) {
      const description = `${game.i18n.localize('dc20rpg.sheet.itemTable.changeDamageType')} <i>${getLabelFromKey(mods.damageType, DC20RPG.damageTypes)}</i>`
      component += _descriptionIcon(description, "fa-fire");
    }
    if (mods.addsNewFormula) {
      switch(mods.formula.category) {
        case "damage": component += _formulas([mods.formula], "fa-droplet", DC20RPG.damageTypes); break;
        case "healing": component += _formulas([mods.formula], "fa-heart", DC20RPG.healingTypes); break;
      }
    }
    return component;
  });
}

Handlebars.registerHelper('should-expand-enh', (enh, navTab, actionType) => {
  if (!["favorites"].includes(navTab)) return 'expandable';
  const mods = enh.modifications;
  let counter = 0;
  if (mods.overrideSave && ["dynamic", "attack", "save"].includes(actionType)) counter++;
  if (mods.hasAdditionalFormula) counter++;
  if (mods.overrideDamageType) counter++
  if (mods.addsNewFormula) counter++
  return counter > 2 ? 'expandable' : "";
});

function _printWithZero(cost, mergeAmount, icon) {
  if (cost === undefined) return '';
  if (cost === 0) return `<i class="${icon} fa-light cost-icon"></i>`;
  const costIconHtml = cost < 0 ? `<i class="${icon} fa-solid cost-icon">+</i>` : `<i class="${icon} fa-solid cost-icon"></i>`;
  return _print(Math.abs(cost), mergeAmount, costIconHtml);
}

function _printNonZero(cost, mergeAmount, icon) {
  if (!cost) return '';
  const costIconHtml = cost < 0 ? `<i class="${icon} fa-solid cost-icon">+</i>` : `<i class="${icon} fa-solid cost-icon"></i>`;
  return _print(Math.abs(cost), mergeAmount, costIconHtml);
}

function _printImg(cost, mergeAmount, iconPath) {
  if (!cost) return '';
  const costImg = cost < 0 ? `<img src=${iconPath} class="cost-img">+` : `<img src=${iconPath} class="cost-img">`;
  return _print(Math.abs(cost), mergeAmount, costImg);
}

function _print(cost, mergeAmount, costIconHtml) {
  if (mergeAmount > 4 && cost > 1) return `<b>${cost}x</b>${costIconHtml}`;
  let pointsPrinter = "";
  for (let i = 1; i <= cost; i ++) pointsPrinter += costIconHtml;
  return pointsPrinter;
}

function _dynamicAttackSave(attack, save) {
  const attackPart = _attack(attack);
  const savePart = _save(save);
  return attackPart + savePart;
}


function _attack(attack) {
  let icon = "fa-question";
  if (attack.checkType === "attack" && attack.rangeType === "melee") icon = 'fa-gavel';
  if (attack.checkType === "attack" && attack.rangeType === "ranged") icon = 'fa-crosshairs';
  if (attack.checkType === "spell" && attack.rangeType === "melee") icon = 'fa-hand-sparkles';
  if (attack.checkType === "spell" && attack.rangeType === "ranged") icon = 'fa-wand-magic-sparkles';
  const description = `${getLabelFromKey(attack.checkType + attack.rangeType, DC20RPG.checkRangeType)}<br>vs<br>${getLabelFromKey(attack.targetDefence, DC20RPG.defences)}`;
  return _descriptionIcon(description, icon);
}


function _save(save) {
  const failSaveEffect = save.failEffect ? `<br>vs<br>${getLabelFromKey(save.failEffect, DC20RPG.failedSaveEffects)}` : "";
  const description = `DC ${save.dc} ${getLabelFromKey(save.type, DC20RPG.saveTypes)} ${game.i18n.localize('dc20rpg.rollType.save')}${failSaveEffect}`;
  return _descriptionIcon(description, 'fa-shield');
}

function _check(check) {
  const description = `DC ${check.checkDC} ${getLabelFromKey(check.checkKey, DC20RPG.checks)}`;
  return _descriptionIcon(description, 'fa-user-check');
}

function _contest(check) {
  const description = `${getLabelFromKey(check.checkKey, DC20RPG.checks)}<br>vs<br>${getLabelFromKey(check.contestedKey, DC20RPG.contests)}`;
  return _descriptionIcon(description, 'fa-hand-back-fist');
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
  return _descriptionIcon(description, icon);
}

function _descriptionIcon(description, icon) {
  return `
  <div class="description-icon" title="">
    <div class="letter-circle-icon">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="description">
      <div class="description-wrapper"> 
        <span>${description}</span>
      </div>
    </div>
  </div>
  `
}

function _descriptionChar(description, char) {
  return `
  <div class="description-icon" title="">
    <div class="letter-circle-icon">
      <span class="char">${char}</span>
    </div>
    <div class="description">
      <div class="description-wrapper"> 
        <span>${description}</span>
      </div>
    </div>
  </div>
  `
}