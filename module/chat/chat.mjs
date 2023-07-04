import { rollForTokens } from "../helpers/rolls.mjs";

export function initChatMessage(html) {
  _addChatListeners(html);
  _addCoreFormulaSeparator(html);
}

// Registering listeners for chat log
function _addChatListeners(html) {

  // Show/Hide description
  html.find('.show-hide-description').click(event => {
    event.preventDefault();
    const description = event.target.closest(".chat-roll-card").querySelector(".chat-description");
    description.classList.toggle('hidden');
  });

  // Roll save for selected targets 
  html.find('.roll-save').click(event => rollForTokens(event, "save"));
  html.find('.roll-check').click(event => rollForTokens(event, "check"));
}

function _addCoreFormulaSeparator(html) {
  html.find('.core-roll').last().after("<hr>");
  html.find('.formula-roll').last().after("<hr>");
}