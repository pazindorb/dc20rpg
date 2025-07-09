import { getTokenForActor } from "./actors/tokens.mjs";
import { getValueFromPath } from "./utils.mjs";

/**
 * Returns ture if useCondition is fulfilled.
 * 
 * '&&' - AND
 * '||' - OR
 * 
 * Use Condition is built with:
 * - pathToValue - path to value that should be validated
 * - equal sign "="
 * - value - fulfilling condition value either a string or and array of strings
 * 
 * Examples of useConditions:
 * - system.weaponStyle=["axe","sword"];system.weaponType="melee" -> item must be both melee type and axe or sword style
 * - system.name="Endbreaker" -> item must have a name of "Endbreaker"
 * - system.weaponStyle=["axe","sword"];system.weaponType="melee"|system.weaponStyle=["bow"];system.weaponType="ranged" -> item must be either (both melee type and axe or sword style) OR (ranged type and bow)
 */
export function itemMeetsUseConditions(useCondition, item) {
  if (!useCondition) return false;
  if (useCondition === "true") return true;
  const OR = useCondition.split('||');
  for (const orConditions of OR) {
    const AND = orConditions.split('&&');
    if(_checkAND(AND, item)) return true;
  }
  return false;
}

function _checkAND(combinations, item) {
  for (const combination of combinations) {
    const pathValue = combination.trim().split('=')
    const value = getValueFromPath(item, pathValue[0]);
    if (value === undefined || value === "") return false;
    try {
      const conditionMet = eval(pathValue[1]).includes(value);
      if (!conditionMet) return false;
    } catch (e) {
      return false;
    }
  };
  return true;
}

export function registerDC20ConditionalHelpers() { 
  const helpers = {};

  helpers.whipHelper = (actorId, target) => {
    const actor = game.actors.get(actorId);
    const token = getTokenForActor(actor);
    if (token) return !target.token.isTokenInRange(token, 1);
    return false;
  }
  
  helpers.crossbowHelper = (actorId, target) => {
    const chatMessageId = target.flags.chatMessageId;
    if (!chatMessageId) return false;
    const currentAttack = game.messages.get(chatMessageId);
    if (!currentAttack) return false;

    const attackItemId = currentAttack.flags?.dc20rpg?.itemId;
    const attackTime = currentAttack.flags?.dc20rpg?.creationTime;
    if (!attackTime || !attackItemId) return false;

    const messages = game.messages
                      .filter(msg => msg.speaker.actor === actorId)
                      .filter(msg => {
                        const itemId = msg.flags?.dc20rpg?.itemId;
                        if (!itemId) return false;
                        return itemId === attackItemId;
                      })
                      .filter(msg => {
                        const creationTime = msg.flags?.dc20rpg?.creationTime;
                        if (!creationTime) return false;

                        if (creationTime.round > attackTime.round) return false;
                        if (creationTime.round === attackTime.round) return true;
                        if (creationTime.round + 1 < attackTime.round) return false;
                        if (creationTime.turn >= attackTime.turn) return true;
                        return false;
                      });
    
    
    const beforeCurrent = []
    for (const msg of messages) { 
      if (msg.id === currentAttack.id) break;
      beforeCurrent.push(msg);
    }
    if (beforeCurrent.length === 0) return false;

    const lastMathing = beforeCurrent.pop();
    const targets = Object.keys(lastMathing.system.targets);
    const found = targets.find(id => id === target.id);
    if (found) return true;
    return false;
  }

  helpers.spearHelper = (target) => {
    const chatMessageId = target.flags.chatMessageId;
    if (!chatMessageId) return false;
    const currentAttack = game.messages.get(chatMessageId);
    if (!currentAttack) return false;
    const movedRecently = currentAttack.flags?.dc20rpg?.movedRecently;
    if (!movedRecently) return false;

    const position = {
      x: target.token.x,
      y: target.token.y
    }
    const start = canvas.grid.measurePath([movedRecently.from, position]).distance;
    const end = canvas.grid.measurePath([movedRecently.to, position]).distance;
    const distance = canvas.grid.measurePath([movedRecently.from, movedRecently.to]).distance;
    return distance >= 2 && start > end;
  }

  CONFIG.DC20ConditionalHelpers = helpers;
}