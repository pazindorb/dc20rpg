import { splitItem } from "./actors/itemsOnActor.mjs";
import { datasetOf } from "./listenerEvents.mjs";
import { getValueFromPath } from "./utils.mjs";

export function closeContextMenu(html) {
  const contextMenu = html.find('#context-menu');
  if (contextMenu[0]) contextMenu[0].style.visibility = "hidden";
}

export function itemContextMenu(item, event, html, actorType) {
  if (actorType === "storage") {
    if (item.system.stackable) {
      const split = `<a class="elem item-split"><i class="fas fa-object-ungroup"></i><span>${game.i18n.localize('dc20rpg.sheet.items.splitItem')}</span></a>`;
      return _showContextMenu(split, event, html, item);
    }
    else return;
  }

  if (item.type === "basicAction") return; // We dont want to open context menu for basic actions

  // Prepare content
  let content = '';

  // Edit/Remove Item
  content += `<a class="elem item-edit"><i class="fas fa-edit"></i><span>${game.i18n.localize('dc20rpg.sheet.items.editItem')}</span></a>`;
  if (!["ancestry", "class", "subclass", "background"].includes(item.type)) {
    content += `<a class="elem item-copy"><i class="fas fa-copy"></i><span>${game.i18n.localize('dc20rpg.sheet.items.copyItem')}</span></a>`;
  }
  if (item.system.stackable) {
    content += `<a class="elem item-split"><i class="fas fa-object-ungroup"></i><span>${game.i18n.localize('dc20rpg.sheet.items.splitItem')}</span></a>`;
  }
  content += `<a class="elem item-delete"><i class="fas fa-trash"></i><span>${game.i18n.localize('dc20rpg.sheet.items.deleteItem')}</span></a>`;
  
  // Prepare Equip/Attune
  const statuses = item.system.statuses;
  if (statuses) {
    const equippedTitle = statuses.equipped ? game.i18n.localize(`dc20rpg.sheet.itemTable.unequipItem`) : game.i18n.localize(`dc20rpg.sheet.itemTable.equipItem`);
    content += `<a class="elem item-activable" data-path="system.statuses.equipped"><i class="fa-solid fa-suitcase-rolling"></i><span>${equippedTitle}</span></a>`;

    if (item.system.properties.attunement.active) {
      const attunedTitle = statuses.attuned ? game.i18n.localize(`dc20rpg.sheet.itemTable.unattuneItem`) : game.i18n.localize(`dc20rpg.sheet.itemTable.attuneItem`);
      content += `<a class="elem item-activable" data-path="system.statuses.attuned"><i class="fa-solid fa-hat-wizard"></i><span>${attunedTitle}</span></a>`;
    }
  }

  // Mark Favorite
  if (!["ancestry", "class", "subclass", "background"].includes(item.type)) {
    const favoriteTitle = item.flags.dc20rpg.favorite ? game.i18n.localize(`dc20rpg.sheet.itemTable.removeFavorite`) : game.i18n.localize(`dc20rpg.sheet.itemTable.addFavorite`);
    content += `<a class="elem item-activable" data-path="flags.dc20rpg.favorite"><i class="fa-solid fa-star"></i><span>${favoriteTitle}</span></a>`;
  }
  _showContextMenu(content, event, html, item);
}

function _showContextMenu(content, event, html, item) {
  event.preventDefault();
  const contextMenu = html.find('#context-menu');
  if (!contextMenu[0]) return;

  // Fill Content
  contextMenu.html(content);

  // Set position
  const x = event.pageX;
  const y = event.pageY;
  contextMenu[0].style.left = (x + 10) + "px";
  contextMenu[0].style.top = (y + 6) + "px";

  _addEventListener(contextMenu, item)

  // Show Menu
  contextMenu[0].style.visibility = "visible";
}

function _addEventListener(contextMenu, item) {
  contextMenu.find('.item-delete').click(() => item.delete());
  contextMenu.find('.item-edit').click(() => item.sheet.render(true));
  contextMenu.find('.item-copy').click(() => Item.create(item, { parent: item.parent }));
  contextMenu.find('.item-split').click(() => splitItem(item));
  contextMenu.find('.item-activable').click((ev) => {
    const path = datasetOf(ev).path;
    let value = getValueFromPath(item, path);
    item.update({[path]: !value});
  });
}