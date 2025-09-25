import { ActorRequestDialog, createActorRequestDialog, restRequest, rollRequest } from "./actor-request.mjs";
import { createConditionManager } from "./condition-manager.mjs";
import { createDmgCalculatorDialog } from "./dmg-calculator.mjs";
import { openAdventurersRegister } from "./adventurers-register.mjs";

export async function createGmToolsMenu() {
  const gmToolsWrapper = document.createElement('aside');
  gmToolsWrapper.id = "gm-tools";
  gmToolsWrapper.classList.add("faded-ui");
  
  const gmToolsMenu = document.createElement('menu');
  gmToolsMenu.classList.add("flexcol");
  gmToolsMenu.setAttribute('data-tooltip-direction', 'RIGHT');
  gmToolsMenu.setAttribute('data-application-part', 'layers');
  gmToolsMenu.style.gap= "8px";

  gmToolsMenu.appendChild(_conditionManager());
  gmToolsMenu.appendChild(_restDialog());
  gmToolsMenu.appendChild(_rollRequest());
  gmToolsMenu.appendChild(_adventurersRegister());
  // gmToolsMenu.appendChild(_dmgCalculator()); TODO: Improve calculator

  const ulLeftColumn = document.querySelector('#ui-left').querySelector('#ui-left-column-1');
  const players = ulLeftColumn.querySelector("#players");
  if (ulLeftColumn && players) {
    gmToolsWrapper.appendChild(gmToolsMenu);
    ulLeftColumn.insertBefore(gmToolsWrapper, players);
  }
}

function _restDialog() {
  const restDialogButton = _getButton("rest-request-button", "fa-bed", game.i18n.localize("dc20rpg.ui.sidebar.restRequest"));
  restDialogButton.addEventListener('click', ev => {
    ev.preventDefault();
    ActorRequestDialog.open("rest");
  });
  
  const wrapper = document.createElement('li');
  wrapper.appendChild(restDialogButton);
  return wrapper;
}

function _rollRequest() {
  const rollRequestButton = _getButton("roll-request-button", "fa-dice", game.i18n.localize("dc20rpg.ui.sidebar.rollRequest"));
  rollRequestButton.addEventListener('click', ev => {
    ev.preventDefault();
    ActorRequestDialog.open("roll", {basic: true, attribute: true, save: true, skill: true, trade: true});
  });

  const wrapper = document.createElement('li');
  wrapper.appendChild(rollRequestButton);
  return wrapper;
}

function _conditionManager() {
  const conditionManagerButton = _getButton("condition-manager-button", "fa-bolt", game.i18n.localize("dc20rpg.ui.sidebar.conditionManager"));
  conditionManagerButton.addEventListener('click', ev => {
    ev.preventDefault();
    createConditionManager();
  });
  
  const wrapper = document.createElement('li');
  wrapper.appendChild(conditionManagerButton);
  return wrapper;
}

function _adventurersRegister() {
  const adventurersRegisterButton = _getButton("condition-manager-button", "fa-book-open-cover", game.i18n.localize("dc20rpg.ui.sidebar.adventurersRegister"));
  adventurersRegisterButton.addEventListener('click', ev => {
    ev.preventDefault();
    openAdventurersRegister();
  });

  const wrapper = document.createElement('li');
  wrapper.appendChild(adventurersRegisterButton);
  return wrapper;
}

// TODO: Improve before you move it back
function _dmgCalculator() {
  const dmgCalculator = _getButton("dmg-calculator", "fa-calculator", game.i18n.localize("dc20rpg.ui.sidebar.dmgCalculator"));
  dmgCalculator.addEventListener('click', ev => {
    ev.preventDefault();
    createDmgCalculatorDialog();
  });

  const wrapper = document.createElement('li');
  wrapper.appendChild(dmgCalculator);
  return wrapper;
}

function _getButton(id, icon, title) {
  const button = document.createElement('button');
  button.id = id;
  button.classList.add(icon, "fa-solid", "gm-tool", "ui-control", "layer", "icon");
  button.setAttribute('aria-label', title);
  button.setAttribute('data-tooltip', '');
  return button;
}