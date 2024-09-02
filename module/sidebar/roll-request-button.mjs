import { createRollRequestDialog } from "../dialogs/roll-request.mjs";

export async function createRollRequestButton() {
  const rollRequestButton = document.createElement('a');
  rollRequestButton.innerHTML = '<i class="fa-solid fa-dice fa-2x"></i>';
  rollRequestButton.id = 'roll-request-button';
  rollRequestButton.title = game.i18n.localize("dc20rpg.ui.sidebar.rollRequest")

  rollRequestButton.addEventListener('click', ev => {
    ev.preventDefault();
    createRollRequestDialog();
  });

  const uiRightSidebar = document.querySelector('#ui-right').querySelector('#sidebar');
  if (uiRightSidebar) uiRightSidebar.appendChild(rollRequestButton);
}