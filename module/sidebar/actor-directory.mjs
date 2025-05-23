import { characterCreationWizardDialog } from "../subsystems/character-progress/character-creation/character-creation-wizard.mjs";

export function characterWizardButton(element) {
  const button = document.createElement('button');
  button.innerHTML = '<i class="fa-solid fa-hat-wizard"></i> Open Character Creation Wizard'
  button.title = 'Open Character Creation Wizard';
  button.classList.add('character-creation-wizard');
  button.addEventListener('click', () => characterCreationWizardDialog());

  const headerActions = element.querySelector('.header-actions');
  headerActions.appendChild(button);
}