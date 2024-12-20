import { createDmgCalculatorDialog } from "../dialogs/dmg-calculator.mjs";
import { createRollRequestDialog } from "../dialogs/roll-request.mjs";

export async function createGmToolsMenu() {
  const gmToolsMenu = document.createElement('div');
  gmToolsMenu.id = "gm-tools";
  gmToolsMenu.appendChild(_rollReaquestButton());
  gmToolsMenu.appendChild(_dmgCalculator());

  const uiRightSidebar = document.querySelector('#ui-right').querySelector('#sidebar');
  if (uiRightSidebar) {
    uiRightSidebar.appendChild(gmToolsMenu);
  }
}

function _rollReaquestButton() {
  const rollRequestButton = document.createElement('a');
  rollRequestButton.innerHTML = '<i class="fa-solid fa-dice"></i>';
  rollRequestButton.id = 'roll-request-button';
  rollRequestButton.classList.add("gm-tool");
  rollRequestButton.title = game.i18n.localize("dc20rpg.ui.sidebar.rollRequest");

  rollRequestButton.addEventListener('click', ev => {
    ev.preventDefault();
    createRollRequestDialog();
  });
  return rollRequestButton;
}

function _dmgCalculator() {
  const dmgCalculator = document.createElement('a');
  dmgCalculator.innerHTML = '<i class="fa-solid fa-calculator"></i>';
  dmgCalculator.id = 'dmg-calculator';
  dmgCalculator.classList.add("gm-tool");
  dmgCalculator.title = game.i18n.localize("dc20rpg.ui.sidebar.dmgCalculator");

  dmgCalculator.addEventListener('click', ev => {
    ev.preventDefault();
    createDmgCalculatorDialog()
  });
  return dmgCalculator;
}