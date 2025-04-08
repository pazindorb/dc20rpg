import { createActorRequestDialog, restRequest, rollRequest } from "./actor-request.mjs";
import { createDmgCalculatorDialog } from "./dmg-calculator.mjs";

export async function createGmToolsMenu() {
  const gmToolsMenu = document.createElement('div');
  gmToolsMenu.id = "gm-tools";
  gmToolsMenu.appendChild(_restDialog());
  gmToolsMenu.appendChild(_rollReaquestButton());
  gmToolsMenu.appendChild(_dmgCalculator());

  const uiRightSidebar = document.querySelector('#ui-right').querySelector('#sidebar');
  if (uiRightSidebar) {
    uiRightSidebar.appendChild(gmToolsMenu);
  }
}

function _restDialog() {
  const restDialog = document.createElement('a');
  restDialog.innerHTML = '<i class="fa-solid fa-bed"></i>';
  restDialog.id = 'rest-request-button';
  restDialog.classList.add("gm-tool");
  restDialog.title = game.i18n.localize("dc20rpg.ui.sidebar.restRequest");

  restDialog.addEventListener('click', ev => {
    ev.preventDefault();
    createActorRequestDialog("Start Resting for", CONFIG.DC20RPG.DROPDOWN_DATA.restTypes, restRequest, true);
  });
  return restDialog;
}

function _rollReaquestButton() {
  const rollRequestButton = document.createElement('a');
  rollRequestButton.innerHTML = '<i class="fa-solid fa-dice"></i>';
  rollRequestButton.id = 'roll-request-button';
  rollRequestButton.classList.add("gm-tool");
  rollRequestButton.title = game.i18n.localize("dc20rpg.ui.sidebar.rollRequest");

  rollRequestButton.addEventListener('click', ev => {
    ev.preventDefault();
    createActorRequestDialog("Roll Request", CONFIG.DC20RPG.ROLL_KEYS.contests, rollRequest, false);
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
    createDmgCalculatorDialog();
  });
  return dmgCalculator;
}