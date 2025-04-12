import { createActorBrowser } from "../dialogs/compendium-browser/actor-browser.mjs";
import { createItemBrowser } from "../dialogs/compendium-browser/item-browser.mjs";

export function compendiumBrowserButton(html) {
  const itemButton =
  `<button class="open-item-browser" style="margin: 5px; width: -webkit-fill-available;">
    <i class="fa-solid fa-boxes-stacked"></i>
    Open Item Browser
  </button>`
  const actorButton = 
  `<button class="open-actor-browser" style="margin: 5px; width: -webkit-fill-available;">
    <i class="fa-solid fa-user"></i>
    Open Actor Browser
  </button>`
  
  const createActorButton = html.find(".header-search");
  createActorButton.before(itemButton);
  if (game.user.isGM) createActorButton.before(actorButton);
  html.find(".open-item-browser").click(() => createItemBrowser("weapon", false));
  html.find(".open-actor-browser").click(() => createActorBrowser())

  const compendiumFooter = html.find(".compendium-footer");
  for (const footer of compendiumFooter) {
    const comp = footer.children[0];
    if (comp && comp.textContent === " dc20rpg") {
      comp.innerHTML = "<i class='fa-solid fa-dice'></i> dc20";
    }
  }
  compendiumFooter[0].children[0].textContent
}