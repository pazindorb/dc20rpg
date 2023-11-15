import { rollForTokens } from "../helpers/actors/tokens.mjs";
import { DC20RPG } from "../helpers/config.mjs";
import { datasetOf } from "../helpers/events.mjs";

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

  // Buttons 
  html.find('.rollable').click(event => rollForTokens(event, datasetOf(event).type));
}

function _addCoreFormulaSeparator(html) {
  html.find('.core-roll').last().after("<hr>");
}

//==============================================
//      Show Item Roll As Chat Message         =
//==============================================
export function rollItemToChat(evaulatedData, item, actor) {
  if (!evaulatedData.notTradeSkill) return; // Trade skills are rolled differently

  const preparedData = evaulatedData.data;
  const templateData = {
    ..._itemBasicData(item),
    ...preparedData
  }
  const templateSource = "systems/dc20rpg/templates/chat/item-chat-message.hbs";
  createChatMessage(actor, templateData, templateSource, preparedData.rolls);
}

function _itemBasicData(item, customLabel) {
  let description;
  if (!item.system.statuses) {
    description = item.system.description;
  } else {
    description = item.system.statuses.identified ? item.system.description : "<b>Unidentified</b>";
  }
  
  const label = customLabel ? customLabel : item.name;
  return {
    image: item.img,
    label: label,
    description: description
  }
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

export function createHPChangeChatMessage(actor, amount, type) {
  amount = Math.abs(amount);
  if (amount === 0) return;
  let content = "";

  switch (type) {
    case "damage":
      content = `<div style="font-size: 16px; color: #780000;">
                  <i class="fa fa-solid fa-droplet"></i>
                  <i>${actor.name}</i> took <b>${amount}</b> damage.
                </div>`;
      break;
    case "healing":
      content = `<div style="font-size: 16px; color: #007802;">
                  <i class="fa fa-solid fa-heart"></i>
                  <i>${actor.name}</i> got <b>${amount}</b> health.
                </div>`;
      break;
    case "temporary":
      content = `<div style="font-size: 16px; color: #707070;">
                  <i class="fa fa-solid fa-shield-halved"></i>
                  <i>${actor.name}</i> got <b>${amount}</b> temporary health.
                </div>`;
      break;
    default:
      content = `<div style="font-size: 16px;">
                  Unsuported HP change type.
                </div>`;
  }

  ChatMessage.create({
    content: content,
    whisper: ChatMessage.getWhisperRecipients("GM"),
});
}