import { rollForTokens } from "./rolls.mjs";

// Registering listeners for chat log
export async function addChatListeners(html) {

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