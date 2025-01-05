import { createActorBrowser } from "../dialogs/actor-browser.mjs";
import { createCompendiumBrowser } from "../dialogs/compendium-browser.mjs";

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
  html.find(".open-item-browser").click(() => createCompendiumBrowser("weapon", false));
  html.find(".open-actor-browser").click(() => createActorBrowser())
}