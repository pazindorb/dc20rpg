import { VariableAttributePickerDialog } from "../dialogs/variable-attribute-picker.mjs";
import { DC20RpgActor } from "../documents/actor.mjs";
import { capitalize } from "./utils.mjs";

const rollMessageTemplate = "systems/dc20rpg/templates/chat/roll-message.hbs";

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
  let roll = new Roll("2d10 + 2d20 + d6 + d4 + d8 + d12 + d5 + d7", actor.getRollData());
  let label = customLabel ? customLabel : `${actor.name} : Roll Result`;

  if (sendToChat) {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: _rollToChatHeader(actor.img, label),
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }
  
  return roll;
}

/**
 * Creates new Roll instance for item's rollFormula. Returns that roll.
 * Also creates new Roll instace for every other formula added to that item in "system.formulas".
 * Those rolls are not returned by that method but are shown in chat message.
 * 
 * @param {DC20RpgActor}actor       Actor which is a speaker for that roll
 * @param {DC20RpgItem} item        Item which rollData will be used for that roll
 * @param {boolean}     sendToChat  Determines if roll should be send to chat as a message
 * @returns {Roll}  Created roll
 */
export async function rollItem(actor, item, sendToChat) {
  const rollData = item.getRollData();

  let rolls = [];
  // Creating roll from core formula
  let coreRoll = null;
  const coreFromula = item.system.rollFormula.formula;
  if (coreFromula) {
    coreRoll = new Roll(coreFromula, rollData);
    coreRoll.coreFromula = true;
    coreRoll.label = capitalize(item.system.actionType) + " Roll";
    rolls.push(coreRoll);
  }
  // Creating rolls from other formulas
  const formulas = item.system.formulas;
  if (formulas) {
    let damageRolls = [];
    let healingRolls = [];
    let otherRolls = [];
    for (let formula of Object.values(formulas)) {
      let isVerstaile = formula.versatile;
      let rollFormula = isVerstaile ? formula.versatileFormula : formula.formula;
      let roll = new Roll(rollFormula, rollData);
      roll.coreFromula = false;
      roll.label = isVerstaile ? "(Versatile) " : "";
      
      switch (formula.category) {
        case "damage":
          roll.label += "Damage Roll - " + capitalize(formula.type);
          damageRolls.push(roll);
          break;
        case "healing":
          roll.label += "Healing Roll - " + capitalize(formula.type);
          healingRolls.push(roll);
          break;
        case "other":
          roll.label += "Other Roll";
          otherRolls.push(roll);
          break;
      }
    }
    rolls.push(...damageRolls, ...healingRolls, ...otherRolls);
  }

  // Evaulating all rolls
  if (rolls) rolls.forEach(roll => roll.evaluate({async: false}))

  // Rendering message content
  let description = item.system.statuses.identified ? item.system.description : "<b>Unidentified</b>";
  let templateData = {
    ...rollData, 
    rolls, 
    image: item.img,
    label: item.name,
    description: description
  }
  let renderedTemplate = await renderTemplate(rollMessageTemplate, templateData);

  // Creating ChatMessage with rolls
  const rollMode = game.settings.get('core', 'rollMode');
  const speaker = ChatMessage.getSpeaker({ actor: actor });
  let message = await ChatMessage.create({
    speaker: speaker,
    rollMode: rollMode,
    content: renderedTemplate,
    rolls: rolls,
    sound: CONFIG.sounds.dice,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL
  });
  templateData.message = message.id;

  return coreRoll;
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

function _rollToChatHeader(imageSrc, label) {
  return `
        <div>
        <img src="${imageSrc}" style="width: 50px; height: 50px; float:left; margin: 0 5px 5px 0"/> 
        <h1>${label}</h1>
        </div>
        `;
}