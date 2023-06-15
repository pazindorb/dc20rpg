import { VariableAttributePickerDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RpgActor } from "../documents/actor.mjs";

/**
 * Creates new Roll instance from given formula for given actor.
 * Sends it to chat if needed. Returns created roll.
 * 
 * @param {string}      formula     Formula of that roll 
 * @param {DC20RpgActor}actor       Actor which rollData will be used for that roll
 * @param {boolean}     sendToChat  Determines roll should be send to chat as a message
 * @param {boolean}     customLabel If provided will set label of chat roll to value
 * @returns {Roll}  Created roll
 */
export function rollFromFormula(formula, actor, sendToChat, customLabel) {
  let roll = new Roll(formula, actor.getRollData());
  let label = customLabel ? customLabel : `${actor.name} : Roll Result`;

  if (sendToChat) {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: _rollResultChatMessageTemplate(actor.img, label),
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }
  
  return roll;
}

/**
 * Creates VariableAttributePickerDialog for given actor and with dataset extracted from event. 
 */
export function createVariableRollDialog(event, actor) {
  event.preventDefault();
  const dataset = event.currentTarget.dataset;
  
  let dialog = new VariableAttributePickerDialog(actor, dataset);
  dialog.render(true);
}

export function rollItem(formula, item, sendToChat) {

}

function _rollResultChatMessageTemplate(imageSrc, label) {
  return `
        <div>
        <img src="${imageSrc}" style="width: 50px; height: 50px; float:left; margin: 0 5px 5px 0"/> 
        <h1>${label}</h1>
        </div>
        `;
}