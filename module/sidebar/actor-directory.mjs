import { characterCreationWizardDialog } from "../subsystems/character-progress/character-creation/character-creation-wizard.mjs";

export function characterWizardButton(html) {
  const button = `${
  `<button class="character-creation-wizard" style="margin: 5px; width: -webkit-fill-available;">
    <i class="fa-solid fa-hat-wizard"></i>
    Open Character Creation Wizard
  </button>`
  }`
  
  const createActorButton = html.find(".header-search");
  createActorButton.before(button);
  html.find(".character-creation-wizard").click(() => characterCreationWizardDialog())
}