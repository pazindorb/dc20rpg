import { MonsterCreatorDialog } from "../dialogs/monster-creator.mjs";
import { characterCreationWizardDialog } from "../subsystems/character-progress/character-creation/character-creation-wizard.mjs";

export function actorCreatorButton(element) {
  const headerActions = element.querySelector('.header-actions');
  headerActions.style.display = "grid";
  headerActions.style.gridTemplateColumns = "1fr 1fr"
  
  
  // Character Creation Wizard
  const characterCreation = document.createElement('button');
  characterCreation.innerHTML = '<i class="fa-solid fa-hat-wizard"></i> Character Creation Wizard'
  characterCreation.title = 'Character Creation Wizard';
  characterCreation.classList.add('character-creation-wizard');
  if (!game.user.isGM) characterCreation.style.gridColumnEnd = "span 2";
  characterCreation.addEventListener('click', () => characterCreationWizardDialog());
  headerActions.appendChild(characterCreation);

  // Monster Creator
  if (game.user.isGM) {
    const monsterCreator = document.createElement('button');
    monsterCreator.innerHTML = '<i class="fa-solid fa-dragon"></i> Monster Creator'
    monsterCreator.title = 'Monster Creator';
    monsterCreator.classList.add('monster-creator');
    monsterCreator.addEventListener('click', () => MonsterCreatorDialog.open());
    headerActions.appendChild(monsterCreator);
  }
}