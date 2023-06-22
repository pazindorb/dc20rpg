// Registering listeners for chat log
export function addChatListeners(html) {
  // Show/Hide description
  html.find('.chat-title').click(() => {
    let value = html.showDescription;
    console.info(html);
    html.showDescription = !value;
  });
}