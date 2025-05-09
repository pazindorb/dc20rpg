import { createActorBrowser } from "../dialogs/compendium-browser/actor-browser.mjs";
import { createItemBrowser } from "../dialogs/compendium-browser/item-browser.mjs";

export function compendiumBrowserButton(element) {
  const itemButton = document.createElement('button');
  itemButton.innerHTML = '<i class="fa-solid fa-boxes-stacked"></i> Open Item Browser'
  itemButton.title = 'Open Item Browser';
  itemButton.classList.add('open-item-browser');
  itemButton.addEventListener('click', () => createItemBrowser("weapon", false));

  const actorButton = document.createElement('button');
  actorButton.innerHTML = '<i class="fa-solid fa-user"></i> Open Actor Browser'
  actorButton.title = 'Open Actor Browser';
  actorButton.classList.add('open-actor-browser');
  actorButton.addEventListener('click', () => createActorBrowser());

  const headerActions = element.querySelector('.header-actions');
  headerActions.appendChild(itemButton);
  headerActions.appendChild(actorButton);
}