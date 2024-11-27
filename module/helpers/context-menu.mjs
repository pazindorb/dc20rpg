export function closeContextMenu(html) {
  const contextMenu = html.find('#context-menu');
  if (contextMenu[0]) contextMenu[0].style.visibility = "hidden";
}

export function itemContextMenu(item, event, html) {
  if (item.type === "basicAction") return; // We dont want to open context menu for basic actions

  // Prepare content
  let content = '';
  content += `<a class="elem item-edit" data-item-id="${item._id}"><i class="fas fa-edit"></i><span>${game.i18n.localize('dc20rpg.sheet.items.editItem')}</span></a>`;
  if (!["ancestry", "class", "subclass", "background"].includes(item.type)) 
    content += `<a class="elem item-copy" data-item-id="${item._id}"><i class="fas fa-copy"></i><span>${game.i18n.localize('dc20rpg.sheet.items.copyItem')}</span></a>`;
  content += `<a class="elem item-delete" data-item-id="${item._id}"><i class="fas fa-trash"></i><span>${game.i18n.localize('dc20rpg.sheet.items.deleteItem')}</span></a>`;
  _showContextMenu(content, event, html, item);
}

function _showContextMenu(content, event, html, item) {
  event.preventDefault();
  const contextMenu = html.find('#context-menu');

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
}