import { createCompendiumBrowser } from "../dialogs/compendium-browser.mjs";

export function compendiumBrowserButton(html) {
  const button = `${
  `<button class="open-compendium-browser" style="margin: 5px; width: -webkit-fill-available;">
    <i class="fa-solid fa-book-atlas"></i>
    Open Compendium Browser
  </button>`
  }`
  
  const createActorButton = html.find(".header-search");
  createActorButton.before(button);
  html.find(".open-compendium-browser").click(() => createCompendiumBrowser("weapon", false));
}