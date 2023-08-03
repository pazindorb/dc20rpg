import { rollForTokens } from "../helpers/actors/tokens.mjs";
import { DC20RPG } from "../helpers/config.mjs";

//================================================
//          Chat Message Initialization          =
//================================================
export function initChatMessage(html) {
  // Registering listeners for chat log
  _addChatListeners(html);
  _addCoreFormulaSeparator(html);
}

function _addChatListeners(html) {

  // Show/Hide description
  html.find('.show-hide-description').click(event => {
    event.preventDefault();
    const description = event.target.closest(".chat-roll-card").querySelector(".chat-description");
    if(description) description.classList.toggle('hidden');
  });

  // Roll save for selected targets 
  html.find('.roll-save').click(event => rollForTokens(event, "save"));
  html.find('.roll-check').click(event => rollForTokens(event, "check"));
}

function _addCoreFormulaSeparator(html) {
  html.find('.core-roll').last().after("<hr>");
  html.find('.formula-roll').last().after("<hr>");
}

//==============================================
//          Creating New Chat Message          =
//==============================================
export async function createChatMessage(actor, data, templateSource, rolls) {
  const template = await _renderChatTemplate(templateSource, data);
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    rollMode: game.settings.get('core', 'rollMode'),
    content: template,
    rolls: rolls,
    sound: CONFIG.sounds.dice,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL
  });
}

async function _renderChatTemplate(templateSource, data) {
  const config = DC20RPG;
  let templateData = {
    ... data,
    config: config
  }
  return await renderTemplate(templateSource, templateData);
}