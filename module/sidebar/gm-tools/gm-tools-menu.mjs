import { ActorRequestDialog } from "./actor-request.mjs";
import { createConditionManager } from "./condition-manager.mjs";
import { openAdventurersRegister } from "./adventurers-register.mjs";
import { SimplePopup } from "../../dialogs/simple-popup.mjs";
import { getSelectedTokens } from "../../helpers/actors/tokens.mjs";
import { prepareHelpAction } from "../../helpers/actors/actions.mjs";
import { DamageCalculator } from "./dmg-calculator.mjs";

export async function createGmToolsMenu() {
  const gmToolsWrapper = document.createElement('aside');
  gmToolsWrapper.id = "gm-tools";
  gmToolsWrapper.classList.add("faded-ui");
  
  const gmToolsMenu = document.createElement('menu');
  gmToolsMenu.classList.add("flexcol");
  gmToolsMenu.setAttribute('data-tooltip-direction', 'RIGHT');
  gmToolsMenu.setAttribute('data-application-part', 'layers');
  gmToolsMenu.style.gap= "8px";

  gmToolsMenu.appendChild(_dmgCalculator());
  gmToolsMenu.appendChild(_conditionManager());
  gmToolsMenu.appendChild(_helpManager());
  gmToolsMenu.appendChild(_restDialog());
  gmToolsMenu.appendChild(_rollRequest());
  gmToolsMenu.appendChild(_adventurersRegister());

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

function _helpManager() {
  const helpManager = _getButton("help-manager", "fa-dice-d8", game.i18n.localize("dc20rpg.ui.sidebar.helpManager"));
  helpManager.addEventListener('click', async ev => {
    ev.preventDefault();
    const tokens = getSelectedTokens();
    if (tokens.lenght === 0) return;
    
    const data = {
      header: "Help Manager",
      message: game.i18n.localize("dc20rpg.sheet.help.helpHint"),
      inputs: [
        {
          label: game.i18n.localize("dc20rpg.sheet.help.helpDice"),
          type: "select",
          options: {
            8: "d8", 6: "d6", 4: "d4", 10: "d10", 12: "d12",
            [-8]: "-d8", [-6]: "-d6", [-4]: "-d4", [-10]: "-d10", [-12]: "-d12",
          }
        },
        {
          label: game.i18n.localize("dc20rpg.sheet.help.duration"),
          type: "select",
          options: CONFIG.DC20RPG.DROPDOWN_DATA.helpDiceDuration,
        }
      ]
    }
    const selected = await SimplePopup.open("input", data);
    const value = parseInt(selected[0]);
    if (isNaN(value)) return;

    const duration = selected[1];
    for (const token of tokens) {
      if (token.actor) prepareHelpAction(token.actor, {
        diceValue: Math.abs(value), 
        subtract: value < 0,
        duration: duration
      });
    }
  });

  const wrapper = document.createElement('li');
  wrapper.appendChild(helpManager);
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
    DamageCalculator.open();
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